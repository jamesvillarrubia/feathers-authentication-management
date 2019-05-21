
const errors = require('@feathersjs/errors');
const makeDebug = require('debug');
const comparePasswords = require('./helpers/compare-passwords');
const ensureObjPropsValid = require('./helpers/ensure-obj-props-valid');
const ensureValuesAreStrings = require('./helpers/ensure-values-are-strings');
const getUserData = require('./helpers/get-user-data');
const hashPassword = require('./helpers/hash-password');
const notifier = require('./helpers/notifier');

const debug = makeDebug('authLocalMgnt:sendOrganizations');

module.exports = sendOrganizations;

async function sendOrganizations (options, identifyUser, notifierOptions) {
  console.log(identifyUser)
  const usersService = options.app.service(options.service);
  const usersServiceIdName = usersService.id;

//   ensureValuesAreStrings(oldPassword, password);
//   ensureObjPropsValid(identifyUser, options.identifyUserProps);

  const data = await usersService.find({ ...options.params, query: identifyUser });
  const users = Array.isArray(data) ? data : (data.data && data.total && data.limit ? data.data : [ data ]);
  const org_ids = users.map(u=>{
    if(u.isVerified){
      return u.org_id
    }
  }).filter(u=>!!u)



  const keysService = options.app.service('v1/keys');
  const key_data = await keysService.find({ findingKey:true, query: {
      org_id:{
        $in: org_ids
      },
      type:"client_secret",
    },
    $sort:[['createdAt','DESC']]
  });
  let keyObject = {}
  const keys = Array.isArray(key_data) ? key_data : (key_data.data && key_data.total && key_data.limit ? key_data.data : [ key_data ]);
  keys.forEach(k => {
      if(!keyObject[k.org_id]){
          keyObject[k.org_id]=k.key
      }
  });

  const orgsService = options.app.service('v1/organizations');
  const org_data = await orgsService.find({ findingKey:true, query: {
      id:{
        $in: org_ids
      }
    }
  });
  let orgObject = {}
  const orgs = Array.isArray(org_data) ? org_data : (org_data.data && org_data.total && org_data.limit ? org_data.data : [ org_data ]);
  let returnable = orgs.map(o => {
    console.log(o)
    if(o.id && keyObject[o.id]){
        return {key:keyObject[o.id], name:o.name}
    }
  }).filter(f=>!!f)

//   console.log(returnable)
  await notifier(options.notifier, 'sendOrganizations', returnable, notifierOptions);
  return {}

}
