// Copies our Firebase data to Supabase (both authentication and PostgreSQL).

const fs = require('fs');
const path = require('path');
const phone = require('phone');
const progress = require('cli-progress');
const { default: to } = require('await-to-js');
const { v4: uuid } = require('uuid');
const { nanoid } = require('nanoid');
const supabase = require('../lib/supabase');
const firebase = require('../lib/firebase');
const logger = require('../lib/logger');

const usersPath = path.resolve(__dirname, './users.json');
const errorsPath = path.resolve(__dirname, './errors.json');

function social({ type, url }) {
  if (/^https?:\/\/\S+$/.test(url)) return url;
  switch (type) {
    case 'website':
      return `https://${url}`;
    case 'linkedin':
      return `https://linkedin.com/in/${url}`;
    case 'twitter':
      return `https://twitter.com/${url}`;
    case 'facebook':
      return `https://facebook.com/${url}`;
    case 'instagram':
      return `https://instagram.com/${url}`;
    case 'github':
      return `https://github.com/${url}`;
    case 'indiehackers':
      return `https://indiehackers.com/${url}`;
    default:
      return `https://${url}`;
  }
}

async function fetch() {
  logger.info('Fetching user docs...');
  const { docs } = await firebase.db.collection('users').get();
  logger.info(`Parsing ${docs.length} user docs...`);
  const users = docs.map((d) => d.data()).map((d) => ({
    name: d.name,
    photo: d.photo || null,
    email: d.email || null,
    phone: phone(d.phone)[0] || null,
    bio: d.bio,
    background: d.background || null,
    venue: d.venue ? d.venue.trim() : null,
    socials: (d.socials || []).map((s) => ({
      type: s.type,
      url: social(s).trim().split(' ').join('%20'),
    })),
    availability: d.availability.map((t) => ({
      id: t.id || nanoid(),
      from: t.from.toDate(),
      to: t.to.toDate(),
      exdates: (t.exdates || []).map((d) => d.toDate()),
      recur: t.recur || null,
      last: t.last ? t.last.toDate() : null,
    })),
    mentoring: d.mentoring,
    tutoring: d.tutoring,
    langs: d.langs.length ? d.langs : ['en'],
    visible: d.visible || false,
    featured: d.featured || [],
    tags: d.tags || [],
    reference: d.reference || '',
    timezone: d.timezone || null,
    age: d.age ? Math.floor(d.age) : null,
  }));
  logger.info(`Saving parsed data to ${usersPath}...`);
  fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
}

async function insert() {
  logger.info(`Fetching parsed data from ${usersPath}...`);
  const users = require(usersPath);
  const errors = require(errorsPath);
  const bar = new progress.SingleBar({}, progress.Presets.shades_classic);
  let count = 0;
  logger.info(`Inserting ${users.length} user rows...`);
  bar.start(users.length, count);
  for await (const user of users) {
    const { data, error } = await supabase.from('users').insert(user);
    if (error) {
      console.log('\n');
      logger.info(JSON.stringify(user, null, 2));
      logger.error(`${error.name} inserting user: ${error.message}`);
      debugger;
      errors.push({ data, error, user });
    }
    bar.update((count += 1));
  }
  bar.stop();
  fs.writeFileSync(errorsPath, JSON.stringify(errors, null, 2));
}

async function retry() {
  logger.info(`Fetching errors from ${errorsPath}...`);
  const errors = require(errorsPath);
  const bar = new progress.SingleBar({}, progress.Presets.shades_classic);
  let count = 0;
  logger.info(`Retrying ${errors.length} errored inserts...`);
  bar.start(errors.length, count);
  let idx = errors.length;
  while (idx--) {
    const { user } = errors[idx];
    const { data, error } = await supabase.from('users').insert(user);
    if (error) {
      console.log('\n');
      logger.info(JSON.stringify(user, null, 2));
      logger.error(`${error.name} inserting user: ${error.message}`);
      debugger;
    } else {
      errors.splice(idx, 1);
    }
    bar.update((count += 1));
  }
  bar.stop();
  fs.writeFileSync(errorsPath, JSON.stringify(errors, null, 2));
}

if (require.main === module) retry();
