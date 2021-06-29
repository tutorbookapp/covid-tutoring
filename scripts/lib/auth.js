// Some basic WIP wrappers around the Supabase GoTrue Admin API endpoints.
// @see {@link https://github.com/supabase/gotrue-js/issues/90}
// @see {@link https://github.com/supabase/gotrue}

const path = require('path');
const dotenv = require('dotenv');
const logger = require('./logger');

const env = process.env.NODE_ENV || 'production';
logger.info(`Loading ${env} environment variables...`);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });
dotenv.config({ path: path.resolve(__dirname, `../../.env.${env}`) });
dotenv.config({ path: path.resolve(__dirname, `../../.env.${env}.local`) });

const axios = require('axios');
const { default: to } = require('await-to-js');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

const headers = {
  apiKey: process.env.SUPABASE_KEY,
  authorization: `Bearer ${process.env.SUPABASE_KEY}`
};
const uid = '8ea430b6-f5f4-4c94-b1d5-578499c6b407';
const data = {
  data: { key: 'value', number: 10, admin: false },
  email: 'bob@example.com',
  password: 'password',
};

function handle(err, res, action) {
  if (err && err.response) {
    logger.error(`${err.name} ${action}: ${err.response.data.message}`);
    debugger;
  } else if (err) {
    logger.error(`${err.name} ${action}: ${err.message}`);
    debugger;
  } else {
    logger.debug(`Received: ${JSON.stringify(res.data, null, 2)}`);
    return res;
  }
}

async function createUser(data) {
  const endpoint = `${url}/auth/v1/admin/users`;
  logger.debug(`POST ${endpoint} ${JSON.stringify(data, null, 2)}`);
  const [err, res] = await to(axios.post(endpoint, data, { headers }));
  return handle(err, res, 'creating user');
}

async function getUser(id) {
  const endpoint = `${url}/auth/v1/admin/users/${id}`;
  logger.debug(`GET ${endpoint}`);
  const [err, res] = await to(axios.get(endpoint, { headers }));
  return handle(err, res, 'getting user');
}

async function updateUser(data) {
  const endpoint = `${url}/auth/v1/admin/users/${data.id}`;
  logger.debug(`PUT ${endpoint} ${JSON.stringify(data, null, 2)}`);
  const [err, res] = await to(axios.put(endpoint, data, { headers }));
  return handle(err, res, 'updating user');
}

module.exports = { createUser, getUser, updateUser };
