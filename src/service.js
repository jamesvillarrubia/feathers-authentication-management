
const errors = require('@feathersjs/errors');
const makeDebug = require('debug');

const debug = makeDebug('authLocalMgnt:service');

const checkUnique = require('./check-unique');
const identityChange = require('./identity-change');
const passwordChange = require('./password-change');
const resendVerifySignup = require('./resend-verify-signup');
const sanitizeUserForClient = require('./helpers/sanitize-user-for-client');
const sendResetPwd = require('./send-reset-pwd');
const { resetPwdWithLongToken, resetPwdWithShortToken } = require('./reset-password');
const { verifySignupWithLongToken, verifySignupWithShortToken } = require('./verify-signup');

const optionsDefault = {
  app: null, // value set during configuration
  service: '/users', // need exactly this for test suite
  path: 'authanagement',
  notifier: async () => {},
  longTokenLen: 15, // token's length will be twice this
  shortTokenLen: 6,
  shortTokenDigits: true,
  resetDelay: 1000 * 60 * 60 * 2, // 2 hours
  delay: 1000 * 60 * 60 * 24 * 5, // 5 days
  identifyUserProps: ['email'],
  sanitizeUserForClient,
  params: {}, // extra params to be sent along with the request
  hashTheToken: true //whether or not to store the reset token hashed or plaintext like the verification token
};

module.exports = authenticationLocalManagement;

function authenticationLocalManagement(options1 = {}) {
  debug('service being configured.');
  return function () {
    const options = Object.assign({}, optionsDefault, options1, { app: this });
    options.app.use(options.path, authLocalMgntMethods(options));
  };
}

function authLocalMgntMethods(options) {
  return {
    async create (data) {
      debug(`create called. action=${data.action}`);
      switch (data.action) {
        case 'checkUnique':
          try {
            return await checkUnique(options, data.value, data.ownId || null, data.meta || {}, data.options);
          } catch (err) {
            return Promise.reject(err); // support both async and Promise interfaces
          }
        case 'resendVerifySignup':
          try {
            return await resendVerifySignup(options, data.value, data.options);
          } catch (err) {
            return Promise.reject(err);
          }
        case 'verifySignupLong':
          try {
            return await verifySignupWithLongToken(options, data.value, data.options);
          } catch (err) {
            return Promise.reject(err);
          }
        case 'verifySignupShort':
          try {
            return await verifySignupWithShortToken(options, data.value.token, data.value.user, data.options);
          } catch (err) {
            return Promise.reject(err);
          }
        case 'sendResetPwd':
          try {
            return await sendResetPwd(options, data.value, data.options);
          } catch (err) {
            return Promise.reject(err);
          }
        case 'resetPwdLong':
          try {
            return await resetPwdWithLongToken(options, data.value.token, data.value.password, data.options);
          } catch (err) {
            return Promise.reject(err);
          }
        case 'resetPwdShort':
          try {
            return await resetPwdWithShortToken(options, data.value.token, data.value.user, data.value.password, data.options);
          } catch (err) {
            return Promise.reject(err);
          }
        case 'passwordChange':
          try {
            return await passwordChange(options, data.value.user, data.value.oldPassword, data.value.password, data.options);
          } catch (err) {
            return Promise.reject(err);
          }
        case 'identityChange':
          try {
            return await identityChange(options, data.value.user, data.value.password, data.value.changes, data.options);
          } catch (err) {
            return Promise.reject(err);
          }
        case 'options':
          return options;
        default:
          throw new errors.BadRequest(`Action '${data.action}' is invalid.`,
            { errors: { $className: 'badParams' } }
          );
      }
    }
  }
}
