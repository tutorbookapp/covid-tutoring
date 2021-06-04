// A massive file of all our old utility functions. Whenever I needed to get
// something done, I would just create a new function here and run the file.
// That process has made this file grow to unmanageable sizes and thus I'm going
// to be better organizing my utility scripts in the future.
//
// Hence, this file is deprecated but is being kept around in case I need to
// copy some of it's code into a more organized script.

const url = require('url');
const path = require('path');
const dotenv = require('dotenv');

const env = process.env.NODE_ENV || 'test';
console.log(`Loading ${env} environment variables...`);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });
dotenv.config({ path: path.resolve(__dirname, `../../.env.${env}`) });
dotenv.config({ path: path.resolve(__dirname, `../../.env.${env}.local`) });

console.log(
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

const { nanoid } = require('nanoid');
const axios = require('axios');
const updateSubjects = require('./update-subjects');
const prompt = require('prompt-sync')();
const progress = require('cli-progress');
const parse = require('csv-parse/lib/sync');
const equal = require('fast-deep-equal');
const { default: to } = require('await-to-js');
const fs = require('fs');
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
const auth = app.auth();

const algoliasearch = require('algoliasearch');
const algoliaId = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID;
const algoliaKey = process.env.ALGOLIA_ADMIN_KEY;
const client = algoliasearch(algoliaId, algoliaKey);

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

const getSubjects = (id) => {
  return parse(fs.readFileSync(`../algolia/${id}.csv`), {
    columns: true,
    skip_empty_lines: true,
  }).filter((subject) => !!subject.name);
};

const users = async () => {
  const mentoringSubjects = getSubjects('mentoring');
  const tutoringSubjects = getSubjects('tutoring');

  const updateLangs = (subjects) => {
    const langs = ['en'];
    for (const subject of subjects) {
      const langCode = SUBJECT_TO_LANG_DICT[subject.replace(' Language', '')];
      if (langCode) langs.push(langCode);
    }
    return langs;
  };

  const updateOrgs = (orgs) => {
    if (!orgs || !(orgs instanceof Array)) return ['default'];
    if (orgs.indexOf('default') < 0) return ['default', ...orgs];
    return orgs;
  };

  const users = (await db.collection('users').get()).docs;
  await Promise.all(
    users.map((user) => {
      const data = user.data();
      const subjects = updateSubjects(data.tutoring.subjects, tutoringSubjects);
      return user.ref.set({
        id: data.uid || user.id,
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        photo: data.photo || '',
        bio: data.bio || '',
        featured: data.featured || [],
        langs: updateLangs(subjects),
        availability: data.availability || [],
        parents: data.parents || [],
        socials: (data.socials || []).filter((s) => !!s.url),
        verifications: data.verifications || [],
        orgs: updateOrgs(data.orgs),
        mentoring: {
          subjects: updateSubjects(data.mentoring.subjects, mentoringSubjects),
          searches: updateSubjects(data.mentoring.searches, mentoringSubjects),
        },
        tutoring: {
          subjects: subjects,
          searches: updateSubjects(data.tutoring.searches, tutoringSubjects),
        },
        visible: false,
      });
    })
  );
};

const removeTemp = async (collectionId = 'users') => {
  const resources = (await db.collection(collectionId).get()).docs;
  await Promise.all(
    resources.map(async (resource) => {
      const original = resource.data();
      delete original.temp;
      await resource.ref.set(original);
    })
  );
};

const moveApptsToMatches = async () => {
  const appts = (await db.collection('appts').get()).docs;
  await Promise.all(
    appts.map(async (appt) => {
      const matchRef = db.collection('matches').doc(appt.id);
      const emails = (await appt.ref.collection('emails').get()).docs;
      await Promise.all(
        emails.map(async (email) => {
          await matchRef.collection('emails').doc(email.id).set(email.data());
          await email.ref.delete();
        })
      );
      await matchRef.set(appt.data());
      await appt.ref.delete();
    })
  );
};

const renameAttendeesToPeople = async () => {
  const matches = (await db.collection('matches').get()).docs;
  await Promise.all(
    matches.map(async (match) => {
      const original = match.data();
      const people = original.attendees;
      delete original.attendees;
      await match.ref.set({ ...original, people });
    })
  );
};

const removePAUSDFromDefault = async () => {
  const users = (await db.collection('users').get()).docs;
  await Promise.all(
    users.map(async (user) => {
      const data = user.data();
      const orgs = Array.from(data.orgs || []);
      const idx = orgs.indexOf('default');
      if (
        idx >= 0 &&
        (orgs.includes('woodside') ||
          orgs.includes('pioneer') ||
          orgs.includes('gunn') ||
          orgs.includes('paly') ||
          orgs.includes('jls'))
      )
        orgs.splice(idx, 1);
      if (equal(data.orgs, orgs)) return;
      await user.ref.update({ ...data, orgs });
    })
  );
};

const createToken = async () => {
  const token = await auth.createCustomToken('1j0tRKGtpjSX33gLsLnalxvd1Tl2');
  await firebase.auth().signInWithCustomToken(token);
  const idToken = await firebase.auth().currentUser.getIdToken(true);
  await firebase.auth().signOut();
  return idToken;
};

const addOrgIdsToUsers = async () => {
  console.log('Fetching orgs...');
  const orgs = (await db.collection('orgs').get()).docs.map((d) => d.id);
  console.log('Fetching users...');
  const users = (await db.collection('users').get()).docs;
  const options = [...orgs, 'delete'];
  const endpoint = 'https://tutorbook.org/api/users';
  const headers = { authorization: `Bearer ${await createToken()}` };
  await Promise.all(
    users.map(async (user) => {
      const data = user.data();
      if (data.orgs && data.orgs.length) return;
      let reply = '';
      while (!options.includes(reply)) {
        const question = `What to do with ${data.name} (${data.email})?`;
        reply = prompt(`${question} (${options.join(', ')}) `);
      }
      if (reply === 'delete') {
        console.log(`Deleting user (${user.id})...`);
        const [err] = await to(
          axios.delete(`${endpoint}/${user.id}`, { headers })
        );
        if (err) console.error(`${err.name} deleting user: ${err.message}`);
      } else {
        const availabilityJSON = (data.availability || []).map((timeslot) => ({
          to: timeslot.to.toDate().toJSON(),
          from: timeslot.from.toDate().toJSON(),
        }));
        const userJSON = {
          ...data,
          orgs: [reply],
          availability: availabilityJSON,
        };
        console.log(`Saving user (${user.id}) JSON...`, userJSON);
        const [err, res] = await to(
          axios.put(`${endpoint}/${user.id}`, userJSON, { headers })
        );
        if (err) console.error(`${err.name} updating user: ${err.message}`);
      }
    })
  );
};

const addOrgIdToMatches = async () => {
  console.log('Fetching orgs...');
  const orgs = (await db.collection('orgs').get()).docs.map((d) => d.id);
  console.log('Fetching matches...');
  const matches = (await db.collection('matches').get()).docs;
  const endpoint = 'https://tutorbook.org/api/matches';
  const headers = { authorization: `Bearer ${await createToken()}` };
  await Promise.all(
    matches.map(async (match) => {
      const data = match.data();
      if (data.org) return;
      let org = '';
      const question =
        `Org for match (${match.id}) \n With subjects ` +
        `(${data.subjects.join(', ')}) \n And people ` +
        `(${data.people.map((p) => p.name || p.id).join(', ')})?`;
      console.log(question);
      while (![...orgs, 'delete'].includes(org)) {
        org = prompt(`(${orgs.join(', ')}, delete) `);
      }
      if (org === 'delete') {
        const [err] = await to(
          axios.delete(`${endpoint}/${match.id}`, { headers })
        );
        if (err)
          console.error(
            `${err.name} deleting match (${match.id}): ${err.message}`
          );
      } else {
        const timesJSON = (data.times || []).map((timeslot) => ({
          to: timeslot.to.toDate().toJSON(),
          from: timeslot.from.toDate().toJSON(),
        }));
        const venueJSON = data.venue
          ? {
              ...data.venue,
              created: data.venue.created.toDate().toJSON(),
              updated: data.venue.updated.toDate().toJSON(),
            }
          : {
              type: 'jitsi',
              url: `https://meet.jit.si/TB-${nanoid(10)}`,
              created: new Date().toJSON(),
              updated: new Date().toJSON(),
            };
        const matchJSON = {
          org,
          status: data.status || 'new',
          subjects: data.subjects || [],
          people: data.people || [],
          creator: data.creator || (data.people || [])[0] || {},
          message: data.message || '',
          venue: venueJSON,
          times: timesJSON,
          id: match.id,
        };
        const [err] = await to(
          axios.put(`${endpoint}/${match.id}`, matchJSON, { headers })
        );
        if (err)
          console.error(
            `${err.name} updating match (${match.id}): ${err.message}`,
            matchJSON
          );
      }
    })
  );
};

const deleteUser = async (uid, heads) => {
  const endpoint = 'https://tutorbook.org/api/users';
  const headers = heads || { authorization: `Bearer ${await createToken()}` };
  const [err] = await to(axios.delete(`${endpoint}/${uid}`, { headers }));
  if (err) console.error(`${err.name} deleting user (${uid}): ${err.message}`);
};

const convertToUserJSON = (userData) => {
  const availability = (userData.availability || []).map((timeslot) => ({
    to: timeslot.to.toDate().toJSON(),
    from: timeslot.from.toDate().toJSON(),
  }));
  return { ...userData, availability };
};

const updateUser = async (user, heads) => {
  const endpoint = `https://tutorbook.org/api/users/${user.id}`;
  const headers = heads || { authorization: `Bearer ${await createToken()}` };
  const [err] = await to(axios.put(endpoint, user, { headers }));
  if (err) {
    console.error(`${err.name} updating user (${user.name}): ${err.message}`);
    debugger;
  }
};

const updateUserExistingData = async (user) => {
  const endpoint = `https://tutorbook.org/api/users/${user.id}`;
  const headers = { authorization: `Bearer ${await createToken()}` };
  const { data } = await axios.get(endpoint, { headers });
  console.log(`Merging ${user.name} (${user.id}) data...`, data);
  const updated = { ...data, ...user, updated: new Date().toJSON() };
  console.log(`Updating ${user.name} (${user.id}) data...`, updated);
  const [err] = await to(axios.put(endpoint, updated, { headers }));
  if (err) {
    console.error(`${err.name} updating user (${user.name}): ${err.message}`);
    debugger;
  }
};

const deleteMatch = async (matchId, heads) => {
  const endpoint = `https://tutorbook.org/api/matches/${matchId}`;
  const headers = heads || { authorization: `Bearer ${await createToken()}` };
  const [err] = await to(axios.delete(endpoint, { headers }));
  if (err) console.log('Error deleting match:', err);
};

const deleteOrg = async (orgId, heads) => {
  const endpoint = `https://tutorbook.org/api/orgs/${orgId}`;
  const headers = heads || { authorization: `Bearer ${await createToken()}` };
  const [err] = await to(axios.delete(endpoint, { headers }));
  if (err) console.log('Error deleting org:', err);
};

const purgeOrgUsers = async (orgId, headers, dry = false) => {
  const ogs = encodeURIComponent(JSON.stringify([orgId]));
  const endpoint = `https://tutorbook.org/api/users?orgs=${ogs}`;
  const { data } = await axios.get(endpoint, { headers });
  await Promise.all(
    data.users.map(async (user) => {
      if (user.orgs.length === 1) {
        console.log(`Deleting ${user.name} (${user.id})...`);
        if (!dry) await deleteUser(user.id, headers);
      } else if (user.orgs.length > 1) {
        if (user.orgs.indexOf(orgId) < 0) {
          console.error("[ERROR] User doesn't have org:", user);
          debugger;
        }
        user.orgs.splice(user.orgs.indexOf(orgId), 1);
        console.log(`Updating ${user.name} (${user.id})...`);
        user.created = user.created || new Date().toJSON();
        user.updated = new Date().toJSON();
        if (!dry) await updateUser(user, headers);
      } else {
        console.error("[ERROR] User doesn't have any orgs:", user);
        debugger;
      }
    })
  );
};

const purgeOrgMeetings = async (orgId, headers, dry = false) => {
  const endpoint = `https://tutorbook.org/api/meetings?org=${orgId}`;
  const { data } = await axios.get(endpoint, { headers });
  await Promise.all(
    data.meetings.map(async (meeting) => {
      console.log(`Deleting meeting (${meeting.id})...`);
      if (!dry) await deleteMeeting(meeting.id, headers);
    })
  );
};

const purgeOrgMatches = async (orgId, headers, dry = false) => {
  const endpoint = `https://tutorbook.org/api/matches?org=${orgId}`;
  const { data } = await axios.get(endpoint, { headers });
  await Promise.all(
    data.matches.map(async (match) => {
      console.log(`Deleting match (${match.id})...`);
      if (!dry) await deleteMatch(match.id, headers);
    })
  );
};

const purgeOrg = async (orgId, dry = false) => {
  const headers = { authorization: `Bearer ${await createToken()}` };
  await Promise.all([
    purgeOrgUsers(orgId, headers, dry),
    purgeOrgMatches(orgId, headers, dry),
    purgeOrgMeetings(orgId, headers, dry),
  ]);
  console.log(`Deleting org (${orgId})...`);
  if (!dry) await deleteOrg(orgId);
};

const createOrg = async (org) => {
  const endpoint = 'https://tutorbook.org/api/orgs';
  const headers = { authorization: `Bearer ${await createToken()}` };
  const [err] = await to(axios.post(endpoint, org, { headers }));
  if (err) console.log('Error creating org:', err);
};

const createUser = async (user) => {
  const endpoint = 'https://tutorbook.org/api/users';
  const [err] = await to(axios.post(endpoint, user));
  if (err) console.log('Error creating user:', err);
};

const updatePhotoCrops = async () => {
  const empty = {
    id: '',
    name: '',
    email: '',
    phone: '',
    photo: '',
    bio: '',
    socials: [],
    featured: [],
    orgs: ['default'],
    zooms: [],
    availability: [],
    mentoring: { subjects: [], searches: [] },
    tutoring: { subjects: [], searches: [] },
    langs: ['en'],
    parents: [],
    verifications: [],
    visible: false,
  };

  const convertToJSON = (date) => {
    switch (typeof date) {
      case 'string':
        return new Date(date).toJSON();
      case 'object':
        return date.toDate().toJSON();
      default:
        return new Date().toJSON();
    }
  };

  const resourcesFromFirestore = (resources = []) => {
    return resources.map((resource) => ({
      ...resource,
      created: convertToJSON(resource.created),
      updated: convertToJSON(resource.updated),
    }));
  };

  const availabilityFromFirestore = (availability = []) => {
    return availability.map((timeslot) => ({
      ...timeslot,
      from: convertToJSON(timeslot.from),
      to: convertToJSON(timeslot.to),
    }));
  };

  console.log('Fetching users...');
  const { docs } = await db.collection('users').get();

  console.log(`Parsing ${docs.length} docs...`);
  const users = docs.map((doc) => {
    const data = doc.data();
    return {
      ...empty,
      ...data,
      availability: availabilityFromFirestore(data.availability),
      langs: (data.langs || []).length ? data.langs : ['en'],
      verifications: resourcesFromFirestore(data.verifications),
      zooms: resourcesFromFirestore(data.zooms),
      id: doc.id,
    };
  });

  console.log(`Updating ${users.length} users...`);
  const headers = { authorization: `Bearer ${await createToken()}` };
  const bar = new progress.SingleBar({}, progress.Presets.shades_classic);
  const failed = [];
  let count = 0;
  bar.start(users.length, count);
  await Promise.all(
    users.map(async (user) => {
      const url = `https://tutorbook.org/api/users/${user.id}`;
      const [err] = await to(axios.put(url, user, { headers }));
      if (err) {
        console.error(
          `\n${err.name} updating user (${user.name} <${user.id}>): ${err.message}`
        );
        failed.push(user);
        fs.writeFileSync('./failed.json', JSON.stringify(failed, null, 2));
        debugger;
      }
      bar.update((count += 1));
    })
  );
  fs.writeFileSync('./failed.json', JSON.stringify(failed, null, 2));
};

const retryFailures = async () => {
  const users = require('./failed.json');

  console.log(`Updating ${users.length} users...`);
  const headers = { authorization: `Bearer ${await createToken()}` };
  const bar = new progress.SingleBar({}, progress.Presets.shades_classic);
  const failed = [];
  let count = 0;
  bar.start(users.length, count);
  await Promise.all(
    users.map(async (user) => {
      const url = `https://tutorbook.org/api/users/${user.id}`;
      const [err] = await to(axios.put(url, user, { headers }));
      if (err) {
        console.error(
          `\n${err.name} updating user (${user.name} <${user.id}>): ${err.message}`
        );
        failed.push(user);
        fs.writeFileSync('./failed.json', JSON.stringify(failed, null, 2));
        debugger;
      }
      bar.update((count += 1));
    })
  );
  fs.writeFileSync('./failed.json', JSON.stringify(failed, null, 2));
};

const changeDateJSONToDates = async () => {
  const empty = {
    status: 'new',
    org: 'default',
    subjects: [],
    people: [],
    creator: {
      id: '',
      name: '',
      photo: '',
      roles: [],
    },
    message: '',
    id: '',
  };

  console.log('Fetching matches...');
  const { docs } = await db.collection('matches').get();

  console.log(`Normalizing ${docs.length} matches...`);
  const matches = docs.map((doc) => {
    const data = doc.data();
    const venueId = nanoid(10);
    const venue = {
      id: venueId,
      url: `https://meet.jit.si/TB-${venueId}`,
      invite: `Open https://meet.jit.si/TB-${venueId} to join your meeting.`,
      type: 'jitsi',
      created: new Date().toJSON(),
      updated: new Date().toJSON(),
    };
    return {
      ...empty,
      ...data,
      venue,
      id: doc.id,
    };
  });
  debugger;

  console.log(`Updating ${matches.length} matches...`);
  const headers = { authorization: `Bearer ${await createToken()}` };
  const bar = new progress.SingleBar({}, progress.Presets.shades_classic);
  const failed = [];
  let count = 0;
  bar.start(matches.length, count);
  await Promise.all(
    matches.map(async (match) => {
      const url = `https://tutorbook.org/api/matches/${match.id}`;
      const [err] = await to(axios.put(url, match, { headers }));
      if (err) {
        console.error(
          `\n${err.name} updating match (${match.id}): ${
            err.response.data || err.message
          }`
        );
        failed.push(match);
        fs.writeFileSync('./failed.json', JSON.stringify(failed, null, 2));
      }
      bar.update((count += 1));
    })
  );
  fs.writeFileSync('./failed.json', JSON.stringify(failed, null, 2));
};

const fetchUsersWithoutPics = async () => {
  const users = await db
    .collection('users')
    .where('orgs', 'array-contains', 'quarantunes')
    .get();
  const withoutPics = users.docs
    .filter((user) => !user.data().photo)
    .map((user) => `${user.data().name} <${user.data().email}> (${user.id})`);
  fs.writeFileSync('./without-pic.json', JSON.stringify(withoutPics, null, 2));
  debugger;
};

const moveBannerImages = async () => {
  const orgs = await db.collection('orgs').get();
  await Promise.all(
    orgs.docs.map(async (doc) => {
      const background = ((doc.data().home || {}).en || {}).photo || '';
      await doc.ref.update({ background });
    })
  );
};

const fetchUsersWithoutOrgs = async () => {
  console.log('Fetching users...');
  const users = await db.collection('users').get();
  console.log(`Filtering ${users.length} users...`);
  const withoutOrgs = users.docs.filter((d) => !(d.data().orgs || []).length);
  debugger;
};

const fetchQuarantunesEmails = async () => {
  console.log('Fetching users...');
  const users = await db
    .collection('users')
    .where('orgs', 'array-contains', 'quarantunes')
    .get();
  console.log(`Combining ${users.docs.length} email addresses...`);
  const emails = users.docs
    .map((u) => `${u.data().name} <${u.data().email}>`)
    .join(', ');
  console.log(emails);
  debugger;
};

const stringify = require('csv-stringify/lib/sync');
const fetchQuarantunesStringTeachers = async () => {
  const { docs: stringTeachers } = await db
    .collection('users')
    .where('mentoring.subjects', 'array-contains-any', [
      'Violin',
      'Viola',
      'Cello',
    ])
    .get();
  const data = stringify(
    stringTeachers
      .filter((u) => u.data().orgs.includes('quarantunes'))
      .map((u) => ({
        name: u.data().name,
        phone: u.data().phone,
        email: u.data().email,
        bio: u.data().bio,
        url: `https://tutorbook.org/quarantunes/users/${u.id}`,
      })),
    { columns: ['name', 'phone', 'email', 'bio', 'url'] }
  );
  fs.writeFileSync('string-teachers.csv', data);
};

const addResourceTimestamps = async (col) => {
  console.log(`Fetching ${col}...`);
  const { docs } = await db.collection(col).get();
  console.log(`Adding resource timestamps to ${docs.length} ${col}...`);
  await Promise.all(
    docs.map(async (d) => {
      const created = d.createTime || d.data().updated || new Date();
      const updated = d.updateTime || d.data().created || new Date();
      await d.ref.update({ created, updated });
    })
  );
};

const meetingDocToSearchObj = (doc) => {
  const data = doc.data();
  return {
    objectID: doc.id || data.id,
    created: doc.createTime.toMillis(),
    updated: doc.updateTime.toMillis(),
    status: data.status || 'created',
    creator: data.creator,
    notes: data.notes || '',
    time: {
      id: data.time.id || '',
      from: data.time.from.toMillis(),
      to: data.time.to.toMillis(),
      last: data.time.last
        ? data.time.last.toMillis()
        : data.time.to.toMillis(),
    },
    venue: {
      ...data.venue,
      created: data.venue.created.toMillis(),
      updated: data.venue.updated.toMillis(),
    },
    match: {
      ...data.match,
      created: data.match.created.toMillis(),
      updated: data.match.updated.toMillis(),
      objectID: data.match.id,
      id: undefined,
    },
  };
};

const addMeetingLast = async () => {
  console.log('Fetching meetings...');

  const idx = client.initIndex(`${env}-meetings`);
  const { docs } = await db.collection('meetings').get();

  console.log(`Updating ${docs.length} meetings...`);

  await idx.saveObjects(docs.map(meetingDocToSearchObj));

  console.log(`Updated ${docs.length} meetings.`);
};

const triggerUpdate = async (col = 'users', filters = {}, throttle = false) => {
  console.log(`Fetching ${col}...`);
  const fetchPathname = `https://tutorbook.org/api/${col}`;
  const updatePathname = `https://develop.tutorbook.org/api/${col}`;
  const endpoint = url.format({
    pathname: fetchPathname,
    query: { ...filters, hitsPerPage: 1000 },
  });
  const bar = new progress.SingleBar({}, progress.Presets.shades_classic);
  const headers = { authorization: `Bearer ${await createToken()}` };
  console.log('Fetching...', endpoint);
  const { data } = await axios.get(endpoint, { headers });
  if (data.hits > 1000) console.warn(`More hits (${data.hits}) than 1000.`);
  debugger;
  console.log(`Updating ${data.hits} ${col}...`);
  let count = 0;
  bar.start(data[col].length, count);
  if (throttle) {
    for (const res of data[col]) {
      const [err] = await to(
        axios.put(`${updatePathname}/${res.id}`, res, { headers })
      );
      bar.update((count += 1));
      if (err) {
        console.error(
          `${err.name} updating (${res.id}): ${
            err.response ? err.response.data.message : err.message
          }`,
          res
        );
        debugger;
      }
    }
  } else {
    await Promise.all(
      data[col].map(async (res) => {
        const [err] = await to(
          axios.put(`${updatePathname}/${res.id}`, res, { headers })
        );
        bar.update((count += 1));
        if (err) {
          console.error(
            `${err.name} updating (${res.id}): ${
              err.response ? err.response.data.message : err.message
            }`,
            res
          );
          debugger;
        }
      })
    );
  }
  bar.stop();
  console.log(`\nUpdated ${data.hits} ${col}.`);
};

// Deletes all users that come from the old app:
// - Anyone w/out a bio.
const purgeGunnData = async () => {
  const hitsPerPage = 1000;
  const endpoint = url.format({
    pathname: 'https://tutorbook.org/api/users',
    query: {
      hitsPerPage,
      orgs: encodeURIComponent(JSON.stringify([{ value: 'gunn', label: '' }])),
    },
  });
  console.log('Querying endpoint:', endpoint);
  const headers = { authorization: `Bearer ${await createToken()}` };
  const {
    data: { users, hits },
  } = await axios.get(endpoint, { headers });
  if (hits > hitsPerPage)
    console.warn(
      `You'll need to run this a second time because there are more than ${hitsPerPage} (${hits}) users.`
    );
  let errored = 0;
  let deleted = 0;
  let saved = 0;
  await Promise.all(
    users.map(async (user) => {
      if (!user.bio) {
        console.log(`Deleting ${user.name} (${user.id})...`);
        const url = `https://tutorbook.org/api/users/${user.id}`;
        const [err] = await to(axios.delete(url, { headers }));
        if (err) {
          console.error(
            `${err.name} deleting ${user.name} (${user.id}): ${err.message}`
          );
          errored++;
          debugger;
        }
        deleted++;
      } else {
        console.log(
          `Saving ${user.name} (${user.id})...`,
          `https://tutorbook.org/gunn/users/${user.id}`
        );
        saved++;
      }
    })
  );
  console.log(`Deleted ${deleted} profiles.`);
  console.log(`Errored ${errored} profiles.`);
  console.log(`Saved ${saved} profiles.`);
};

async function addOrgBookingConfigs() {
  const booking = {
    en: {
      message:
        'Ex: {{person}} could really use your help with a {{subject}} project.',
    },
  };
  const { docs } = await db.collection('orgs').get();
  console.log(`Adding booking configs to ${docs.length} orgs...`);
  await Promise.all(docs.map((d) => d.ref.update({ booking })));
}
