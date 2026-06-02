// Generates a large realistic interaction dataset for ML model training
// Targets 50,000 interactions across 200 users
// Uses bulk inserts for speed 
// Run with: npm run seed-interactions

require('dotenv').config();
const bcrypt = require('bcrypt');
const db = require('../config/database');
const { createUser, emailExists } = require('../database/helpers');

const USER_COUNT       = 200;
const DRIFT_PROBABILITY = 0.15; // 15% chance a user tries something outside their profile
const SECONDARY_SCALE   = 0.30; // Secondary profile interactions are 30% of primary volume

// NAME POOL
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
  'adventurer',
  'gamer',
  'outdoorsy',
  'creative',
  'athlete',
  'mixed',
];

// Helpers
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN(arr, n) {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, Math.min(n, arr.length));
}

function scale(base) {
  return Math.floor(base * (0.7 + Math.random() * 0.7));
}

//  GENERATE USER LIST 
// Each user has a PRIMARY profile (dominant taste) and a SECONDARY profile (30%)
// This creates multi-interest users
const TEST_USERS = Array.from({ length: USER_COUNT }).map((_, i) => {
  const first     = pick(FIRST_NAMES);
  const last      = pick(LAST_NAMES);
  const primary   = pick(PROFILES);
  const secondary = pick(PROFILES.filter(p => p !== primary));
  return {
    email:     `${first}.${last}.${i}@seeded.dev`,
    username:  `${first}_${last}${i}`,
    primary,
    secondary,
  };
});

// FETCH ALL PLACES ONCE 
async function getAllPlaces() {
  const res = await db.query('SELECT id, category, subcategory, price_level, city FROM places WHERE is_closed = false');
  return res.rows;
}

