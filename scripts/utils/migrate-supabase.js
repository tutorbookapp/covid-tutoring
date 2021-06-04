const supabase = require('./supabase');
const firebase = require('./firebase');

async function migrate() {
  const { docs } = await firebase.db.collection('users').get();
  const users = docs.map((d) => d.data()).map((d) => ({
    id: d.id,
    name: d.name,
    photo: d.photo || null,
    email: d.email || null,
    phone: phone(d.phone)[0] || null,
    bio: d.bio,
    background: d.background || null,
    venue: d.venue || null,
    socials:
  }));
  const { data, error } = await supabase.from('users').insert(users);
}

if (require.main === module) migrate();
