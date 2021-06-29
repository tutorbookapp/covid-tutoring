// Script that creates the analytics documents for org activity by:
// 1. Fetching all org users, meetings, and matches.
// 2. Updating the tags on all of those resources.
// 3. Iterating over those resources, trying to add to existing analytics doc
//    (within 24 hours of resource create timestamp). If we can't, create a new
//    analytics doc and insert it into the growing timeline.
// 4. Uploading the created timeline to Firestore.

const fs = require('fs');
const url = require('url');
const path = require('path');
const dotenv = require('dotenv');
const logger = require('../lib/logger');

const env = process.env.NODE_ENV || 'production';
logger.info(`Loading ${env} environment variables...`);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });
dotenv.config({ path: path.resolve(__dirname, `../../.env.${env}`) });
dotenv.config({ path: path.resolve(__dirname, `../../.env.${env}.local`) });

logger.info(
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

const axios = require('axios');
const clone = require('rfdc')();
const progress = require('cli-progress');
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

const firebase = require('firebase/app');
require('firebase/auth');

const clientCredentials = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};
if (!firebase.apps.length) firebase.initializeApp(clientCredentials);

const client = require('algoliasearch')(
  process.env.NEXT_PUBLIC_ALGOLIA_APP_ID,
  process.env.ALGOLIA_ADMIN_KEY
);
const usersIdx = client.initIndex(`${env}-users`);
const matchesIdx = client.initIndex(`${env}-matches`);
const meetingsIdx = client.initIndex(`${env}-meetings`);

async function downloadData(orgId) {
  logger.info(`Downloading (${orgId}) data...`);
  const [users, matches, meetings] = (
    await Promise.all([
      db.collection('users').where('orgs', 'array-contains', orgId).get(),
      db.collection('matches').where('org', '==', orgId).get(),
      db.collection('meetings').where('match.org', '==', orgId).get(),
    ])
  ).map((s) =>
    s.docs.map((d) => ({
      ...d.data(),
      created: d.createTime ? d.createTime.toDate() : new Date(),
      updated: d.updateTime ? d.updateTime.toDate() : new Date(),
    }))
  );

  logger.info('Saving as JSON...');
  fs.writeFileSync(`./${orgId}-users.json`, JSON.stringify(users));
  fs.writeFileSync(`./${orgId}-matches.json`, JSON.stringify(matches));
  fs.writeFileSync(`./${orgId}-meetings.json`, JSON.stringify(meetings));
}

async function uploadTimeline(orgId, timeline) {
  logger.info(`Creating ${timeline.length} database records...`);
  await Promise.all(
    timeline.map(async (nums) => {
      const ref = db
        .collection('orgs')
        .doc(orgId)
        .collection('analytics')
        .doc();
      nums.created = nums.updated = new Date();
      nums.id = ref.id;
      await ref.set(nums);
    })
  );
}

async function updateResourceTags(orgId, dryRun = false) {
  logger.info(`Fetching (${orgId}) cache...`);
  const usersData = require(`./${orgId}-users.json`);
  const matchesData = require(`./${orgId}-matches.json`);
  const meetingsData = require(`./${orgId}-meetings.json`);

  logger.info('Updating tags...');
  const [users, matches, meetings] = tag(usersData, matchesData, meetingsData);

  logger.info(
    `Updating ${users.length} users, ${matches.length} matches, and ${meetings.length} meetings...`
  );
  const bar = new progress.SingleBar({}, progress.Presets.shades_classic);
  let count = 0;
  bar.start(users.length + matches.length + meetings.length, count);

  async function updateDoc(collectionId, docId, hitTags) {
    const tags = hitTags.filter((t) => !t.startsWith('not-'));
    await db.collection(collectionId).doc(docId).update({ tags });
    bar.update((count += 1));
  }

  function resourceToObj(resource) {
    return { objectID: resource.id, _tags: resource.tags };
  }

  if (dryRun) return;

  await Promise.all([
    ...users.map((u) => updateDoc('users', u.id, u.tags)),
    usersIdx.partialUpdateObjects(users.map(resourceToObj)),
    ...matches.map((m) => updateDoc('matches', m.id, m.tags)),
    matchesIdx.partialUpdateObjects(matches.map(resourceToObj)),
    ...meetings.map((m) => updateDoc('meetings', m.id, m.tags)),
    meetingsIdx.partialUpdateObjects(meetings.map(resourceToObj)),
  ]);

  bar.stop();
  logger.info('\nUpdate resource tags.');
}

