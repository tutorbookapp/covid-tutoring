// Copies our Firebase data to Supabase (both authentication and PostgreSQL).

const phone = require('phone');
const { nanoid } = require('nanoid');
const supabase = require('./supabase');
const firebase = require('./firebase');

async function migrate() {
  logger.info('Fetching user docs...');
  const { docs } = await firebase.db.collection('users').get();
  logger.info(`Parsing ${docs.length} user docs...`);
  const users = docs.map((d) => d.data()).map((d) => ({
    id: d.id,
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
  debugger;
  logger.info(`Inserting ${users.length} user rows...`);
  const { data, error } = await supabase.from('users').insert(users);
}

if (require.main === module) migrate();
