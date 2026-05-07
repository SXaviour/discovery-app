// Migration script for the Activities & Experiences pivot
// Clears old place/interaction data and adds the tags column
// Run with: node src/scripts/migrate.js

require('dotenv').config();
const db = require('../config/database');

async function run() {
  console.log('Running migration...\n');

  // Wipe interactions first (they reference places via foreign key)
  await db.query('TRUNCATE user_interactions RESTART IDENTITY CASCADE');
  console.log('✓ Cleared user_interactions');

  // Wipe all old places (restaurants, bars, museums etc.)
  await db.query('TRUNCATE places RESTART IDENTITY CASCADE');
  console.log('✓ Cleared places');

  // Add tags column — stores the granular descriptors per place (e.g. "escape room", "date night")
  await db.query(`
    ALTER TABLE places
    ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}'
  `);
  console.log('✓ Added tags TEXT[] column to places');

  // Add a GIN index so tag searches stay fast as the table grows
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_places_tags ON places USING GIN(tags)
  `);
  console.log('✓ Added GIN index on tags');

  console.log('\nMigration complete. Ready to run fetch-places.');
  await db.end();
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