// PROFILE INTERACTION BUILDER 
// Builds the raw interactions for a single profile at a given scale multiplier
function getProfileRaw(profile, by, mult) {
  const s = base => Math.max(0, Math.floor(base * mult * (0.7 + Math.random() * 0.7)));

  if (profile === 'adventurer') {
    return [
      ...pickN(by.adventure,         s(55)).map(p => ({ placeId: p.id, type: 'rating',   value: pick([4,4,5]) })),
      ...pickN(by.adventure,         s(25)).map(p => ({ placeId: p.id, type: 'favorite' })),
      ...pickN(by.high_energy,       s(30)).map(p => ({ placeId: p.id, type: 'visited' })),
      ...pickN(by.unique_experience, s(20)).map(p => ({ placeId: p.id, type: 'rating',   value: pick([3,4,5]) })),
      ...pickN(by.outdoor_activity,  s(20)).map(p => ({ placeId: p.id, type: 'visited' })),
      ...pickN(by.wellness,          s(6)).map(p  => ({ placeId: p.id, type: 'rating',   value: pick([1,2]) })),
    ];
  }

  if (profile === 'gamer') {
    return [
      ...pickN(by.games,             s(60)).map(p => ({ placeId: p.id, type: 'rating',   value: pick([4,4,5]) })),
      ...pickN(by.games,             s(30)).map(p => ({ placeId: p.id, type: 'favorite' })),
      ...pickN(by.puzzle,            s(40)).map(p => ({ placeId: p.id, type: 'rating',   value: pick([4,5]) })),
      ...pickN(by.immersive,         s(25)).map(p => ({ placeId: p.id, type: 'visited' })),
      ...pickN(by.indoor_activity,   s(20)).map(p => ({ placeId: p.id, type: 'visited' })),
      ...pickN(by.outdoor_activity,  s(8)).map(p  => ({ placeId: p.id, type: 'rating',   value: pick([1,2]) })),
    ];
  }

  if (profile === 'outdoorsy') {
    return [
      ...pickN(by.outdoor_activity,  s(60)).map(p => ({ placeId: p.id, type: 'rating',   value: pick([4,4,5]) })),
      ...pickN(by.outdoor_activity,  s(35)).map(p => ({ placeId: p.id, type: 'favorite' })),
      ...pickN(by.water,             s(30)).map(p => ({ placeId: p.id, type: 'visited' })),
      ...pickN(by.sports_fitness,    s(20)).map(p => ({ placeId: p.id, type: 'visited' })),
      ...pickN(by.adventure,         s(15)).map(p => ({ placeId: p.id, type: 'rating',   value: pick([3,4]) })),
      ...pickN(by.games,             s(8)).map(p  => ({ placeId: p.id, type: 'rating',   value: pick([1,2]) })),
    ];
  }

  if (profile === 'creative') {
    return [
      ...pickN(by.creative,          s(55)).map(p => ({ placeId: p.id, type: 'rating',   value: pick([4,5]) })),
      ...pickN(by.creative,          s(30)).map(p => ({ placeId: p.id, type: 'favorite' })),
      ...pickN(by.wellness,          s(35)).map(p => ({ placeId: p.id, type: 'rating',   value: pick([4,5]) })),
      ...pickN(by.unique_experience, s(25)).map(p => ({ placeId: p.id, type: 'visited' })),
      ...pickN(by.immersive,         s(15)).map(p => ({ placeId: p.id, type: 'visited' })),
      ...pickN(by.high_energy,       s(8)).map(p  => ({ placeId: p.id, type: 'rating',   value: pick([1,2]) })),
    ];
  }

  if (profile === 'athlete') {
    return [
      ...pickN(by.sports_fitness,    s(60)).map(p => ({ placeId: p.id, type: 'rating',   value: pick([4,4,5]) })),
      ...pickN(by.sports_fitness,    s(30)).map(p => ({ placeId: p.id, type: 'favorite' })),
      ...pickN(by.skills,            s(35)).map(p => ({ placeId: p.id, type: 'visited' })),
      ...pickN(by.team,              s(25)).map(p => ({ placeId: p.id, type: 'rating',   value: pick([3,4,5]) })),
      ...pickN(by.outdoor_activity,  s(20)).map(p => ({ placeId: p.id, type: 'visited' })),
      ...pickN(by.creative,          s(8)).map(p  => ({ placeId: p.id, type: 'rating',   value: pick([1,2]) })),
    ];
  }

  // mixed
  return [
    ...pickN(by.indoor_activity,   s(20)).map(p => ({ placeId: p.id, type: 'rating',   value: pick([2,3,4,5]) })),
    ...pickN(by.outdoor_activity,  s(18)).map(p => ({ placeId: p.id, type: 'rating',   value: pick([2,3,4,5]) })),
    ...pickN(by.unique_experience, s(18)).map(p => ({ placeId: p.id, type: 'favorite' })),
    ...pickN(by.adventure,         s(15)).map(p => ({ placeId: p.id, type: 'visited' })),
    ...pickN(by.sports_fitness,    s(12)).map(p => ({ placeId: p.id, type: 'rating',   value: pick([3,4]) })),
    ...pickN(by.creative,          s(10)).map(p => ({ placeId: p.id, type: 'visited' })),
  ];
}

// Maps each profile to the categories it primarily engages with
const PRIMARY_CATS = {
  adventurer: ['adventure', 'unique_experience'],
  gamer:      ['indoor_activity'],
  outdoorsy:  ['outdoor_activity'],
  creative:   ['unique_experience'],
  athlete:    ['sports_fitness'],
  mixed:      ['indoor_activity', 'outdoor_activity', 'unique_experience', 'adventure', 'sports_fitness'],
};

