const fs = require('fs');
const path = require('path');
const axios = require('axios');
const phone = require('phone');
const dotenv = require('dotenv');
const parse = require('csv-parse');
const winston = require('winston');
const prompt = require('prompt-sync')();
const progress = require('cli-progress');
const algoliasearch = require('algoliasearch');
const parseSync = require('csv-parse/lib/sync');
const { default: to } = require('await-to-js');
const { exec } = require('child_process');
const { nanoid } = require('nanoid');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console({ format: winston.format.simple() }),
  ],
});

const env = 'production';
const apiDomain = 'https://develop.tutorbook.org';
logger.info(`Loading ${env} environment variables...`);
[
  path.resolve(__dirname, '../../.env'),
  path.resolve(__dirname, '../../.env.local'),
  path.resolve(__dirname, `../../.env.${env}`),
  path.resolve(__dirname, `../../.env.${env}.local`),
].forEach((path) => {
  logger.debug(`Loading .env file (${path})...`);
  dotenv.config({ path });
});

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

const algoliaId = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID || '';
const algoliaKey = process.env.ALGOLIA_ADMIN_KEY || '';
const client = algoliasearch(algoliaId, algoliaKey);
const searchIdx = client.initIndex(`${env}-users`);

const fields = {
  location: 'Location',
  teamMember: 'Team Member',
  service: 'Service Type',
  date: 'Date', // Formatted as '24 Jan 2021, 9:00 AM' (w/out end time).
  bookingNotes: 'Booking Notes',
  status: 'Status', // Either 'Confirmed' or 'New'
  customerName: 'Customer Name',
  email: 'Email',
  phone: 'Phone',
  experience:
    'Experience Level (never played, beginner, intermediate, advanced)',
  phoneNumber: 'Phone Number',
  studentName: 'Student Name',
  reference: 'How did you hear about Quarantunes?',
  city: 'What city/state are you located in?',
  age: 'Student Age',
};

const emptyUser = {
  created: new Date().toJSON(),
  updated: new Date().toJSON(),
  id: '',
  name: '',
  photo: '',
  email: '',
  phone: '',
  bio: '',
  background: '',
  socials: [],
  orgs: [],
  zooms: [],
  availability: [],
  mentoring: { subjects: [], searches: [] },
  tutoring: { subjects: [], searches: [] },
  langs: ['en'],
  parents: [],
  verifications: [],
  visible: false,
  featured: [],
  roles: [],
  reference: '',
};

const usersCachePath = './team-member-to-user.json';
const usersCache = require(usersCachePath);
async function getUser({ name, email, phone }) {
  if (usersCache[name]) {
    logger.silly(`Found ${name} in users cache.`);
    return usersCache[name];
  }
  const searchString = (name || '').split(' (')[0];
  const searchOptions = { restrictSearchableAttributes: ['name'] };
  if (email === '-') {
    logger.debug('Skipping invalid email filter...');
  } else if (email && phone) {
    searchOptions.filters = `email:"${email}"`;
    searchOptions.optionalFilters = `phone:"${phone}"`;
  } else if (email) {
    searchOptions.filters = `email:"${email}"`;
  } else if (phone) {
    searchOptions.filters = `phone:"${phone}"`;
  }
  const searchOptionsStr = JSON.stringify(searchOptions, null, 2);
  logger.debug(`Searching (${searchString}): ${searchOptionsStr}`);
  const { hits } = await searchIdx.search(searchString, searchOptions);
  if (!hits.length)
    throw new Error(`No results (${searchString}): ${searchOptionsStr}`);
  const user = { ...(hits[0] || {}), id: (hits[0] || {}).objectID || '' };
  usersCache[name] = user;
  fs.writeFileSync(usersCachePath, JSON.stringify(usersCache, null, 2));
  return user;
}

async function getOrCreateUser({ name, email, phone, ...rest }) {
  try {
    const user = await getUser({ name, email, phone });
    return user;
  } catch (e) {
    logger.warn(`${e.name} fetching ${name} (${email || phone}): ${e.message}`);
    const user = {
      ...emptyUser,
      name: name || '',
      email: email || '',
      phone: phone || '',
      created: new Date().toJSON(),
      updated: new Date().toJSON(),
      ...rest,
    };
    logger.debug(`Creating user: ${JSON.stringify(user, null, 2)}`);
    const [err, res] = await to(axios.post(`${apiDomain}/api/users`, user));
    if (err) {
      logger.error(
        `${err.name} creating ${user.name}: ${
          err.response ? err.response.data.message : err.message
        }`
      );
      debugger;
      return user;
    } else {
      logger.verbose(`Created ${res.data.name} (${res.data.id}).`);
      usersCache[name] = res.data;
      fs.writeFileSync(usersCachePath, JSON.stringify(usersCache, null, 2));
      return res.data;
    }
  }
}