function tag(usersData, matchesData, meetingsData) {
  const users = usersData
    .map((data) => {
      const user = { tags: [], ...data };
      const created = new Date(data.created || new Date());
      const updated = new Date(data.updated || new Date());
      const tags = [];
      if (user.mentoring.subjects.length || user.tags.includes('mentor'))
        tags.push('mentor');
      if (user.mentoring.searches.length || user.tags.includes('mentee'))
        tags.push('mentee');
      if (user.tutoring.subjects.length || user.tags.includes('tutor'))
        tags.push('tutor');
      if (user.tutoring.searches.length || user.tags.includes('tutee'))
        tags.push('tutee');
      if (user.verifications.length) tags.push('vetted');
      return { ...user, created, updated, tags };
    })
    .sort((a, b) => a.created - b.created);
  const matches = matchesData
    .map((data) => {
      // TODO: Once I implement the tag updating API logic, add it here as well.
      const match = data;
      const created = new Date(data.created || new Date());
      const updated = new Date(data.updated || new Date());
      match.people.forEach(({ id: personId }) => {
        const person = users.find((p) => p.id === personId);
        if (!person) return;
        if (!person.tags.includes('matched')) person.tags.push('matched');
      });
      return { ...match, created, updated, tags: [] };
    })
    .sort((a, b) => a.created - b.created);
  const meetings = meetingsData
    .map((data) => {
      // TODO: Once I implement the tag updating API logic, add it here as well.
      const meeting = data;
      const created = new Date(data.created || new Date());
      const updated = new Date(data.updated || new Date());
      const tags = [];
      if (meeting.time.recur) tags.push('recurring');
      meeting.match.people.forEach(({ id: personId }) => {
        const person = users.find((p) => p.id === personId);
        if (!person) return;
        if (!person.tags.includes('meeting')) person.tags.push('meeting');
      });
      return { ...meeting, created, updated, tags };
    })
    .sort((a, b) => a.created - b.created);

  function addNotTags(resource, nots) {
    const tags = [
      ...resource.tags,
      ...nots.filter((t) => !resource.tags.includes(t.replace('not-', ''))),
    ];
    return { ...resource, tags };
  }

  return [
    users.map((u) =>
      addNotTags(u, [
        'not-mentor',
        'not-mentee',
        'not-tutor',
        'not-tutee',
        'not-vetted',
        'not-matched',
        'not-meeting',
      ])
    ),
    matches.map((m) => addNotTags(m, ['not-meeting'])),
    meetings.map((m) => addNotTags(m, ['not-recurring'])),
  ];
}

