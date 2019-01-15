
const makeDebug = require('debug');
const concatIDAndHash = require('./helpers/concat-id-and-hash');
const ensureObjPropsValid = require('./helpers/ensure-obj-props-valid');
const getLongToken = require('./helpers/get-long-token');
const getShortToken = require('./helpers/get-short-token');
const getUserData = require('./helpers/get-user-data');
const hashPassword = require('./helpers/hash-password');
const notifier = require('./helpers/notifier');

const debug = makeDebug('authLocalMgnt:sendResetPwd');

module.exports = sendResetPwd;

async function sendResetPwd (options, identifyUser, notifierOptions) {
  debug('sendResetPwd');
  const usersService = options.app.service(options.service);
  const usersServiceIdName = usersService.id;
  const hashTheToken = !!options.encryptResetToken;

  ensureObjPropsValid(identifyUser, options.identifyUserProps);

  const users = await usersService.find({ ...options.params, query: identifyUser });
  const user1 = getUserData(users,  options.skipIsVerifiedCheck ? [] : ['isVerified']);

  const user2 = Object.assign(user1, {
    resetExpires: Date.now() + options.resetDelay,
    resetToken: concatIDAndHash(
      user1[usersServiceIdName],
      await getLongToken(options.longTokenLen)
    ),
    resetShortToken: await getShortToken(options.shortTokenLen, options.shortTokenDigits),
  });

  notifier(options.notifier, 'sendResetPwd', user2, notifierOptions)
  
  const user3 = await usersService.patch(user2[usersServiceIdName], {
    resetExpires: user2.resetExpires,
    resetToken: (hashTheToken) ? await hashPassword(options.app, user2.resetToken) : user2.resetToken,
    resetShortToken: (hashTheToken) ? await hashPassword(options.app, user2.resetShortToken) : user2.resetShortToken,
  },{ ...options.params});
  if(user1.org_id === 1){
    return options.sanitizeUserForClient({...user3,resetTokenBare:user2.resetToken});
  }else{
    return options.sanitizeUserForClient(user3);
  }
  
}
