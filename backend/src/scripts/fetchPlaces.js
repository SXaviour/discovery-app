// One time script to pull activity & experience places from Google and save them to the database
// Run with: npm run fetch-places
// Safe to re-run — duplicate places are automatically skipped

require('dotenv').config();
const db = require('../config/database');

const API_KEY  = process.env.GOOGLE_API_KEY;
const SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';
const PHOTO_BASE  = 'https://places.googleapis.com/v1';

// Each entry is one Google text search. category, subcategory and tags are assigned
// at the query level, we don't rely on Google's type labels for our taxonomy.
const SEARCHES = [

  // INDOOR ACTIVITIES
  { query: 'escape rooms in Dublin Ireland',         city: 'Dublin', category: 'indoor_activity', subcategory: 'puzzle_challenge',     tags: ['escape room', 'puzzle', 'group activity', 'date night'],                              pages: 2 },
  { query: 'laser tag Dublin Ireland',               city: 'Dublin', category: 'indoor_activity', subcategory: 'games_play',           tags: ['laser tag', 'group activity', 'high energy'],                                         pages: 1 },
  { query: 'bowling alleys Dublin Ireland',          city: 'Dublin', category: 'indoor_activity', subcategory: 'social_fun',           tags: ['bowling', 'group activity', 'date night', 'birthday activity'],                        pages: 1 },
  { query: 'VR gaming Dublin Ireland',               city: 'Dublin', category: 'indoor_activity', subcategory: 'digital_immersive',    tags: ['VR gaming', 'immersive', 'date night'],                                               pages: 1 },
  { query: 'board game cafe Dublin Ireland',         city: 'Dublin', category: 'indoor_activity', subcategory: 'chill_indoor',         tags: ['board games', 'chill', 'date night', 'group activity'],                               pages: 1 },
  { query: 'karaoke Dublin Ireland',                 city: 'Dublin', category: 'indoor_activity', subcategory: 'social_fun',           tags: ['karaoke', 'group activity', 'birthday activity', 'date night'],                        pages: 1 },
  { query: 'comedy clubs Dublin Ireland',            city: 'Dublin', category: 'indoor_activity', subcategory: 'entertainment_space',  tags: ['comedy', 'live entertainment', 'date night', 'group activity'],                        pages: 1 },
  { query: 'arcades Dublin Ireland',                 city: 'Dublin', category: 'indoor_activity', subcategory: 'games_play',           tags: ['arcade', 'retro arcade', 'group activity'],                                           pages: 1 },
  { query: 'cinema Dublin Ireland',                  city: 'Dublin', category: 'indoor_activity', subcategory: 'entertainment_space',  tags: ['cinema', 'date night', 'chill'],                                                      pages: 2 },
  { query: 'darts bar Dublin Ireland',               city: 'Dublin', category: 'indoor_activity', subcategory: 'games_play',           tags: ['darts', 'social gaming', 'group activity', 'date night'],                             pages: 1 },
  { query: 'pool billiards hall Dublin Ireland',     city: 'Dublin', category: 'indoor_activity', subcategory: 'games_play',           tags: ['pool', 'billiards', 'group activity', 'date night'],                                  pages: 1 },
  { query: 'indoor golf Dublin Ireland',             city: 'Dublin', category: 'indoor_activity', subcategory: 'social_fun',           tags: ['mini golf', 'group activity', 'date night', 'birthday activity'],                     pages: 1 },
  { query: 'table tennis ping pong Dublin Ireland',  city: 'Dublin', category: 'indoor_activity', subcategory: 'games_play',           tags: ['table tennis', 'ping pong', 'group activity', 'date night'],                         pages: 1 },
  { query: 'skating rink Dublin Ireland',            city: 'Dublin', category: 'indoor_activity', subcategory: 'social_fun',           tags: ['skating', 'ice skating', 'roller skating', 'group activity', 'date night', 'birthday activity'], pages: 1 },
  { query: 'racing simulator Dublin Ireland',        city: 'Dublin', category: 'indoor_activity', subcategory: 'digital_immersive',    tags: ['racing simulator', 'sim racing', 'immersive', 'date night', 'group activity'],       pages: 1 },

  // OUTDOOR ACTIVITIES
  { query: 'hiking trails Dublin Ireland',           city: 'Dublin', category: 'outdoor_activity', subcategory: 'movement_exploration', tags: ['hiking', 'scenic routes', 'nature', 'solo adventure'],                               pages: 2 },
  { query: 'kayaking Dublin Ireland',                city: 'Dublin', category: 'outdoor_activity', subcategory: 'water_based',          tags: ['kayaking', 'water sports', 'group activity', 'adventure'],                           pages: 1 },
  { query: 'cycling routes Dublin Ireland',          city: 'Dublin', category: 'outdoor_activity', subcategory: 'active_outdoors',      tags: ['cycling', 'active', 'solo adventure'],                                               pages: 1 },
  { query: 'coastal walks Dublin Ireland',           city: 'Dublin', category: 'outdoor_activity', subcategory: 'movement_exploration', tags: ['coastal walk', 'scenic routes', 'chill', 'solo adventure'],                         pages: 1 },
  { query: 'paddleboarding Dublin Ireland',          city: 'Dublin', category: 'outdoor_activity', subcategory: 'water_based',          tags: ['paddleboarding', 'water sports', 'date night'],                                      pages: 1 },
  { query: 'wild swimming Dublin Ireland',           city: 'Dublin', category: 'outdoor_activity', subcategory: 'water_based',          tags: ['wild swimming', 'cold plunge', 'outdoor', 'solo adventure'],                        pages: 1 },
  { query: 'parks green spaces Dublin Ireland',      city: 'Dublin', category: 'outdoor_activity', subcategory: 'social_outdoors',      tags: ['park', 'picnic spot', 'chill', 'group hangout', 'green space'],                     pages: 2 },
  { query: 'surfing Dublin Ireland',                 city: 'Dublin', category: 'outdoor_activity', subcategory: 'water_based',          tags: ['surfing', 'water sports', 'group activity', 'adventure'],                           pages: 1 },
  { query: 'horse riding Dublin Ireland',            city: 'Dublin', category: 'outdoor_activity', subcategory: 'active_outdoors',      tags: ['horse riding', 'outdoor', 'unique', 'solo adventure'],                              pages: 1 },

  // UNIQUE EXPERIENCES
  { query: 'axe throwing Dublin Ireland',            city: 'Dublin', category: 'unique_experience', subcategory: 'high_energy',          tags: ['axe throwing', 'group activity', 'date night', 'high energy', 'birthday activity'], pages: 1 },
  { query: 'trampoline park Dublin Ireland',         city: 'Dublin', category: 'unique_experience', subcategory: 'high_energy',          tags: ['trampoline', 'birthday activity', 'group activity', 'high energy'],                pages: 1 },
  { query: 'rage room Dublin Ireland',               city: 'Dublin', category: 'unique_experience', subcategory: 'high_energy',          tags: ['rage room', 'smash room', 'high energy', 'group activity'],                        pages: 1 },
  { query: 'immersive theatre Dublin Ireland',       city: 'Dublin', category: 'unique_experience', subcategory: 'immersive_interactive', tags: ['immersive theatre', 'date night', 'unique', 'story-based'],                       pages: 1 },
  { query: 'pottery class Dublin Ireland',           city: 'Dublin', category: 'unique_experience', subcategory: 'creative_aesthetic',   tags: ['pottery', 'craft experience', 'date night', 'solo adventure'],                     pages: 1 },
  { query: 'art class Dublin Ireland',               city: 'Dublin', category: 'unique_experience', subcategory: 'creative_aesthetic',   tags: ['paint & sip', 'art jamming', 'date night', 'group activity'],                     pages: 1 },
  { query: 'cocktail masterclass Dublin Ireland',    city: 'Dublin', category: 'unique_experience', subcategory: 'creative_aesthetic',   tags: ['cocktail masterclass', 'date night', 'group activity'],                            pages: 1 },
  { query: 'float tank Dublin Ireland',              city: 'Dublin', category: 'unique_experience', subcategory: 'wellness_recovery',    tags: ['float tank', 'sensory deprivation', 'wellness', 'solo adventure'],                 pages: 1 },
  { query: 'photo booth studio Dublin Ireland',      city: 'Dublin', category: 'unique_experience', subcategory: 'social_media_driven',  tags: ['photo booth', 'group activity', 'birthday activity'],                              pages: 1 },
  { query: 'interactive museum Dublin Ireland',      city: 'Dublin', category: 'unique_experience', subcategory: 'immersive_interactive', tags: ['interactive museum', 'group activity', 'unique'],                                 pages: 1 },
  { query: 'spa wellness centre Dublin Ireland',     city: 'Dublin', category: 'unique_experience', subcategory: 'wellness_recovery',    tags: ['spa', 'wellness', 'date night', 'solo adventure'],                                 pages: 2 },
  { query: 'chocolate making workshop Dublin',       city: 'Dublin', category: 'unique_experience', subcategory: 'creative_aesthetic',   tags: ['chocolate making', 'craft experience', 'date night', 'group activity'],            pages: 1 },
  { query: 'sauna experience Dublin Ireland',        city: 'Dublin', category: 'unique_experience', subcategory: 'wellness_recovery',    tags: ['sauna', 'wellness', 'cold plunge', 'solo adventure'],                              pages: 1 },
  { query: 'aquarium Dublin Ireland',               city: 'Dublin', category: 'unique_experience', subcategory: 'immersive_interactive', tags: ['aquarium', 'nature', 'unique', 'group activity', 'family friendly'],               pages: 1 },

  // ADVENTURE
  { query: 'paintball Dublin Ireland',               city: 'Dublin', category: 'adventure', subcategory: 'high_energy',  tags: ['paintball', 'group activity', 'outdoor', 'high energy', 'birthday activity'],                      pages: 1 },
  { query: 'obstacle course Dublin Ireland',         city: 'Dublin', category: 'adventure', subcategory: 'high_energy',  tags: ['obstacle course', 'group activity', 'high energy', 'birthday activity'],          pages: 1 },
  { query: 'ninja warrior gym Dublin Ireland',      city: 'Dublin', category: 'adventure', subcategory: 'high_energy',  tags: ['ninja warrior', 'obstacle course', 'high energy', 'group activity'],              pages: 1 },
  { query: 'inflatable park Dublin Ireland',        city: 'Dublin', category: 'adventure', subcategory: 'high_energy',  tags: ['inflatable park', 'obstacle course', 'birthday activity', 'group activity'],     pages: 1 },
  { query: 'archery Dublin Ireland',                 city: 'Dublin', category: 'adventure', subcategory: 'skill_based',  tags: ['archery', 'skill-based', 'date night', 'group activity'],                                           pages: 1 },
  { query: 'shooting range Dublin Ireland',          city: 'Dublin', category: 'adventure', subcategory: 'skill_based',  tags: ['shooting range', 'skill-based', 'group activity'],                                                  pages: 1 },
  { query: 'rock climbing Dublin',                   city: 'Dublin', category: 'adventure', subcategory: 'skill_based',  tags: ['climbing', 'skill-based', 'solo adventure', 'group activity'],                                     pages: 1 },
  { query: 'coasteering Dublin Ireland',             city: 'Dublin', category: 'adventure', subcategory: 'high_energy',  tags: ['coasteering', 'outdoor', 'high energy', 'group activity', 'adventure'],                            pages: 1 },
  { query: 'go karting Dublin Ireland',              city: 'Dublin', category: 'adventure', subcategory: 'high_energy',  tags: ['go karting', 'racing', 'high energy', 'group activity', 'birthday activity', 'date night'],        pages: 1 },
  { query: 'zipline Dublin Ireland',                 city: 'Dublin', category: 'adventure', subcategory: 'high_energy',  tags: ['ziplining', 'zip line', 'outdoor', 'high energy', 'group activity', 'adventure'],                  pages: 1 },

  // SPORTS & FITNESS
  { query: 'padel courts Dublin Ireland',            city: 'Dublin', category: 'sports_fitness', subcategory: 'team_sports',       tags: ['padel', 'date night', 'group activity'],                                                  pages: 1 },
  { query: 'tennis courts Dublin Ireland',           city: 'Dublin', category: 'sports_fitness', subcategory: 'team_sports',       tags: ['tennis', 'date night', 'group activity'],                                                 pages: 1 },
  { query: 'football pitches Dublin Ireland',        city: 'Dublin', category: 'sports_fitness', subcategory: 'team_sports',       tags: ['football', 'soccer', 'group activity'],                                                  pages: 1 },
  { query: 'badminton courts Dublin Ireland',        city: 'Dublin', category: 'sports_fitness', subcategory: 'team_sports',       tags: ['badminton', 'group activity'],                                                            pages: 1 },
  { query: 'basketball courts Dublin Ireland',       city: 'Dublin', category: 'sports_fitness', subcategory: 'team_sports',       tags: ['basketball', 'group activity'],                                                           pages: 1 },
  { query: 'golf driving range Dublin Ireland',      city: 'Dublin', category: 'sports_fitness', subcategory: 'skill_based',       tags: ['golf', 'driving range', 'date night'],                                                   pages: 1 },
  { query: 'bouldering gym Dublin',                  city: 'Dublin', category: 'sports_fitness', subcategory: 'skill_based',       tags: ['bouldering', 'climbing', 'skill-based', 'solo adventure'],                              pages: 1 },
  { query: 'swimming pool leisure centre Dublin',    city: 'Dublin', category: 'sports_fitness', subcategory: 'team_sports',       tags: ['swimming', 'solo adventure', 'active'],                                                   pages: 1 },
];

