
const errors = require('@feathersjs/errors');
const isNullsy = require('./helpers/is-nullsy');
const makeDebug = require('debug');

const debug = makeDebug('authLocalMgnt:checkUnique');

module.exports = checkUnique;

// This module is usually called from the UI to check username, email, etc. are unique.
async function checkUnique (options, identifyUser, ownId, meta, notifierOptions){
  debug('checkUnique', identifyUser, ownId, meta);
  const usersService = options.app.service(options.service);
  const usersServiceIdName = usersService.id;
  const allProps = [];

  const keys = Object.keys(identifyUser).filter(
    key => !isNullsy(identifyUser[key])
  );

  try {
    for (let i = 0, ilen = keys.length; i < ilen; i++) {
      const prop = keys[i];
      const users = await usersService.find({...options.params, query: { [prop]: `${identifyUser[prop]}`.trim() } });
      console.log(users)
      console.log( { [prop]: `${identifyUser[prop]}`.trim() })
      const items = Array.isArray(users) ? users : users.data;
      const isNotUnique = items.length > 1 ||
        (items.length === 1 && items[0][usersServiceIdName] !== ownId);
      allProps.push(isNotUnique ? prop : null);
    }
  } catch (err) {
    throw new errors.BadRequest(meta.noErrMsg ? null : 'checkUnique unexpected error.',
      { errors: { msg: err.message, $className: 'unexpected' } }
    );
  }

  const errProps = allProps.filter(prop => prop);

  if (errProps.length) {
    const errs = {};
    errProps.forEach(prop => { errs[prop] = 'Already taken.'; });

    throw new errors.BadRequest(meta.noErrMsg ? null : 'Values already taken.',
      { errors: errs }
    );
  }

  return null;
}
