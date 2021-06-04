// Imports Picktime data (exported from the "Reports" tab by month) as matches
// and recurring meetings. Creates new students and parents as necessary.
//
// This script is resumable as it creates multiple "cache" files that are used
// to keep track of progress:
// - `errors.json` is a record of all the errors encountered while importing.
// - `matches-created.json` is a record of all the matches created.
// - `meetings-created.json` is a record of all the meetings created, organized
// by match (i.e. each `matchId` is a key that holds an array of meetings).
// - `name-to-user.json` maps Picktime user names with TB's user data.
// - `rows-created.txt` keeps track of the CSV rows already processed.
//
// Removing any of those files and restarting the script will result in data
// duplication. DO NOT DO THIS.

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
const Bottleneck = require('bottleneck');

const errorsPath = './errors.json';
const errors = require(errorsPath);
const matchesPath = './matches-created.json';
const matches = require(matchesPath);
const meetingsPath = './meetings-created.json';
const meetings = require(meetingsPath);
const usersPath = './name-to-user.json';
const users = require(usersPath);
const rowsPath = './rows-created.txt';
const rows = fs.readFileSync(rowsPath).toString().split('\n');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console({ format: winston.format.simple() }),
  ],
});

const env = 'production';
const apiDomain = 'http://localhost:5000';
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

const statuses = {
  new: 'created',
  pending: 'pending',
  confirmed: 'pending',
  completed: 'logged',
  paid: 'approved',
};

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

function caps(str) {
  return str
    .split(' ')
    .map((s) => `${s.charAt(0).toUpperCase()}${s.slice(1)}`)
    .join(' ');
}

function getStudentName(row) {
  if (!row[fields.studentName]) return '';
  if (row[fields.studentName].split(' ').length > 1)
    return row[fields.studentName];
  const lastName = row[fields.customerName].split(' ').pop();
  return caps(`${row[fields.studentName]} ${lastName}`);
}

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
  venue: '',
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
  tags: [],
  reference: '',
  timezone: '',
};

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