// The fields we want back from Google
const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.rating',
  'places.userRatingCount',
  'places.priceLevel',
  'places.types',
  'places.photos',
  'places.regularOpeningHours',
  'places.internationalPhoneNumber',
  'places.websiteUri',
  'places.googleMapsUri',
  'nextPageToken',
].join(',');

// Maps Google's price level strings to our 1–4 number scale
const PRICE_MAP = {
  PRICE_LEVEL_FREE:           1,
  PRICE_LEVEL_INEXPENSIVE:    1,
  PRICE_LEVEL_MODERATE:       2,
  PRICE_LEVEL_EXPENSIVE:      3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function textSearch(query, pageToken = null) {
  const body = { textQuery: query, pageSize: 20 };
  if (pageToken) body.pageToken = pageToken;

  const res = await fetch(SEARCH_URL, {
    method: 'POST',
    headers: {
      'Content-Type':    'application/json',
      'X-Goog-Api-Key':  API_KEY,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify(body),
  });

  return res.json();
}

function buildPhotoUrl(photoName) {
  return `${PHOTO_BASE}/${photoName}/media?maxHeightPx=800&key=${API_KEY}&skipHttpRedirect=true`;
}

// Save one place to the database — category, subcategory and tags come from the search definition
async function savePlace(place, city, category, subcategory, tags) {
  const photoRef  = place.photos?.[0]?.name || null;
  const photoRefs = place.photos?.map(p => p.name) || [];
  const imageUrl  = photoRef ? buildPhotoUrl(photoRef) : null;

  const hoursRaw = place.regularOpeningHours?.weekdayDescriptions || null;
  const hours    = hoursRaw ? JSON.stringify(hoursRaw) : null;

  await db.query(`
    INSERT INTO places (
      google_place_id, name, city, category, subcategory, tags,
      address, latitude, longitude,
      phone, website, google_maps_url,
      google_rating, google_review_count,
      price_level, photo_reference, image_url, photos,
      hours, open_now
    ) VALUES (
      $1,$2,$3,$4,$5,$6,
      $7,$8,$9,
      $10,$11,$12,
      $13,$14,
      $15,$16,$17,$18,
      $19,$20
    )
    ON CONFLICT (google_place_id) DO UPDATE SET
      tags = ARRAY(SELECT DISTINCT unnest(array_cat(places.tags, EXCLUDED.tags)))
  `, [
    place.id,
    place.displayName?.text || null,
    city,
    category,
    subcategory,
    tags,
    place.formattedAddress || null,
    place.location?.latitude  || null,
    place.location?.longitude || null,
    place.internationalPhoneNumber || null,
    place.websiteUri    || null,
    place.googleMapsUri || null,
    place.rating           || null,
    place.userRatingCount  || 0,
    PRICE_MAP[place.priceLevel] || null,
    photoRef, imageUrl, photoRefs,
    hours,
    place.regularOpeningHours?.openNow ?? null,
  ]);
}
// Main script function — loops through all searches and saves results to the database
async function run() {
  console.log('Starting activity place fetch...\n');
  let total = 0;

  for (const search of SEARCHES) {
    console.log(`\n[${search.city}] ${search.category} / ${search.subcategory}...`);
    let pageToken   = null;
    let pagesFetched = 0;
    let count       = 0;

    do {
      if (pageToken) await sleep(2000);

      const data = await textSearch(search.query, pageToken);

      if (data.error) {
        console.error(`  API error: ${data.error.message}`);
        break;
      }

      const results = data.places || [];
      console.log(`  Page ${pagesFetched + 1}: ${results.length} places found`);

      for (const place of results) {
        try {
          await savePlace(place, search.city, search.category, search.subcategory, search.tags);
          count++;
          process.stdout.write(`\r  Saved ${count}...`);
        } catch (err) {
          console.error(`\n  Skipped "${place.displayName?.text}": ${err.message}`);
        }
      }

      pageToken = data.nextPageToken || null;
      pagesFetched++;
    } while (pageToken && pagesFetched < search.pages);

    console.log(`\n  Finished: ${count} places saved`);
    total += count;
  }

  console.log(`\nAll done! Total places saved: ${total}`);
  await db.end();
}

run().catch(err => {
  console.error('Script crashed:', err);
  process.exit(1);
});
