
const errors = require('@feathersjs/errors');
const makeDebug = require('debug');
const comparePasswords = require('./helpers/compare-passwords');
const deconstructId = require('./helpers/deconstruct-id');
const ensureObjPropsValid = require('./helpers/ensure-obj-props-valid');
const ensureValuesAreStrings = require('./helpers/ensure-values-are-strings');
const getUserData = require('./helpers/get-user-data');
const hashPassword = require('./helpers/hash-password');
const notifier = require('./helpers/notifier');

const debug = makeDebug('authLocalMgnt:resetPassword');

module.exports = {
  resetPwdWithLongToken,
  resetPwdWithShortToken,
};

async function resetPwdWithLongToken(options, resetToken, password) {
  ensureValuesAreStrings(resetToken, password);

  return await resetPassword(options, { resetToken }, { resetToken }, password);
}

async function resetPwdWithShortToken(options, resetShortToken, identifyUser, password) {
  ensureValuesAreStrings(resetShortToken, password);
  ensureObjPropsValid(identifyUser, options.identifyUserProps);

  return await resetPassword(options, identifyUser, { resetShortToken }, password);
}

async function resetPassword (options, query, tokens, password) {
  debug('resetPassword', query, tokens, password);
  const usersService = options.app.service(options.service);
  const usersServiceIdName = usersService.id;
  const promises = [];
  let users;

  if (tokens.resetToken) {
    let id = deconstructId(tokens.resetToken);
    console.log('id',id)
    users = await usersService.get(id);
    console.log('users long - ',users)
  } else if (tokens.resetShortToken) {
    users = await usersService.find({ query });
    console.log('users short - ',query, users)
  } else {
    throw new errors.BadRequest('resetToken and resetShortToken are missing. (authLocalMgnt)',
      { errors: { $className: 'missingToken' } }
    );
  }

  const checkProps = options.skipIsVerifiedCheck ?
    ['resetNotExpired'] : ['resetNotExpired', 'isVerified'];
  const user1 = getUserData(users, checkProps);

  Object.keys(tokens).forEach((key) => {
    promises.push(comparePasswords(tokens[key], user1[key], () =>
      new errors.BadRequest('Reset Token is incorrect. (authLocalMgnt)',
        { errors: { $className: 'incorrectToken' } })
    ));
  });

  try {
    await Promise.all(promises);
  } catch (err) {
    await usersService.patch(user1[usersServiceIdName], {
      resetToken: null,
      resetShortToken: null,
      resetExpires: null
    });

    new errors.BadRequest('Invalid token. Get for a new one. (authLocalMgnt)',
      { errors: { $className: 'invalidToken' } }
    );
  }

  const user2 = await usersService.patch(user1[usersServiceIdName], {
    password: await hashPassword(options.app, password),
    resetToken: null,
    resetShortToken: null,
    resetExpires: null
  });

  const user3 = await notifier(options.notifier, 'resetPwd', user2);
  return options.sanitizeUserForClient(user3);
}
