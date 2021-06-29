// Removes the default availability (9am-5pm weekdays) from QuaranTunes' users.

const path = require('path');
const dotenv = require('dotenv');

const winston = require('winston');
const logger = winston.createLogger({
  level: 'verbose',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console({ format: winston.format.simple() }),
  ],
});

const env = process.env.NODE_ENV || 'test';
logger.info(`Loading ${env} environment variables...`);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });
dotenv.config({ path: path.resolve(__dirname, `../../.env.${env}`) });
dotenv.config({ path: path.resolve(__dirname, `../../.env.${env}.local`) });

logger.verbose(
  'Using Firebase configuration:',
  JSON.stringify(
    {
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      serviceAccountId: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    },
    null,
    2
  )
);

const admin = require('firebase-admin');
const app = admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_ADMIN_KEY.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
  }),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  serviceAccountId: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
});
const db = app.firestore();

const algoliasearch = require('algoliasearch');
const client = algoliasearch(
  process.env.NEXT_PUBLIC_ALGOLIA_APP_ID,
  process.env.ALGOLIA_ADMIN_KEY
);
const usersIdx = client.initIndex(`${env}-users`);

// Removes the default 9am-5pm PDT availability from all users.
// Note: Make sure to add the `availability` as an attribute for faceting.
async function removeDefaultAvailability() {
  const availability = [
    {
      from: new Date('1970-01-05T17:00:00.000Z'),
      to: new Date('1970-01-06T01:00:00.000Z'),
    },
    {
      from: new Date('1970-01-06T17:00:00.000Z'),
      to: new Date('1970-01-07T01:00:00.000Z'),
    },
    {
      from: new Date('1969-12-31T17:00:00.000Z'),
      to: new Date('1970-01-01T01:00:00.000Z'),
    },
    {
      from: new Date('1970-01-01T17:00:00.000Z'),
      to: new Date('1970-01-02T01:00:00.000Z'),
    },
    {
      from: new Date('1970-01-02T17:00:00.000Z'),
      to: new Date('1970-01-03T01:00:00.000Z'),
    },
  ];
  const filters = availability
    .map(
      (t) =>
        `availability.from:${t.from.valueOf()} AND availability.to:${t.to.valueOf()}`
    )
    .join(' AND ');
  logger.verbose(`Filters: ${filters}`);
  logger.info('Fetching users...');
  const userIds = [];
  await usersIdx.browseObjects({
    filters: `${filters} AND orgs:quarantunes`,
    batch(objs) {
      logger.verbose(`Fetched batch of ${objs.length} users.`);
      objs.forEach((obj) => userIds.push(obj.objectID));
    },
  });
  debugger;
  logger.info(`Removing availability from ${userIds.length} user objs...`);
  await usersIdx.partialUpdateObjects(
    userIds.map((userId) => ({
      objectID: userId,
      availability: [],
      _availability: [],
    }))
  );
  logger.info(`Removing availability from ${userIds.length} user docs...`);
  await Promise.all(
    userIds.map((userId) =>
      db.collection('users').doc(userId).update({ availability: [] })
    )
  );
  logger.info(`Removed availability from ${userIds.length} users.`);
}

if (require.main === module) removeDefaultAvailability();
