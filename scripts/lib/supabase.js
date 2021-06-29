const path = require('path');
const dotenv = require('dotenv');
const logger = require('./logger');

const env = process.env.NODE_ENV || 'production';
logger.info(`Loading ${env} environment variables...`);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });
dotenv.config({ path: path.resolve(__dirname, `../../.env.${env}`) });
dotenv.config({ path: path.resolve(__dirname, `../../.env.${env}.local`) });

const { createClient } = require('@supabase/supabase-js');

module.exports = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_KEY);
