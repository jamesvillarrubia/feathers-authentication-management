
const errors = require('@feathersjs/errors');
const makeDebug = require('debug');
const comparePasswords = require('./helpers/compare-passwords');
const ensureObjPropsValid = require('./helpers/ensure-obj-props-valid');
const getLongToken = require('./helpers/get-long-token');
const getShortToken = require('./helpers/get-short-token');
const getUserData = require('./helpers/get-user-data');
const notifier = require('./helpers/notifier');

const debug = makeDebug('authLocalMgnt:identityChange');

module.exports = identityChange;

async function identityChange (options, identifyUser, password, changesIdentifyUser, notifierOptions) {
  // note this call does not update the authenticated user info in hooks.params.user.
  debug('identityChange', password, changesIdentifyUser);
  const usersService = options.app.service(options.service);
  const usersServiceIdName = usersService.id;
  const query = options.query ||  {}
  const params = options.params || {}

  ensureObjPropsValid(identifyUser, options.identifyUserProps);
  // THIS IS TO BE REMOVED - CHANGES NEED NOT BE DEPENDENT ON IDENTITY TO BE SECURED
  // ensureObjPropsValid(changesIdentifyUser, options.identifyUserProps);

  let find_params = Object.assign({},options.params,{query:Object.assign(query, identifyUser)})

  const users = await usersService.find(find_params);
  const user1 = getUserData(users);

  try {
    await comparePasswords(password, user1.password, () => {});
  } catch (err) {
    throw new errors.BadRequest('Password is incorrect.',
      { errors: { password: 'Password is incorrect.', $className: 'badParams' } }
    );
  }
  
  const user2 = await usersService.patch(user1[usersServiceIdName], {
    verifyExpires: Date.now() + options.delay,
    verifyToken: await getLongToken(options.longTokenLen),
    verifyShortToken: await getShortToken(options.shortTokenLen, options.shortTokenDigits),
    verifyChanges: changesIdentifyUser
  },params);

  const user3 = await notifier(options.notifier, 'identityChange', user2, notifierOptions);
  return options.sanitizeUserForClient(user3);
}
