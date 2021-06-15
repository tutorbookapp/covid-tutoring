// Playground script to test the Supabase Node.js client.

const supabase = require('./lib/supabase');
const firebase = require('./lib/firebase');
const logger = require('./lib/logger');

async function playground() {
  const { data, error } = await supabase
    .from('relation_parents')
    .select(`
      user (*),
      parent (*)
    `);
  logger.info(JSON.stringify(data[0], null, 2));
  debugger;
}

if (require.main === module) playground();
