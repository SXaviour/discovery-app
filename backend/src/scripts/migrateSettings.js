// Migration: add default_city column to user_preferences
// Run with: node src/scripts/migrateSettings.js

require('dotenv').config();
const db = require('../config/database');

async function run() {
  console.log('Running settings migration...\n');

  await db.query(`
    ALTER TABLE user_preferences
    ADD COLUMN IF NOT EXISTS default_city VARCHAR(100)
  `);
  console.log('✓ Added default_city column to user_preferences');

  console.log('\nMigration complete.');
  await db.end();
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
