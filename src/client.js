
// Wrapper for client interface to feathers-authenticate-management

function AuthManagement (app) { // eslint-disable-line no-unused-vars
  if (!(this instanceof AuthManagement)) {
    return new AuthManagement(app);
  }

  const authManagement = app.service('authManagement');

  this.checkUnique = async (identifyUser, ownId, ifErrMsg, notifierOptions) => await authManagement.create({
    action: 'checkUnique',
    value: identifyUser,
    ownId,
    meta: { noErrMsg: ifErrMsg },
    options: notifierOptions
  }, {});

  this.resendVerifySignup = async (identifyUser, notifierOptions) => await authManagement.create({
    action: 'resendVerifySignup',
    value: identifyUser,
    notifierOptions,
    options: notifierOptions
  }, {});

  this.verifySignupLong = async (verifyToken, notifierOptions) => await authManagement.create({
    action: 'verifySignupLong',
    value: verifyToken,
    options: notifierOptions
  }, {});

  this.verifySignupShort = async (verifyShortToken, identifyUser, notifierOptions) => await authManagement.create({
    action: 'verifySignupShort',
    value: { user: identifyUser, token: verifyShortToken },
    options: notifierOptions
  }, {});

  this.sendResetPwd = async (identifyUser, notifierOptions) => await authManagement.create({
    action: 'sendResetPwd',
    value: identifyUser,
    options: notifierOptions
  }, {});

  this.resetPwdLong = async (resetToken, password, notifierOptions) => await authManagement.create({
    action: 'resetPwdLong',
    value: { token: resetToken, password },
    options: notifierOptions
  }, {});

  this.resetPwdShort = async (resetShortToken, identifyUser, password, notifierOptions) => await authManagement.create({
    action: 'resetPwdShort',
    value: { user: identifyUser, token: resetShortToken, password },
    options: notifierOptions
  }, {});

  this.passwordChange = async (oldPassword, password, identifyUser, notifierOptions) => await authManagement.create({
    action: 'passwordChange',
    value: { user: identifyUser, oldPassword, password },
    options: notifierOptions
  }, {});

  this.identityChange = async (password, changesIdentifyUser, identifyUser, notifierOptions) => await authManagement.create({
    action: 'identityChange',
    value: { user: identifyUser, password, changes: changesIdentifyUser },
    options: notifierOptions
  }, {});

  this.authenticate = async (email, password, cb, notifierOptions) => {
    let cbCalled = false;

    return app.authenticate({ type: 'local', email, password })
      .then(result => {
        const user = result.data;

        if (!user || !user.isVerified) {
          app.logout();
          return cb(new Error(user ? 'User\'s email is not verified.' : 'No user returned.'));
        }

        if (cb) {
          cbCalled = true;
          return cb(null, user);
        }

        return user;
      })
      .catch((err) => {
        if (!cbCalled) {
          cb(err);
        }
      });
  };
}

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = AuthManagement;
}
