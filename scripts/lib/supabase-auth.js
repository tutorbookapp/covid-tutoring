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
const url = 'https://yixbyyrnwuksbrzlhjvn.supabase.co';

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

async function createUser(user) {
  const endpoint = `${url}/auth/v1/admin/users`;
  console.log(`POST ${endpoint}`, data);
  const [err, res] = await to(axios.post(endpoint, data, { headers }));
  console.log((err ? err.response : res).data);
  debugger;
}

async function getUser() {
  const endpoint = `${url}/auth/v1/admin/users/${uid}`;
  const [err, res] = await to(axios.get(endpoint, { headers }));
  console.log((err ? err.response : res).data);
  debugger;
}

async function updateUser() {
  const endpoint = `${url}/auth/v1/admin/users/${uid}`;
  data.password = 'updated-password';
  data.data.key = 'updated-value';
  const [err, res] = await to(axios.put(endpoint, data, { headers }));
  console.log((err ? err.response : res).data);
  debugger;
}

module.exports = { createUser, getUser, updateUser };
