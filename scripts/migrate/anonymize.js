/**
 * @todo
 * Actually implement this script.
 *
 * @description
 * This script anonymizes the data backed up from the `default` database
 * partition for use in the `test` database partition (during development). As
 * specified in our [Privacy Policy]{@link https://tutorbook.org/legal#privacy},
 * we **always** anonymize data for development purposes.
 *
 * @usage
 * First, change `INPUT` and `OUTPUT` to the filenames of your `default`
 * database backup and the desired `test` database backup location respectively.
 * Then, just run (to generate your anonymized data for your `test` partition):
 *
 * ```
 * $ node anonymize.js
 * ```
 */

const INPUT = './default.json';
const OUTPUT = './test.json';
const BLACKLIST = ['uid'];

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const app = admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_ADMIN_KEY.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
  }),
  projectId: process.env.FIREBASE_PROJECT_ID,
  serviceAccountId: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  databaseURL: process.env.FIREBASE_DATABASE_URL,
});
const db = app.firestore();
const auth = app.auth();

/**
 * Replaces actual email addresses with `@example.com` email addresses.
 *
 * @example
 * const user = { email: 'nicholas@gmail.com' };
 * assert(replaceEmails([user]) === [{ email: 'nicholas@example.com' }]);
 *
 * @param {User[]} users - An array of user objects (with real email addresses).
 * @return {User[]} The `users` but with `@example.com` email addresses.
 */
const replaceEmails = (users) =>
  users.map((user) => ({
    ...user,
    email: `${user.email.split('@')[0]}@example.com`,
  }));

/**
 * Iterates through an array of users and replaces each user's properties with
 * the values from another random user (in the same array) **if** those
 * properties aren't blacklisted for anonymization (e.g. `uid`s).
 * @param {User[]} users - An array of user objects.
 * @param {string[]} blacklist - An array of properties that should not be
 * anonymized (e.g. `uid`s).
 * @return {User[]} The randomized user objects.
 */
const anonymizeUsers = (users, blacklist = BLACKLIST) =>
  users.map((user, idx) => {
    return Object.fromEntries(
      Object.entries(user).map(([key, val]) => {
        if (blacklist.indexOf(key) >= 0) return [key, val];
        let rand = idx;
        while (rand === idx) rand = Math.floor(Math.random() * users.length);
        return [key, users[rand][key]];
      })
    );
  });

/**
 * Randomizes/anonymizes a given database partition (represented as JSON).
 * @param {Map} database - The JSON backup form of the Firestore db partition.
 * @return (Map) The anonymized JSON database backup.
 */
const anonymize = (database) => {
  const data = Object.values(database['__collections__'].users);
  const users = replaceEmails(data);
  return {
    __collections__: {
      ...database['__collections__'],
      users: Object.fromEntries(users.map((u) => [u.id || u.uid, u])),
    },
  };
};

/**
 * Returns a given database with a `lim` maximum number of documents in  every
 * collection (and subcollection).
 * @param {Map} database - The JSON backup form of the Firestore db partition.
 * @param {int} [lim=10] - The maximum number of documents that are left under
 * each collection.
 * @return {Map} The limited JSON database backup.
 */
const limit = (database, lim = 10) => {
  const limited = {};
  Object.entries(database).forEach(([collection, documents]) => {
    limited[collection] = {};
    const docs = Object.entries(documents);
    for (var count = 0; count < docs.length && count < lim; count++) {
      docs[count][1]['__collections__'] = limit(
        docs[count][1]['__collections__'],
        lim
      );
      limited[collection][docs[count][0]] = docs[count][1];
    }
  });
  return limited;
};

/**
 * Reads in an `input` JSON database backup file, ensures that each collection
 * only contains a maximum of 10 documents (removes documents over the `limit`),
 * and writes the output back into the JSON backup file or into a specified
 * `output` file.
 * @param {string} input - The filename of the input JSON database backup file.
 * @param {string} [output=input] - The filename of the output JSON database
 * backup file (defaults to the input file).
 * @param {int} [lim=10] - The maximum number of documents that are left under
 * each collection.
 */
const limitJSON = (input, output = input, lim = 10) => {
  if (!fs.existsSync(input)) throw new Error('Input file must exist.');
  const original = JSON.parse(fs.readFileSync(input))['__collections__'];
  const limited = limit(original, lim);
  fs.writeFileSync(
    output,
    JSON.stringify(
      {
        __collections__: limited,
      },
      null,
      2
    )
  );
};

/**
 * Limits the JSON to 100 users and anonymizes those users.
 * @param {string} input - The input file location (of a Firestore database
 * backup starting from a partition: `npx firestore-export`).
 * @param {string} [output=input] - The output file location (defaults to
 * replacing the input file).
 */
const main = (input, output = input) => {
  limitJSON(input, output, 100);
  const original = JSON.parse(fs.readFileSync(input));
  const anonymized = anonymize(original);
  fs.writeFileSync(output, JSON.stringify(anonymized, null, 2));
};

main(INPUT, OUTPUT);
