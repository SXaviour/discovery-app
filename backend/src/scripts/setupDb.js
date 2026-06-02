// Full database setup for a fresh production database.
// Runs all schema creation and migrations in order.
// Safe to run on an empty database — uses IF NOT EXISTS throughout.
// Run with: node src/scripts/setupDb.js

require('dotenv').config();
const db = require('../config/database');

async function run() {
  console.log('Setting up production database...\n');

  // ── Core tables ──────────────────────────────────────────────────────────

  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL PRIMARY KEY,
      email         VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      username      VARCHAR(100),
      created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await db.query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
  console.log('✓ users');

  await db.query(`
    CREATE TABLE IF NOT EXISTS places (
      id                  SERIAL PRIMARY KEY,
      google_place_id     VARCHAR(255) UNIQUE,
      name                VARCHAR(255) NOT NULL,
      city                VARCHAR(100) NOT NULL,
      category            VARCHAR(50)  NOT NULL,
      subcategory         VARCHAR(50),
      tags                TEXT[] DEFAULT '{}',
      address             TEXT,
      latitude            DECIMAL(10, 8),
      longitude           DECIMAL(11, 8),
      phone               VARCHAR(50),
      website             TEXT,
      google_maps_url     TEXT,
      google_rating       DECIMAL(3, 2),
      google_review_count INTEGER DEFAULT 0,
      average_rating      DECIMAL(3, 2) DEFAULT 0,
      total_ratings       INTEGER DEFAULT 0,
      price_level         INTEGER CHECK (price_level >= 1 AND price_level <= 4),
      photo_reference     TEXT,
      image_url           TEXT,
      photos              TEXT[],
      hours               JSONB,
      open_now            BOOLEAN,
      description         TEXT,
      attributes          JSONB DEFAULT '{}',
      is_closed           BOOLEAN DEFAULT false,
      created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT unique_name_city UNIQUE (name, city)
    )
  `);
  await db.query('CREATE INDEX IF NOT EXISTS idx_places_city ON places(city)');
  await db.query('CREATE INDEX IF NOT EXISTS idx_places_category ON places(category)');
  await db.query('CREATE INDEX IF NOT EXISTS idx_places_google_rating ON places(google_rating DESC)');
  await db.query('CREATE INDEX IF NOT EXISTS idx_places_average_rating ON places(average_rating DESC)');
  await db.query('CREATE INDEX IF NOT EXISTS idx_places_google_place_id ON places(google_place_id)');
  await db.query('CREATE INDEX IF NOT EXISTS idx_places_price ON places(price_level)');
  await db.query('CREATE INDEX IF NOT EXISTS idx_places_tags ON places USING GIN(tags)');
  console.log('✓ places');

  await db.query(`
    CREATE TABLE IF NOT EXISTS user_interactions (
      id               SERIAL PRIMARY KEY,
      user_id          INTEGER REFERENCES users(id) ON DELETE CASCADE,
      place_id         INTEGER REFERENCES places(id) ON DELETE CASCADE,
      interaction_type VARCHAR(20) NOT NULL CHECK (interaction_type IN ('rating', 'favorite', 'visited')),
      rating_value     INTEGER CHECK (rating_value >= 1 AND rating_value <= 5),
      created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, place_id, interaction_type)
    )
  `);
  await db.query('CREATE INDEX IF NOT EXISTS idx_interactions_user ON user_interactions(user_id)');
  await db.query('CREATE INDEX IF NOT EXISTS idx_interactions_place ON user_interactions(place_id)');
  await db.query('CREATE INDEX IF NOT EXISTS idx_interactions_type ON user_interactions(interaction_type)');
  console.log('✓ user_interactions');

  await db.query(`
    CREATE TABLE IF NOT EXISTS user_preferences (
      id                    SERIAL PRIMARY KEY,
      user_id               INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
      preferred_categories  JSONB DEFAULT '[]',
      preferred_price_range JSONB DEFAULT '{"min": 1, "max": 4}',
      interests             TEXT[],
      default_city          VARCHAR(100),
      updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await db.query('CREATE INDEX IF NOT EXISTS idx_preferences_user ON user_preferences(user_id)');
  console.log('✓ user_preferences');

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
  await db.query(`
    CREATE TABLE IF NOT EXISTS collection_places (
      id            SERIAL PRIMARY KEY,
      collection_id INTEGER REFERENCES collections(id) ON DELETE CASCADE,
      place_id      INTEGER REFERENCES places(id) ON DELETE CASCADE,
      added_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(collection_id, place_id)
    )
  `);
  await db.query('CREATE INDEX IF NOT EXISTS idx_collections_user ON collections(user_id)');
  await db.query('CREATE INDEX IF NOT EXISTS idx_coll_places_coll ON collection_places(collection_id)');
  await db.query('CREATE INDEX IF NOT EXISTS idx_coll_places_place ON collection_places(place_id)');
  console.log('✓ collections + collection_places');

  await db.query(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id         SERIAL PRIMARY KEY,
      user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
      token      VARCHAR(255) UNIQUE NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('✓ password_reset_tokens');

  console.log('\nDatabase setup complete.');
  await db.end();
}

run().catch(err => {
  console.error('Setup failed:', err);
  process.exit(1);
});