function generateParentBio(row) {
  let bio = `I'm a parent who originally booked a meeting on Picktime.`;
  if (row[fields.city]) bio += `\nCurrently located in: ${row[fields.city]}`;
  bio += `\nChildren: ${getStudentName(row)}`;
  if (row[fields.age]) bio += ` (${row[fields.age]})`;
  return bio;
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

function repeat(value, times) {
  let i = 0;
  const array = [];

  if (isArray(value)) {
    for (; i < times; i++) array[i] = [].concat(value);
  } else {
    for (; i < times; i++) array[i] = value;
  }
  return array;
}

function padStart(item, targetLength, padString = ' ') {
  const str = String(item);
  targetLength = targetLength >> 0;
  if (str.length > targetLength) {
    return String(str);
  }

  targetLength = targetLength - str.length;
  if (targetLength > padString.length) {
    padString += repeat(padString, targetLength / padString.length);
  }

  return padString.slice(0, targetLength) + String(str);
}

function timeToUntilString(time, utc = true) {
  const date = new Date(time);
  return [
    padStart(date.getUTCFullYear().toString(), 4, '0'),
    padStart(date.getUTCMonth() + 1, 2, '0'),
    padStart(date.getUTCDate(), 2, '0'),
    'T',
    padStart(date.getUTCHours(), 2, '0'),
    padStart(date.getUTCMinutes(), 2, '0'),
    padStart(date.getUTCSeconds(), 2, '0'),
    utc ? 'Z' : '',
  ].join('');
}

async function importPicktime(path, dryRun = false) {
  let count = 0;
  const bar = new progress.SingleBar({}, progress.Presets.shades_classic);
  const total = await new Promise((resolve, reject) =>
    exec(`wc -l < ${path}`, (err, res) => {
      if (err) return reject(err);
      resolve(Number(res) - 1); // Ignore the header line.
    })
  );

  logger.info(`Processing ${total} rows...`);
  bar.start(total, count);

  const rrules = {
    daily: 'RRULE:FREQ=DAILY',
    weekly: 'RRULE:FREQ=WEEKLY',
    biweekly: 'RRULE:FREQ=WEEKLY;INTERVAL=2',
  };

  const headers = { authorization: `Bearer ${await getToken()}` };
  const parser = fs.createReadStream(path).pipe(
    parse({
      skip_empty_lines: true,
      columns: true,
    })
  );

  let putCount = 0;
  let postCount = 0;
  function req(method, endpoint, data) {
    if (method === 'put') putCount += 1;
    if (method === 'post') postCount += 1;
    if (dryRun) {
      logger.silly(`Skipping ${method.toUpperCase()} ${endpoint}...`);
      return [null, { data }];
    }
    logger.silly(`HTTP ${method.toUpperCase()} ${apiDomain}${endpoint}`);
    return to(axios[method](`${apiDomain}${endpoint}`, data, { headers }));
  }

  function error(err, action, data) {
    const { message } = err.response ? err.response.data : err;
    const msg = `${err.name} ${action}: ${message}`;
    bar.stop();
    logger.error(msg);
    logger.error(JSON.stringify(data, null, 2));
    debugger;
    errors.push({ err, action, data });
    fs.writeFileSync(errorsPath, JSON.stringify(errors, null, 2));
    throw new Error(msg);
  }

  async function getUser({ name, email, phone }) {
    if (users[name]) {
      logger.silly(`Found ${name} in users cache.`);
      return users[name];
    }
    let searchString = (name || '').split(' (')[0];
    const searchOptions = { restrictSearchableAttributes: ['name'] };
    searchOptions.optionalFilters = 'orgs:quarantunes';
    if (email === '-') {
      logger.debug('Skipping invalid email filter...');
    } else if (email && phone) {
      searchString = '';
      searchOptions.filters = `email:"${email}"`;
      searchOptions.optionalFilters = `orgs:quarantunes AND phone:"${phone}"`;
    } else if (email) {
      searchString = '';
      searchOptions.filters = `email:"${email}"`;
    } else if (phone) {
      searchString = '';
      searchOptions.filters = `phone:"${phone}"`;
    }
    const searchOptionsStr = JSON.stringify(searchOptions, null, 2);
    logger.debug(`Searching (${searchString}): ${searchOptionsStr}`);
    const { hits } = await searchIdx.search(searchString, searchOptions);
    if (!hits.length)
      throw new Error(`No results (${searchString}): ${searchOptionsStr}`);
    const user = { ...(hits[0] || {}), id: (hits[0] || {}).objectID || '' };
    if (!user.orgs.includes('quarantunes')) {
      const msg = `${user.name} (${user.id}) is not part of QuaranTunes.`;
      bar.stop();
      logger.error(msg);
      debugger;
      throw new Error(msg);
    }
    users[name] = user;
    fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
    return user;
  }

  async function getOrCreateUser({ name, email, phone, ...rest }) {
    try {
      const user = await getUser({ name, email, phone });
      return user;
    } catch (e) {
      logger.debug(
        `${e.name} fetching ${name} (${email || phone}): ${e.message}`
      );
      const user = {
        ...emptyUser,
        id: dryRun ? nanoid() : '',
        name: name || '',
        email: email || '',
        phone: phone || '',
        created: new Date().toJSON(),
        updated: new Date().toJSON(),
        ...rest,
      };
      logger.debug(`Creating user: ${JSON.stringify(user, null, 2)}`);
      const [err, res] = await req('post', '/api/users', user);
      if (err) {
        error(err, `creating ${user.name}`, user);
        return user;
      } else {
        logger.verbose(`Created ${res.data.name} (${res.data.id}).`);
        users[name] = res.data;
        fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
        return res.data;
      }
    }
  }

  let lastExportedDate;
  for await (const row of parser) {
    logger.silly(`Processing row ${row['S.No']}...`);
    const date = getMeetingTime(row[fields.date]).to;
    lastExportedDate = lastExportedDate > date ? lastExportedDate : date;

    delete row['S.No'];
    const rowId = encodeURIComponent(JSON.stringify(Object.values(row)));
    if (rows.includes(rowId)) {
      bar.update((count += 1));
      continue;
    }

    const subject = getSubject(row[fields.service]);
    logger.silly(`Fetched subjects (${row[fields.service]}): ${subject}`);

    let student;
    let parent;
    if (
      !getStudentName(row) ||
      caps(row[fields.customerName] || '') === getStudentName(row)
    ) {
      student = parent = await getOrCreateUser({
        name: caps(row[fields.customerName] || ''),
        email: row[fields.email] || '',
        phone: phone(rows[fields.phone] || row[fields.phoneNumber])[0] || '',
        bio: generateStudentBio(row, subject),
        orgs: ['quarantunes'],
        mentoring: { subjects: [], searches: [subject] },
        reference: row[fields.reference] || '',
        age: Number(row[fields.age]) || undefined,
      });
      logger.silly(`Fetched student: ${JSON.stringify(student, null, 2)}`);
    } else {
      parent = await getOrCreateUser({
        name: caps(row[fields.customerName] || ''),
        email: row[fields.email] || '',
        phone: phone(rows[fields.phone] || row[fields.phoneNumber])[0] || '',
        bio: generateParentBio(row),
        orgs: ['quarantunes'],
        mentoring: { subjects: [], searches: [subject] },
        reference: row[fields.reference] || '',
      });
      logger.silly(`Fetched parent: ${JSON.stringify(parent, null, 2)}`);
      student = await getOrCreateUser({
        name: getStudentName(row) || '',
        email: '',
        phone: '',
        bio: generateStudentBio(row, subject),
        orgs: ['quarantunes'],
        mentoring: { subjects: [], searches: [subject] },
        reference: row[fields.reference] || '',
        age: Number(row[fields.age]) || undefined,
        parents: [parent.id],
      });
      logger.silly(`Fetched student: ${JSON.stringify(student, null, 2)}`);
    }

    const mentor = await getUser({ name: row[fields.teamMember] });
    logger.silly(`Fetched mentor: ${mentor.name} (${mentor.id}).`);

    // If there is already a match w/ this data, we reuse it. Otherwise, we
    // create and cache a new match.
    const matchId =
      `${subject.replace(' ', '-').toLowerCase()}-${mentor.id}-` +
      `${parent.id}-${student.id}`;
    if (!matches[matchId]) {
      const match = {
        org: 'quarantunes',
        subjects: [subject],
        message: generateMatchMessage(row),
        updated: new Date().toJSON(),
        created: new Date().toJSON(),
        tags: [],
        id: '',
      };
      if (parent === student) {
        match.people = [
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
        ];
        match.creator = {
          id: student.id || '',
          name: student.name || '',
          photo: student.photo || '',
          roles: ['mentee'],
        };
      } else {
        match.people = [
          {
            id: parent.id || '',
            name: parent.name || '',
            photo: parent.photo || '',
            roles: ['parent'],
          },
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
        ];
        match.creator = {
          id: parent.id || '',
          name: parent.name || '',
          photo: parent.photo || '',
          roles: ['parent'],
        };
      }
      logger.debug(`Creating ${matchToString(match)}...`);
      logger.silly(`Creating match: ${JSON.stringify(match, null, 2)}`);
      const [err, res] = await req('post', '/api/matches', match);
      if (err) {
        error(err, `creating ${matchToString(match)}`, match);
      } else {
        logger.verbose(`Created ${matchToString(res.data)} (${res.data.id}).`);
        matches[matchId] = res.data;
        fs.writeFileSync(matchesPath, JSON.stringify(matches, null, 2));
      }
    }

    const venueId = nanoid(10);
    const meeting = {
      status: statuses[(row[fields.status] || '').toLowerCase()] || 'created',
      creator: matches[matchId].creator,
      match: matches[matchId],
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
      tags: [],
      id: '',
    };

    // If there are any existing meetings for this match that are exactly one
    // week away from this meeting (i.e. same weekday, same time), we assume
    // that they are the same weekly recurring meeting. Same for every time
    // interval supported by Tutorbook (daily, weekly, biweekly, and monthly).
    const existingMeetings = meetings[matchId] || [];
    const end = new Date(meeting.time.to);

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
    };
    if (
      Object.entries(recurChecks).some(([recur, isRecurring]) => {
        const recurring = existingMeetings.find(isRecurring);
        if (!recurring) return false;
        const newRecur = rrules[recur];
        const oldRecur = recurring.time.recur;
        if (oldRecur && !oldRecur.includes(newRecur)) {
          // The meeting already has a different recur rule (e.g. biweekly) and
          // thus we should not change it to be the new recur rule (e.g. weekly)
          // just because this meeting instance happened to be a week from the
          // biweekly meeting. Instead, create a new meeting (that will then be
          // used by future recur rule checks and will allow weekly recur).
          return false;
        }
        recurring.time.recur = meeting.time.recur = newRecur;
        recurring.time.last = meeting.time.to;
        return true;
      })
    ) {
      bar.update((count += 1));
      fs.writeFileSync(meetingsPath, JSON.stringify(meetings, null, 2));
      fs.appendFileSync(rowsPath, `\n${rowId}`);
      continue;
    }

    // Otherwise, create a new normal, non-recurring meeting instance.
    logger.debug(`Creating ${meetingToString(meeting)}...`);
    logger.silly(`Creating meeting: ${JSON.stringify(meeting, null, 2)}`);
    const [err, res] = await req('post', '/api/meetings', meeting);
    if (err) {
      error(err, `creating ${meetingToString(meeting)}`, meeting);
    } else {
      logger.verbose(`Created ${meetingToString(res.data)} (${res.data.id}).`);
      meetings[matchId] = [...existingMeetings, res.data];
      fs.writeFileSync(meetingsPath, JSON.stringify(meetings, null, 2));
      fs.appendFileSync(rowsPath, `\n${rowId}`);
    }
    bar.update((count += 1));
  }
  bar.stop();

  const recurringBar = new progress.SingleBar(
    {},
    progress.Presets.shades_classic
  );
  const recurringMeetings = Object.values(meetings)
    .flat()
    .filter((m) => m.time.recur);
  let recurringCount = 0;
  logger.info(`Updating ${recurringMeetings.length} recurring meetings...`);
  recurringBar.start(recurringMeetings.length, recurringCount);

  async function updateRecurringMeeting(recurring) {
    let last = new Date(recurring.time.last).valueOf();
    if (recurring.time.recur.includes('FREQ=DAILY'))
      last += 24 * 60 * 60 * 1000;
    if (recurring.time.recur.includes('FREQ=WEEKLY'))
      last += 7 * 24 * 60 * 60 * 1000;
    if (recurring.time.recur.includes('FREQ=WEEKLY;INTERVAL=2'))
      last += 14 * 24 * 60 * 60 * 1000;
    // Recurring meetings whose last meeting time was within a week of the last
    // exported date from Picktime will be recorded as still recurring.
    if (last < new Date(lastExportedDate).valueOf()) {
      const untilStr = `;UNTIL=${timeToUntilString(recurring.time.last)}`;
      if (recurring.time.recur.includes('UNTIL')) {
        recurring.time.recur = recurring.time.recur.replace(
          /\;UNTIL=.*$/,
          untilStr
        );
      } else if (Object.values(rrules).includes(recurring.time.recur)) {
        recurring.time.recur += untilStr;
      } else {
        throw new Error(`Recur rule (${recurring.time.recur}) not supported.`);
      }
    } else {
      logger.silly(`Marked ${meetingToString(recurring)} as still recurring.`);
    }
    logger.debug(`Updating ${meetingToString(recurring)}...`);
    logger.silly(`Updating meeting: ${JSON.stringify(recurring, null, 2)}`);
    const [err, res] = await req(
      'put',
      `/api/meetings/${recurring.id}`,
      recurring
    );
    if (err) {
      throw new Error((err.response ? err.response.data : err).message);
    } else {
      logger.verbose(`Updated ${meetingToString(res.data)} (${res.data.id}).`);
      recurringBar.update((recurringCount += 1));
    }
  }

  const limiter = new Bottleneck({
    maxConcurrent: 500,
    minTime: 100,
  });
  limiter.on('failed', async (error, jobInfo) => {
    const { id } = jobInfo.options;
    logger.error(`Job (${id}) failed: ${error}`);
    if (jobInfo.retryCount < 10) {
      logger.info(`Retrying job (${id}) in 100ms...`);
      return 100;
    }
  });
  limiter.on('retry', (error, jobInfo) => {
    logger.info(`Now retrying job (${jobInfo.options.id})...`);
  });
  await Promise.all(
    recurringMeetings.map((m) =>
      limiter.schedule({ id: m.id }, updateRecurringMeeting, m)
    )
  );
  fs.writeFileSync(meetingsPath, JSON.stringify(meetings, null, 2));
  recurringBar.stop();

  logger.info(
    `Created ${Object.keys(matches).length} matches and ${
      Object.values(meetings).flat().length
    } meetings (${recurringMeetings.length} recurring).`
  );
  logger.info(
    `Made ${postCount} POST requests, ${putCount} PUT requests, and encountered ${errors.length} total errors.`
  );

  debugger;
}

