const path = require('path');

const algoliasearch = require('algoliasearch');
const dotenv = require('dotenv');
const logger = require('./lib/logger');

// Follow the Next.js convention for loading `.env` files.
// @see {@link https://nextjs.org/docs/basic-features/environment-variables}
const env = process.env.NODE_ENV || 'development';
[
  path.resolve(__dirname, `../.env.${env}.local`),
  path.resolve(__dirname, '../.env.local'),
  path.resolve(__dirname, `../.env.${env}`),
  path.resolve(__dirname, '../.env'),
].forEach((dotfile) => {
  logger.info(`Loaded env from ${dotfile}`);
  dotenv.config({ path: dotfile });
});

const algoliaId = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID;
const algoliaKey = process.env.ALGOLIA_ADMIN_KEY;
const search = algoliasearch(algoliaId, algoliaKey);

const prefix = process.env.ALGOLIA_PREFIX || env;
const usersIdx = search.initIndex(`${prefix}-users`);
const matchesIdx = search.initIndex(`${prefix}-matches`);
const meetingsIdx = search.initIndex(`${prefix}-meetings`);

function deleteIndices() {
  logger.info('Deleting indices...');
  return Promise.all([
    usersIdx.delete(),
    matchesIdx.delete(),
    meetingsIdx.delete(),
  ]);
}

async function main() {
  await deleteIndices();
}

if (require.main === module) main();