const validSubjects = parseSync(fs.readFileSync('../algolia/mentoring.csv'), {
  skip_empty_lines: true,
  columns: true,
});
const validSubjectNames = validSubjects.map((s) => s.name);
function isValidSubject(subjectName) {
  return validSubjectNames.includes(subjectName);
}

const subjectsCachePath = './services-to-subjects.json';
const subjectsCache = require(subjectsCachePath);
function getSubject(service) {
  if (isValidSubject(service)) return service;
  if (isValidSubject(service.replace(' Lesson', '')))
    return service.replace(' Lesson', '');
  while (!subjectsCache[service]) {
    let validSubject = false;
    let subject = '';
    while (!validSubject) {
      subject = prompt(`What subject is "${service}"? `);
      validSubject = isValidSubject(subject);
    }
    subjectsCache[service] = subject;
    fs.writeFileSync(subjectsCachePath, JSON.stringify(subjectsCache, null, 2));
  }
  return subjectsCache[service];
}

function generateStudentBio(row, subject) {
  let bio = `I'm a student who originally signed up on Picktime.`;
  if (row[fields.experience])
    bio += `\nExperience with ${subject}: ${row[fields.experience]}`;
  if (row[fields.city]) bio += `\nCurrently located in: ${row[fields.city]}`;
  if (row[fields.age]) bio += `\nAge: ${row[fields.age]}`;
  return bio;
}

function generateMatchMessage(row) {
  return row[fields.bookingNotes] || '';
}

function generateMeetingDescription(row) {
  return row[fields.bookingNotes] || '';
}

/**
 * Given a Picktime formatted date string, returns the meeting timeslot.
 * @param {string} dateStr - The Picktime formatted date string (e.g. '24 Jan 2021, 9:00 AM').
 * @param {number} duration - The meeting duration in mins (default to 60mins).
 * @return {Timeslot} - The timeslot in JSON-friendly format.
 * @todo Ensure that the date string time zone matches the system time zone.
 */
function getMeetingTime(dateStr, duration = 60) {
  const [date, mo, yr, time, ampm] = dateStr.replace(',', '').split(' ');
  const monthIdx = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ].indexOf(mo);
  const [hrsStr, minsStr] = time.split(':');
  const hrs = Number(hrsStr) + (ampm === 'PM' ? 12 : 0);
  const mins = Number(minsStr);
  const start = new Date(yr, monthIdx, date, hrs, mins);
  const end = new Date(start.valueOf() + duration * 60 * 1000);
  return {
    id: nanoid(),
    from: start.toJSON(),
    to: end.toJSON(),
    last: end.toJSON(),
  };
}

async function getToken(uid = '1j0tRKGtpjSX33gLsLnalxvd1Tl2') {
  const token = await app.auth().createCustomToken(uid);
  await firebase.auth().signInWithCustomToken(token);
  const idToken = await firebase.auth().currentUser.getIdToken(true);
  await firebase.auth().signOut();
  return idToken;
}

function matchToString(match) {
  const people = match.people.map((p) => p.name).join(' and ');
  return `match for ${match.subjects.join(', ')} with ${people}`;
}

function meetingToString(meeting) {
  const time = new Date(meeting.time.from).toString();
  const subjects = meeting.match.subjects.join(', ');
  const people = meeting.match.people.map((p) => p.name).join(' and ');
  return `meeting at ${time} for ${subjects} with ${people}`;
}

const matchesPath = './matches-created.json';
const matches = require(matchesPath);
const meetingsPath = './meetings-created.json';
const meetings = require(meetingsPath);
const rowsPath = './rows-created.txt';
const rows = fs.readFileSync(rowsPath).toString().split('\n');