importPicktime('./latest/2021-10.csv');

async function clearPicktimeData(dryRun = false) {
  const headers = { authorization: `Bearer ${await getToken()}` };
  const limiter = new Bottleneck({
    maxConcurrent: 100,
    minTime: 100,
  });

  function req(endpoint) {
    if (dryRun) {
      logger.silly(`Skipping DELETE ${endpoint}...`);
      return [null];
    }
    return to(axios.delete(`${apiDomain}${endpoint}`, { headers }));
  }

  function error(err, action, data) {
    const { message } = err.response ? err.response.data : err;
    const msg = `${err.name} ${action}: ${message}`;
    logger.error(msg);
    debugger;
    errors.push({ err, action, data });
    fs.writeFileSync(errorsPath, JSON.stringify(errors, null, 2));
    throw new Error(msg);
  }

  logger.info('Fetching data...');
  const [matches, meetings] = await Promise.all([
    app
      .firestore()
      .collection('matches')
      .where('org', '==', 'quarantunes')
      .get(),
    app
      .firestore()
      .collection('meetings')
      .where('match.org', '==', 'quarantunes')
      .get(),
  ]);

  let count = 0;
  const meetingsBar = new progress.SingleBar(
    {},
    progress.Presets.shades_classic
  );
  logger.info(`Deleting ${meetings.docs.length} meetings...`);
  meetingsBar.start(meetings.docs.length, count);

  await Promise.all(
    meetings.docs.map((m) =>
      limiter.schedule(async () => {
        const [err] = await req(`/api/meetings/${m.id}`);
        if (err) {
          error(err, `deleting ${meetingToString(m.data())}`, m.data());
        } else {
          logger.verbose(`Deleted ${meetingToString(m.data())} (${m.id}).`);
        }
        meetingsBar.update((count += 1));
      })
    )
  );
  meetingsBar.stop();

  count = 0;
  const matchesBar = new progress.SingleBar(
    {},
    progress.Presets.shades_classic
  );
  logger.info(`Deleting ${matches.docs.length} matches...`);
  matchesBar.start(matches.docs.length, count);

  const students = [];
  await Promise.all(
    matches.docs.map((m) =>
      limiter.schedule(async () => {
        const [err] = await req(`/api/matches/${m.id}`);
        if (err) {
          error(err, `deleting ${matchToString(m.data())}`, m.data());
        } else {
          logger.verbose(`Deleted ${matchToString(m.data())} (${m.id}).`);
          const { creator } = m.data();
          if (!creator.photo && !students.find((s) => s.id === creator.id))
            students.push(creator);
        }
        matchesBar.update((count += 1));
      })
    )
  );
  matchesBar.stop();

  count = 0;
  const studentsBar = new progress.SingleBar(
    {},
    progress.Presets.shades_classic
  );
  logger.info(`Deleting ${students.length} students...`);
  studentsBar.start(students.length, count);

  await Promise.all(
    students.map((s) =>
      limiter.schedule(async () => {
        const [err] = await req(`/api/users/${s.id}`);
        if (err) {
          error(err, `deleting ${s.name} (${s.id})`, s);
        } else {
          logger.verbose(`Deleted ${s.name} (${s.id}).`);
        }
        studentsBar.update((count += 1));
      })
    )
  );
  studentsBar.stop();

  logger.info('Fetching search data...');
  const matchesIdx = client.initIndex(`${env}-matches`);
  const meetingsIdx = client.initIndex(`${env}-meetings`);
  let matchesObjIds = [];
  let meetingsObjIds = [];
  await Promise.all([
    matchesIdx.browseObjects({
      filters: 'org:quarantunes',
      batch: (objs) => objs.forEach((o) => matchesObjIds.push(o.objectID)),
    }),
    client.initIndex(`${env}-meetings`).browseObjects({
      filters: 'match.org:quarantunes',
      batch: (objs) => objs.forEach((o) => meetingsObjIds.push(o.objectID)),
    }),
  ]);

  logger.info(
    `Deleting ${meetingsObjIds.length} meetings and ${matchesObjIds.length} matches...`
  );
  await Promise.all([
    matchesIdx.deleteObjects(matchesObjIds),
    meetingsIdx.deleteObjects(meetingsObjIds),
  ]);
}
