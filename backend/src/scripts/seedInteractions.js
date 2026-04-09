// Generates a large realistic interaction dataset for ML model training
// Targets ~50,000 interactions across ~200 users
// Uses bulk inserts for speed — runs in minutes not hours
// Run with: npm run seed-interactions

require('dotenv').config();
const bcrypt = require('bcrypt');
const db = require('../config/database');
const { createUser, emailExists } = require('../database/helpers');

const USER_COUNT = 200;

// ---------- NAME POOL ----------
const FIRST_NAMES = [
  'james','oliver','harry','jack','george','noah','charlie','jacob','alfie','freddie',
  'archie','oscar','henry','leo','william','thomas','ethan','luca','mason','logan',
  'emma','olivia','sophia','isabella','mia','ella','grace','lily','hannah','amelia',
  'ava','isla','ruby','evie','poppy','molly','alice','daisy','freya','jessica',
  'daniel','ryan','sean','patrick','cian','conor','aoife','niamh','siobhan','ciara',
  'lucas','max','julian','felix','leon','luis','marc','simon','adam','ben'
];

const LAST_NAMES = [
  'smith','jones','murphy','kelly','ryan','walsh','byrne','connor','mccarthy','gallagher',
  'kennedy','lynch','campbell','brown','wilson','taylor','anderson','moore','jackson','white',
  'harris','martin','thompson','garcia','martinez','robinson','clark','lewis','lee','walker',
  'hall','allen','young','king','wright','scott','green','baker','adams','nelson',
  'carter','mitchell','perez','roberts','turner','phillips','evans','edwards','collins','stewart'
];

const PROFILES = [
  'restaurant-heavy',
  'museum-heavy',
  'bar-heavy',
  'mixed',
  'budget',
  'luxury'
];

// ---------- HELPERS ----------
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN(arr, n) {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, Math.min(n, arr.length));
}

// Adds natural variation so users don't all have the exact same interaction count
function scale(base) {
  return Math.floor(base * (0.7 + Math.random() * 0.7));
}

// ---------- GENERATE USER LIST ----------
const TEST_USERS = Array.from({ length: USER_COUNT }).map((_, i) => {
  const first = pick(FIRST_NAMES);
  const last  = pick(LAST_NAMES);
  return {
    email:    `${first}.${last}.${i}@seeded.dev`,
    username: `${first}_${last}${i}`,
    profile:  pick(PROFILES),
  };
});

// ---------- FETCH ALL PLACES ONCE ----------
async function getAllPlaces() {
  const res = await db.query('SELECT id, category, price_level, city FROM places WHERE is_closed = false');
  return res.rows;
}

