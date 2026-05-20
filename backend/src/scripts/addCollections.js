// Adds the collections and collection_places tables
// Run with: npm run add-collections

require('dotenv').config();
const db = require('../config/database');

async function run() {
  console.log('Adding collections tables...\n');

  await db.query(`
    CREATE TABLE IF NOT EXISTS collections (
      id          SERIAL PRIMARY KEY,
      user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
      name        VARCHAR(255) NOT NULL,
      description TEXT,
      created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('✓ collections table ready');

  await db.query(`
    CREATE TABLE IF NOT EXISTS collection_places (
      id            SERIAL PRIMARY KEY,
      collection_id INTEGER REFERENCES collections(id) ON DELETE CASCADE,
      place_id      INTEGER REFERENCES places(id) ON DELETE CASCADE,
      added_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(collection_id, place_id)
    )
  `);
  console.log('✓ collection_places table ready');

  await db.query('CREATE INDEX IF NOT EXISTS idx_collections_user ON collections(user_id)');
  await db.query('CREATE INDEX IF NOT EXISTS idx_coll_places_coll ON collection_places(collection_id)');
  await db.query('CREATE INDEX IF NOT EXISTS idx_coll_places_place ON collection_places(place_id)');
  console.log('✓ Indexes created');

  console.log('\nDone. Collections are ready to use.');
  await db.end();
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
