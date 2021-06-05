// Copies our Firebase data to Supabase (both authentication and PostgreSQL).

const phone = require('phone');
const { v4: uuid } = require('uuid');
const { nanoid } = require('nanoid');
const supabase = require('../lib/supabase');
const firebase = require('../lib/firebase');
const logger = require('../lib/logger');
const auth = require('../lib/auth');

async function migrate() {
  logger.info('Fetching user docs...');
  const { docs } = await firebase.db.collection('users').limit(5).get();
  logger.info(`Parsing ${docs.length} user docs...`);
  const users = docs.map((d) => d.data()).map((d) => ({
    id: uuid(),
    name: d.name,
    photo: d.photo || null,
    email: d.email || null,
    phone: phone(d.phone)[0] || null,
    bio: d.bio,
    background: d.background || null,
    venue: d.venue || null,
    socials: d.socials || [],
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
  logger.info(`Inserting ${users.length} user rows...`);
  const { data, error } = await supabase.from('users').insert(users);
  if (error) logger.error(error.message);
  debugger;
}

if (require.main === module) migrate();