// ---------- BUILD INTERACTIONS FOR ONE USER ----------
// Returns an array of { placeId, type, value } objects — does NOT hit the DB
function buildInteractions(profile, places) {
  const by = {
    restaurant:    places.filter(p => p.category === 'restaurant'),
    bar:           places.filter(p => p.category === 'bar'),
    museum:        places.filter(p => p.category === 'museum'),
    park:          places.filter(p => p.category === 'park'),
    attraction:    places.filter(p => p.category === 'attraction'),
    entertainment: places.filter(p => p.category === 'entertainment'),
    shopping:      places.filter(p => p.category === 'shopping'),
    cheap:         places.filter(p => !p.price_level || p.price_level <= 2),
  };

  const cities   = [...new Set(places.map(p => p.city))];
  const homeCity = pick(cities);
  const homePlaces = places.filter(p => p.city === homeCity);

  let raw = [];

  if (profile === 'restaurant-heavy') {
    raw.push(
      ...pickN(by.restaurant,  scale(60)).map(p => ({ placeId: p.id, type: 'rating',   value: pick([4,4,5]) })),
      ...pickN(by.restaurant,  scale(30)).map(p => ({ placeId: p.id, type: 'favorite' })),
      ...pickN(by.restaurant,  scale(40)).map(p => ({ placeId: p.id, type: 'visited' })),
      ...pickN(by.bar,         scale(20)).map(p => ({ placeId: p.id, type: 'visited' })),
      ...pickN(by.attraction,  scale(15)).map(p => ({ placeId: p.id, type: 'rating',   value: pick([3,4]) })),
      ...pickN(by.restaurant,  scale(10)).map(p => ({ placeId: p.id, type: 'rating',   value: pick([1,2]) })), // negative signals
    );
  } else if (profile === 'museum-heavy') {
    raw.push(
      ...pickN(by.museum,      scale(55)).map(p => ({ placeId: p.id, type: 'rating',   value: pick([4,5]) })),
      ...pickN(by.museum,      scale(30)).map(p => ({ placeId: p.id, type: 'favorite' })),
      ...pickN(by.attraction,  scale(35)).map(p => ({ placeId: p.id, type: 'visited' })),
      ...pickN(by.park,        scale(20)).map(p => ({ placeId: p.id, type: 'favorite' })),
      ...pickN(by.restaurant,  scale(20)).map(p => ({ placeId: p.id, type: 'visited' })),
      ...pickN(by.bar,         scale(8)).map(p  => ({ placeId: p.id, type: 'rating',   value: pick([1,2]) })),
    );
  } else if (profile === 'bar-heavy') {
    raw.push(
      ...pickN(by.bar,          scale(60)).map(p => ({ placeId: p.id, type: 'rating',   value: pick([3,4,5]) })),
      ...pickN(by.bar,          scale(30)).map(p => ({ placeId: p.id, type: 'favorite' })),
      ...pickN(by.entertainment,scale(30)).map(p => ({ placeId: p.id, type: 'visited' })),
      ...pickN(by.restaurant,   scale(25)).map(p => ({ placeId: p.id, type: 'visited' })),
      ...pickN(by.museum,       scale(8)).map(p  => ({ placeId: p.id, type: 'rating',   value: pick([1,2]) })),
    );
  } else if (profile === 'budget') {
    raw.push(
      ...pickN(by.cheap,       scale(70)).map(p => ({ placeId: p.id, type: 'rating',   value: pick([3,4,5]) })),
      ...pickN(by.park,        scale(40)).map(p => ({ placeId: p.id, type: 'favorite' })),
      ...pickN(by.attraction,  scale(25)).map(p => ({ placeId: p.id, type: 'visited' })),
      ...pickN(by.cheap,       scale(20)).map(p => ({ placeId: p.id, type: 'favorite' })),
    );
  } else if (profile === 'luxury') {
    raw.push(
      ...pickN(by.restaurant,  scale(55)).map(p => ({ placeId: p.id, type: 'rating',   value: pick([3,4,5]) })),
      ...pickN(by.shopping,    scale(40)).map(p => ({ placeId: p.id, type: 'favorite' })),
      ...pickN(by.bar,         scale(30)).map(p => ({ placeId: p.id, type: 'visited' })),
      ...pickN(by.attraction,  scale(20)).map(p => ({ placeId: p.id, type: 'visited' })),
    );
  } else {
    // mixed — touches every category, important for creating cross-user overlap
    raw.push(
      ...pickN(by.restaurant,    scale(20)).map(p => ({ placeId: p.id, type: 'rating',   value: pick([2,3,4,5]) })),
      ...pickN(by.bar,           scale(15)).map(p => ({ placeId: p.id, type: 'rating',   value: pick([2,3,4,5]) })),
      ...pickN(by.museum,        scale(15)).map(p => ({ placeId: p.id, type: 'visited' })),
      ...pickN(by.park,          scale(12)).map(p => ({ placeId: p.id, type: 'favorite' })),
      ...pickN(by.attraction,    scale(15)).map(p => ({ placeId: p.id, type: 'visited' })),
      ...pickN(by.entertainment, scale(10)).map(p => ({ placeId: p.id, type: 'rating',   value: pick([3,4]) })),
      ...pickN(by.shopping,      scale(10)).map(p => ({ placeId: p.id, type: 'visited' })),
    );
  }

  // Home city bias — everyone interacts more with where they live
  raw.push(
    ...pickN(homePlaces, scale(40)).map(p => ({ placeId: p.id, type: 'visited' }))
  );

  // Noise — some random ratings to simulate real-world messiness
  // 70% of noise comes from the user's primary categories (more realistic — people
  // mostly rate things they'd actually visit) and 30% is truly random across all places
  const primaryCategories = {
    'restaurant-heavy': ['restaurant'],
    'museum-heavy':     ['museum', 'attraction'],
    'bar-heavy':        ['bar', 'entertainment'],
    'budget':           ['park', 'attraction'],
    'luxury':           ['restaurant', 'shopping'],
    'mixed':            ['restaurant', 'bar', 'museum'],
  };
  const primaryCats = primaryCategories[profile] || [];
  const primaryPlaces = places.filter(p => primaryCats.includes(p.category));

  const noiseCount = scale(10); // reduced from 30 — 10% noise instead of 30%
  const primaryNoiseCount = Math.floor(noiseCount * 0.7);
  const randomNoiseCount  = noiseCount - primaryNoiseCount;

  raw.push(
    ...pickN(primaryPlaces, primaryNoiseCount).map(p => ({ placeId: p.id, type: 'rating', value: pick([1,2,3,4,5]) })),
    ...pickN(places, randomNoiseCount).map(p => ({ placeId: p.id, type: 'rating', value: pick([1,2,3,4,5]) }))
  );

  // Deduplicate — same user can't have the same interaction type for the same place twice
  const seen = new Set();
  return raw.filter(i => {
    const key = `${i.placeId}-${i.type}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ---------- BULK INSERT ----------
// Inserts all interactions for all users in batches — much faster than one query per interaction
async function bulkInsert(rows) {
  if (rows.length === 0) return;

  // Insert in chunks of 2000 to stay well within PostgreSQL's parameter limit
  const CHUNK = 2000;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);

    // Build the VALUES list dynamically: ($1,$2,$3,$4), ($5,$6,$7,$8), ...
    const placeholders = chunk.map((_, j) =>
      `($${j * 4 + 1}, $${j * 4 + 2}, $${j * 4 + 3}, $${j * 4 + 4})`
    ).join(',');

    const params = chunk.flatMap(r => [
      r.userId,
      r.placeId,
      r.type,
      r.type === 'rating' ? r.value : null,
    ]);

    await db.query(`
      INSERT INTO user_interactions (user_id, place_id, interaction_type, rating_value)
      VALUES ${placeholders}
      ON CONFLICT (user_id, place_id, interaction_type) DO NOTHING
    `, params);
  }
}

// Recalculates every place's average rating and count in one single query
// Much faster than doing it after every individual rating insert
async function recalculateAverages() {
  await db.query(`
    UPDATE places SET
      average_rating = sub.avg_rating,
      total_ratings  = sub.count
    FROM (
      SELECT place_id,
             ROUND(AVG(rating_value)::NUMERIC, 2) AS avg_rating,
             COUNT(*) AS count
      FROM user_interactions
      WHERE interaction_type = 'rating'
      GROUP BY place_id
    ) sub
    WHERE places.id = sub.place_id
  `);
}

// ---------- RUN ----------
async function run() {
  console.log(`Seeding ${USER_COUNT} users targeting ~50,000 interactions...\n`);

  const password = 'password123';
  const hash     = await bcrypt.hash(password, 10);
  const places   = await getAllPlaces();

  console.log(`  Loaded ${places.length} places from database\n`);

  const allRows = [];

  // Create users and build their interactions (no DB writes yet except user creation)
  for (const user of TEST_USERS) {
    let userId;
    const exists = await emailExists(user.email);

    if (exists) {
      const res = await db.query('SELECT id FROM users WHERE email = $1', [user.email]);
      userId = res.rows[0].id;
    } else {
      const created = await createUser(user.email, hash, user.username);
      userId = created.id;
    }

    const interactions = buildInteractions(user.profile, places);
    interactions.forEach(i => allRows.push({ userId, ...i }));

    process.stdout.write(`\r  Built interactions for ${allRows.length} rows so far...`);
  }

  console.log(`\n\n  Total interactions to insert: ${allRows.length}`);
  console.log('  Bulk inserting...');

  await bulkInsert(allRows);

  console.log('  Recalculating place averages...');
  await recalculateAverages();

  // Final count from DB to confirm
  const result = await db.query('SELECT COUNT(*) FROM user_interactions');
  console.log(`\nDone! ${result.rows[0].count} total interactions in database.`);
  console.log('All test account password: password123');

  await db.end();
}

run().catch(err => {
  console.error('Seed script crashed:', err);
  process.exit(1);
});