async function importPicktime(path, dryRun = false) {
  const errorTotal = [];
  const matchesTotal = [];
  const meetingsTotal = [];
  const recurringTotal = [];

  let count = (postCount = putCount = 0);
  const bar = new progress.SingleBar({}, progress.Presets.shades_classic);
  const total = await new Promise((resolve, reject) =>
    exec(`wc -l < ${path}`, (err, res) => {
      if (err) return reject(err);
      resolve(Number(res) - 1); // Ignore the header line.
    })
  );

  logger.info(`Processing ${total} rows...`);
  bar.start(total, count);

  const headers = { authorization: `Bearer ${await getToken()}` };
  const parser = fs.createReadStream(path).pipe(
    parse({
      skip_empty_lines: true,
      columns: true,
    })
  );

  function req(method, endpoint, data) {
    if (method === 'post') postCount += 1;
    if (method === 'put') putCount += 1;
    if (dryRun) {
      logger.silly(`Skipping ${method.toUpperCase()} ${endpoint}...`);
      return [null, { data }];
    }
    return to(axios[method](`${apiDomain}${endpoint}`, data, { headers }));
  }

  function error(err, action) {
    const { message } = err.response ? err.response.data : err;
    logger.error(`${err.name} ${action}: ${message}`);
    errorTotal.push(err);
    debugger;
  }

  for await (const row of parser) {
    logger.silly(`Processing row ${row['S.No']}...`);

    delete row['S.No'];
    const rowId = encodeURIComponent(JSON.stringify(Object.values(row)));
    if (rows.includes(rowId)) {
      bar.update((count += 1));
      continue;
    }

    const subject = getSubject(row[fields.service]);
    logger.silly(`Fetched subjects (${row[fields.service]}): ${subject}`);

    const student = await getOrCreateUser({
      name: row[fields.customerName] || row[fields.studentName] || '',
      email: row[fields.email] || '',
      phone: phone(row[fields.phone] || row[fields.phoneNumber])[0] || '',
      bio: generateStudentBio(row, subject),
      orgs: ['quarantunes'],
      mentoring: { subjects: [], searches: [subject] },
      reference: row[fields.reference] || '',
    });
    logger.silly(`Fetched student: ${student.name} (${student.id}).`);

    const mentor = await getUser({ name: row[fields.teamMember] });
    logger.silly(`Fetched mentor: ${mentor.name} (${mentor.id}).`);

    // If there is already a match w/ this data, we reuse it. Otherwise, we
    // create and cache a new match.
    const matchId = encodeURIComponent(
      JSON.stringify([
        subject,
        generateMatchMessage(row),
        student.id,
        student.name,
        student.photo,
        mentor.id,
        mentor.name,
        mentor.photo,
      ])
    );
    if (!matches[matchId]) {
      const match = {
        org: 'quarantunes',
        subjects: [subject],
        people: [
          {
            id: student.id || '',
            name: student.name || '',
            photo: student.photo || '',
            roles: ['mentee'],
          },
          {
            id: mentor.id || '',
            name: mentor.name || '',
            photo: mentor.photo || '',
            roles: ['mentor'],
          },
        ],
        creator: {
          id: student.id || '',
          name: student.name || '',
          photo: student.photo || '',
          roles: ['mentee'],
        },
        message: generateMatchMessage(row),
        updated: new Date().toJSON(),
        created: new Date().toJSON(),
        id: '',
      };
      logger.debug(`Creating ${matchToString(match)}...`);
      logger.silly(`Creating match: ${JSON.stringify(match, null, 2)}`);
      const [err, res] = await req('post', '/api/matches', match);
      if (err) {
        error(err, `creating ${matchToString(match)}`);
      } else {
        logger.verbose(`Created ${matchToString(res.data)} (${res.data.id}).`);
        matches[matchId] = res.data;
        fs.writeFileSync(matchesPath, JSON.stringify(matches, null, 2));
        matchesTotal.push(res.data);
      }
    }

    const venueId = nanoid(10);
    const meeting = {
      match: matches[matchId],
      status: 'created',
      creator: {
        id: student.id || '',
        name: student.name || '',
        photo: student.photo || '',
        roles: ['mentee'],
      },
      venue: {
        id: venueId,
        url: `https://meet.jit.si/TB-${venueId}`,
        updated: new Date().toJSON(),
        created: new Date().toJSON(),
      },
      time: getMeetingTime(row[fields.date]),
      description: generateMeetingDescription(row),
      updated: new Date().toJSON(),
      created: new Date().toJSON(),
      id: '',
    };

    // If there are any existing meetings for this match that are exactly one
    // week away from this meeting (i.e. same weekday, same time), we assume
    // that they are the same weekly recurring meeting. Same for every time
    // interval supported by Tutorbook (daily, weekly, biweekly, and monthly).
    const existingMeetings = meetings[matchId] || [];
    const end = new Date(meeting.time.to);

    // Picktime's UI forces users to pick a # of occurrences with the maximum #
    // being 100 (which is what most users will pick). That's why `COUNT=100`.
    const rrules = {
      daily: 'RRULE:FREQ=DAILY;COUNT=100',
      weekly: 'RRULE:FREQ=WEEKLY;COUNT=100',
      biweekly: 'RRULE:FREQ=WEEKLY;INTERVAL=2;COUNT=100',
      monthly: 'RRULE:FREQ=MONTHLY;COUNT=100',
    };

    function logCheck(dist, mtg) {
      const endStr = end.toLocaleString();
      const lastStr = new Date(mtg.time.last).toLocaleString();
      logger.silly(`Checking if ${endStr} is ${dist} from ${lastStr}...`);
    }

    const recurChecks = {
      daily(mtg) {
        logCheck('a day', mtg);
        return end - new Date(mtg.time.last) === 24 * 60 * 60 * 1000;
      },
      weekly(mtg) {
        logCheck('a week', mtg);
        return end - new Date(mtg.time.last) === 7 * 24 * 60 * 60 * 1000;
      },
      biweekly(mtg) {
        logCheck('two weeks', mtg);
        return end - new Date(mtg.time.last) === 14 * 24 * 60 * 60 * 1000;
      },
      monthly(mtg) {
        logCheck('a month', mtg);
        const last = new Date(mtg.time.last);
        const monthDiff =
          end.getMonth() -
          last.getMonth() +
          12 * (end.getFullYear() - last.getFullYear());
        return end.getDate() === last.getDate() && monthDiff === 1;
      },
    };
    for await ([recur, isRecurring] of Object.entries(recurChecks)) {
      const recurring = existingMeetings.find(isRecurring);
      if (!recurring || recurring.time.recur) continue;
      recurring.time.recur = meeting.time.recur = rrules[recur];
      recurring.time.last = meeting.time.to;
      logger.debug(`Updating ${meetingToString(recurring)}...`);
      logger.silly(`Updating meeting: ${JSON.stringify(recurring, null, 2)}`);
      const [err, res] = await req('put', '/api/meetings', recurring);
      if (err) {
        error(err, `updating ${meetingToString(recurring)}`);
      } else {
        logger.verbose(
          `Updated ${meetingToString(res.data)} (${res.data.id}).`
        );
        fs.writeFileSync(meetingsPath, JSON.stringify(meetings, null, 2));
        fs.appendFileSync(rowsPath, `\n${rowId}`);
        recurringTotal.push(res.data);
      }
      break;
    }
    if (meeting.time.recur) {
      bar.update((count += 1));
      continue;
    }

    // Otherwise, create a new normal, non-recurring meeting instance.
    logger.debug(`Creating ${meetingToString(meeting)}...`);
    logger.silly(`Creating meeting: ${JSON.stringify(meeting, null, 2)}`);
    const [err, res] = await req('post', '/api/meetings', meeting);
    if (err) {
      error(err, `creating ${meetingToString(meeting)}`);
    } else {
      logger.verbose(`Created ${meetingToString(res.data)} (${res.data.id}).`);
      meetings[matchId] = [...existingMeetings, res.data];
      fs.writeFileSync(meetingsPath, JSON.stringify(meetings, null, 2));
      fs.appendFileSync(rowsPath, `\n${rowId}`);
      meetingsTotal.push(res.data);
    }
    bar.update((count += 1));
  }

  bar.stop();
  logger.info(
    `Created ${matchesTotal.length} matches and ${meetingsTotal.length} meetings (${recurringTotal.length} recurring).`
  );
  logger.info(
    `Made ${postCount} POST requests, ${putCount} PUT requests, and encountered ${errorTotal.length} total errors.`
  );

  debugger;
}

importPicktime('./quarantunes-picktime-meetings-feb-1-to-jun-1.csv', true);
