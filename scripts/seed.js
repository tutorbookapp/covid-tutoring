const path = require('path');

const algoliasearch = require('algoliasearch');
const axios = require('axios');
const dotenv = require('dotenv');
const firebaseAdminLib = require('firebase-admin');
const firebaseClient = require('firebase/app');
require('firebase/auth');
const logger = require('./lib/logger');

const admin = require('../cypress/fixtures/users/admin.json');
const match = require('../cypress/fixtures/match.json');
const meeting = require('../cypress/fixtures/meeting.json');
const org = require('../cypress/fixtures/orgs/default.json');
const school = require('../cypress/fixtures/orgs/school.json');
const student = require('../cypress/fixtures/users/student.json');
const volunteer = require('../cypress/fixtures/users/volunteer.json');

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

const credentials = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};
if (!firebaseClient.apps.length) firebaseClient.initializeApp(credentials);
const clientAuth = firebaseClient.auth();

const firebaseAdmin = firebaseAdminLib.initializeApp({
  credential: firebaseAdminLib.credential.cert({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    privateKey: (process.env.FIREBASE_ADMIN_KEY || '').replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
  }),
  serviceAccountId: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  databaseAuthVariableOverride: { uid: 'server' },
});
const adminAuth = firebaseAdmin.auth();

async function getHeaders(uid) {
  const token = await adminAuth.createCustomToken(uid);
  await clientAuth.signInWithCustomToken(token);
  const jwt = await clientAuth.currentUser.getIdToken(true);
  await clientAuth.signOut();
  return { authorization: `Bearer ${jwt || ''}` };
}

const algoliaId = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID;
const algoliaKey = process.env.ALGOLIA_ADMIN_KEY;
const search = algoliasearch(algoliaId, algoliaKey);

const prefix = process.env.ALGOLIA_PREFIX || env;
const usersIdx = search.initIndex(`${prefix}-users`);
const matchesIdx = search.initIndex(`${prefix}-matches`);
const meetingsIdx = search.initIndex(`${prefix}-meetings`);

function createIndices() {
  logger.info('Creating indices...');
  return Promise.all([
    usersIdx.setSettings({
      searchableAttributes: [
        'name',
        'unordered(email)',
        'unordered(phone)',
        'unordered(bio)',
        'unordered(reference)',
        'unordered(verifications.notes)',
        'unordered(tutoring.subjects)',
        'unordered(mentoring.subjects)',
        'unordered(socials.url)',
      ],
      attributesForFaceting: [
        'filterOnly(_availability)',
        'filterOnly(email)',
        'filterOnly(featured)',
        'filterOnly(langs)',
        'filterOnly(mentoring.searches)',
        'filterOnly(mentoring.subjects)',
        'filterOnly(tutoring.searches)',
        'filterOnly(tutoring.subjects)',
        'filterOnly(orgs)',
        'filterOnly(parents)',
        'filterOnly(phone)',
        'filterOnly(verifications.checks)',
      ],
    }),
    matchesIdx.setSettings({
      attributesForFaceting: [
        'filterOnly(org)',
        'filterOnly(people.id)',
        'filterOnly(subjects)',
      ],
    }),
    meetingsIdx.setSettings({
      attributesForFaceting: [
        'filterOnly(match.org)',
        'filterOnly(match.people.id)',
        'filterOnly(match.subjects)',
        'filterOnly(time.from)',
        'filterOnly(time.last)',
      ],
    }),
  ]);
}

async function clear() {
  logger.info('Clearing data...');
  const clearFirestoreEndpoint =
    `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/` +
    `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/databases/(default)/` +
    `documents`;
  await Promise.all([
    usersIdx.clearObjects(),
    matchesIdx.clearObjects(),
    meetingsIdx.clearObjects(),
    axios.delete(clearFirestoreEndpoint),
  ]);
}

async function seed(overrides = {}) {
  let matches = [];
  matches.push({ ...match, ...overrides.match });
  if (overrides.match === null) delete matches[0];
  matches = matches.filter(Boolean);

  let orgs = [];
  orgs.push({ ...org, ...overrides.org });
  orgs.push({ ...school, ...overrides.school });
  if (overrides.org === null) delete orgs[0];
  if (overrides.school === null) delete orgs[1];
  orgs = orgs.filter(Boolean);

  let users = [];
  users.push({ ...volunteer, ...overrides.volunteer });
  users.push({ ...student, ...overrides.student });
  users.push({ ...admin, ...overrides.admin });
  if (overrides.volunteer === null) delete users[0];
  if (overrides.student === null) delete users[1];
  if (overrides.admin === null) delete users[2];
  users = users.filter(Boolean);

  let meetings = [];
  meetings.push({ ...meeting, ...overrides.meeting });
  if (overrides.meeting === null) delete meetings[0];
  meetings = meetings.filter(Boolean);

  const rconfig = { headers: await getHeaders(admin.id) };

  async function create(route, data) {
    logger.info(`Creating ${data.length} ${route}...`);
    const endpoint = `http://localhost:3000/api/${route}`;
    await Promise.all(data.map((d) => axios.post(endpoint, d, rconfig)));
  }

  await create('orgs', orgs);

  // We have to create the admin first because TB's back-end will try to
  // fetch his data when sending user creation notification emails.
  await create(
    'users',
    users.filter((u) => u.id === 'admin')
  );
  await create(
    'users',
    users.filter((u) => u.id !== 'admin')
  );

  await create('matches', matches);

  await create('meetings', meetings);
}

async function main(overrides) {
  await clear();
  await createIndices();
  await seed(overrides);
}

if (require.main === module) main();