function generateTimeline(orgId) {
  logger.info(`Fetching (${orgId}) cache...`);
  const usersData = require(`./${orgId}-users.json`);
  const matchesData = require(`./${orgId}-matches.json`);
  const meetingsData = require(`./${orgId}-meetings.json`);

  logger.info('Updating tags...');
  const [users, matches, meetings] = tag(usersData, matchesData, meetingsData);

  logger.info('Creating timeline...');
  const now = new Date();
  const current = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const firstUser = users[0].created.valueOf();
  const firstMatch = matches[0].created.valueOf();
  const firstMeeting = meetings[0].created.valueOf();
  const first = new Date(Math.min(firstUser, firstMatch, firstMeeting));
  const start = new Date(
    first.getFullYear(),
    first.getMonth(),
    first.getDate() - 1
  );
  const timeline = [];
  const empty = {
    mentor: { total: 0, vetted: 0, matched: 0, meeting: 0 },
    mentee: { total: 0, vetted: 0, matched: 0, meeting: 0 },
    tutor: { total: 0, vetted: 0, matched: 0, meeting: 0 },
    tutee: { total: 0, vetted: 0, matched: 0, meeting: 0 },
    match: { total: 0, meeting: 0 },
    meeting: { total: 0, recurring: 0 },
  };

  let date = start;
  while (date <= current) {
    timeline.push(clone({ date, ...empty }));
    date = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
  }

  function isRole(role) {
    if (typeof role !== 'string') return false;
    return ['tutor', 'tutee', 'mentor', 'mentee'].includes(role);
  }

  function updateTags(key, nums, tags) {
    nums[key].total += 1;
    tags.forEach((tag) => {
      if (!isRole(tag) && !tag.startsWith('not-')) nums[key][tag] += 1;
    });
  }

  function prevDate(date, other) {
    const prev = new Date(
      other.getFullYear(),
      other.getMonth(),
      other.getDate() - 1
    );
    return (
      date.getFullYear() === prev.getFullYear() &&
      date.getMonth() === prev.getMonth() &&
      date.getDate() === prev.getDate()
    );
  }

  function sameDate(date, other) {
    return (
      date.getFullYear() === other.getFullYear() &&
      date.getMonth() === other.getMonth() &&
      date.getDate() === other.getDate()
    );
  }

  logger.info(`Adding ${users.length} users to timeline...`);
  users.forEach((user) => {
    const current = timeline.find((n) => sameDate(n.date, user.created));
    const currentIdx = timeline.indexOf(current);
    timeline.slice(currentIdx).forEach((nums) => {
      user.tags.forEach((role) => {
        if (isRole(role)) updateTags(role, nums, user.tags);
      });
    });
  });

  logger.info(`Adding ${matches.length} matches to timeline...`);
  matches.forEach((match) => {
    const current = timeline.find((n) => sameDate(n.date, match.created));
    const currentIdx = timeline.indexOf(current);
    timeline.slice(currentIdx).forEach((nums) => {
      updateTags('match', nums, match.tags);
    });
  });

  logger.info(`Adding ${meetings.length} meetings to timeline...`);
  meetings.forEach((meeting) => {
    const current = timeline.find((n) => sameDate(n.date, meeting.created));
    const currentIdx = timeline.indexOf(current);
    timeline.slice(currentIdx).forEach((nums) => {
      updateTags('meeting', nums, meeting.tags);
    });
  });

  logger.info('Writing timeline to JSON...');
  fs.writeFileSync('./timeline.json', JSON.stringify(timeline, null, 2));

  return timeline;
}

async function main(orgId) {
  await downloadData(orgId);
  await Promise.all([
    uploadTimeline(orgId, generateTimeline(orgId)),
    updateResourceTags(orgId),
  ]);
}

async function inspectData(orgId, tags) {
  logger.info(`Fetching (${orgId}) cache...`);
  const usersData = require(`./${orgId}-users.json`);
  const matchesData = require(`./${orgId}-matches.json`);
  const meetingsData = require(`./${orgId}-meetings.json`);

  logger.info('Updating tags...');
  const [users, matches, meetings] = tag(usersData, matchesData, meetingsData);

  async function getToken(uid = '1j0tRKGtpjSX33gLsLnalxvd1Tl2') {
    const token = await app.auth().createCustomToken(uid);
    await firebase.auth().signInWithCustomToken(token);
    const idToken = await firebase.auth().currentUser.getIdToken(true);
    await firebase.auth().signOut();
    return idToken;
  }

  logger.info(`Downloading (${orgId}) data (${tags.join(', ')})...`);
  const headers = { authorization: `Bearer ${await getToken()}` };
  const endpoint = url.format({
    pathname: 'https://develop.tutorbook.org/api/users',
    query: {
      hitsPerPage: 1000,
      orgs: JSON.stringify([orgId]),
      tags: JSON.stringify(tags),
    },
  });
  logger.info(`Endpoint: ${endpoint}`);
  const { data } = await axios.get(endpoint, { headers });

  debugger;
}

if (require.main === module) main();