// BUILD INTERACTIONS FOR ONE USER 
function buildInteractions(primary, secondary, places) {
  const by = {
    indoor_activity:    places.filter(p => p.category === 'indoor_activity'),
    outdoor_activity:   places.filter(p => p.category === 'outdoor_activity'),
    unique_experience:  places.filter(p => p.category === 'unique_experience'),
    adventure:          places.filter(p => p.category === 'adventure'),
    sports_fitness:     places.filter(p => p.category === 'sports_fitness'),
    puzzle:             places.filter(p => p.subcategory === 'puzzle_challenge'),
    games:              places.filter(p => p.subcategory === 'games_play'),
    immersive:          places.filter(p => p.subcategory === 'digital_immersive' || p.subcategory === 'immersive_interactive'),
    creative:           places.filter(p => p.subcategory === 'creative_aesthetic'),
    wellness:           places.filter(p => p.subcategory === 'wellness_recovery'),
    water:              places.filter(p => p.subcategory === 'water_based'),
    skills:             places.filter(p => p.subcategory === 'skill_based'),
    team:               places.filter(p => p.subcategory === 'team_sports'),
    high_energy:        places.filter(p => p.subcategory === 'high_energy'),
  };

  const cities     = [...new Set(places.map(p => p.city))];
  const homeCity   = pick(cities);
  const homePlaces = places.filter(p => p.city === homeCity);

  // Primary profile at full scale + secondary at 30% — creates multi-interest users
  let raw = [
    ...getProfileRaw(primary,   by, 1.0),
    ...getProfileRaw(secondary, by, SECONDARY_SCALE),
  ];

  // Home city bias — everyone interacts more with places near them
  raw.push(
    ...pickN(homePlaces, scale(40)).map(p => ({ placeId: p.id, type: 'visited' }))
  );

  // Noise — small amount of random ratings to simulate real-world messiness
  const allCats       = [...new Set([...(PRIMARY_CATS[primary] || []), ...(PRIMARY_CATS[secondary] || [])])];
  const primaryPlaces = places.filter(p => allCats.includes(p.category));
  const noiseCount    = scale(10);
  raw.push(
    ...pickN(primaryPlaces,       Math.floor(noiseCount * 0.7)).map(p => ({ placeId: p.id, type: 'rating', value: pick([1,2,3,4,5]) })),
    ...pickN(places, noiseCount - Math.floor(noiseCount * 0.7)).map(p => ({ placeId: p.id, type: 'rating', value: pick([1,2,3,4,5]) }))
  );

  // Probabilistic drift — users occasionally explore outside their comfort zone
  // Real humans try things because of friends, a date, or just curiosity
  const interactedIds = new Set(raw.map(i => i.placeId));
  const outsidePlaces = places.filter(p => !allCats.includes(p.category) && !interactedIds.has(p.id));
  for (const place of outsidePlaces) {
    if (Math.random() < DRIFT_PROBABILITY) {
      raw.push({ placeId: place.id, type: 'rating', value: pick([2, 3, 3, 4]) });
    }
  }

  // Deduplicate — same user can't have the same interaction type for the same place twice
  const seen = new Set();
  return raw.filter(i => {
    const key = `${i.placeId}-${i.type}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// BULK INSERT 
async function bulkInsert(rows) {
  if (rows.length === 0) return;

  const CHUNK = 2000;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);

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

async function run() {
  console.log(`Seeding ${USER_COUNT} users with multi-interest profiles + drift...\n`);

  const password = 'password123';
  const hash     = await bcrypt.hash(password, 10);
  const places   = await getAllPlaces();

  console.log(`  Loaded ${places.length} places from database\n`);

  if (places.length === 0) {
    console.error('No places found — run fetch-places first.');
    await db.end();
    return;
  }

  const allRows = [];

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

    const interactions = buildInteractions(user.primary, user.secondary, places);
    interactions.forEach(i => allRows.push({ userId, ...i }));

    process.stdout.write(`\r  Built interactions for ${allRows.length} rows so far...`);
  }

  console.log(`\n\n  Total interactions to insert: ${allRows.length}`);
  console.log('  Bulk inserting...');

  await bulkInsert(allRows);

  console.log('  Recalculating place averages...');
  await recalculateAverages();

  const result = await db.query('SELECT COUNT(*) FROM user_interactions');
  console.log(`\nDone! ${result.rows[0].count} total interactions in database.`);
  console.log('All test account password: password123');

  await db.end();
}

run().catch(err => {
  console.error('Seed script crashed:', err);
  process.exit(1);
});
