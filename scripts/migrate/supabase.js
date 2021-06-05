// Copies our Firebase data to Supabase (both authentication and PostgreSQL).

const phone = require('phone');
const { default: to } = require('await-to-js');
const { v4: uuid } = require('uuid');
const { nanoid } = require('nanoid');
const supabase = require('../lib/supabase');
const firebase = require('../lib/firebase');
const logger = require('../lib/logger');
const auth = require('../lib/auth');

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

async function migrate() {
  logger.info('Fetching user docs...');
  const { docs } = await firebase.db.collection('users').where('name', '==', 'Nicholas Chiang').get();
  logger.info(`Parsing ${docs.length} user docs...`);
  const users = docs.map((d) => d.data()).map((d) => ({
    name: d.name,
    photo: d.photo || null,
    email: d.email || null,
    phone: phone(d.phone)[0] || null,
    bio: d.bio,
    background: d.background || null,
    venue: d.venue || null,
    socials: (d.socials || []).map((s) => ({
      type: s.type,
      url: social(s).trim(),
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
    age: d.age || null,
  }));
  logger.info(`Creating ${users.length} users...`);
  await Promise.all(users.map(async (user) => {
    logger.verbose(`Creating ${user.name}'s Supabase account...`);
    const [err, res] = await to(auth.createUser(user));
    if (err) {
      logger.error(`${err.name} creating Supabase account: ${err.message}`);
      debugger;
    } else {
      user.id = res.data.id;
    }
    logger.verbose(`Inserting ${user.name}'s PostgreSQL row...`);
    const { data, error } = await supabase.from('users').insert(user);
    if (error) {
      logger.error(`${error.name} inserting PostgreSQL row: ${error.message}`);
      debugger;
    }
  }));
  debugger;
}

if (require.main === module) migrate();
