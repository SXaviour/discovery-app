// One-time script to pull places from Google and save them to the database
// Run with: node src/scripts/fetchPlaces.js
// Safe to re-run — duplicate places are automatically skipped

require('dotenv').config();
const db = require('../config/database');

const API_KEY = process.env.GOOGLE_API_KEY;
const BASE_URL = 'https://places.googleapis.com/v1/places';

// Every search we want to run, each one fetches places for one city + category combo
// pages controls how many pages of results to fetch (each page = up to 20 places)
const SEARCHES = [
  // Dublin 
  { query: 'restaurants cafes in Dublin Ireland',             city: 'Dublin',    category: 'restaurant',    pages: 3 },
  { query: 'bars pubs nightlife in Dublin Ireland',           city: 'Dublin',    category: 'bar',           pages: 3 },
  { query: 'museums art galleries in Dublin Ireland',         city: 'Dublin',    category: 'museum',        pages: 3 },
  { query: 'parks gardens in Dublin Ireland',                 city: 'Dublin',    category: 'park',          pages: 3 },
  { query: 'entertainment theaters cinemas in Dublin',        city: 'Dublin',    category: 'entertainment', pages: 3 },
  { query: 'shopping malls markets stores in Dublin',         city: 'Dublin',    category: 'shopping',      pages: 3 },
  { query: 'tourist attractions landmarks in Dublin Ireland', city: 'Dublin',    category: 'attraction',    pages: 3 },

  // Lanzarote
  { query: 'restaurants in Lanzarote Spain',                  city: 'Lanzarote', category: 'restaurant',    pages: 1 },
  { query: 'bars nightlife in Lanzarote Spain',               city: 'Lanzarote', category: 'bar',           pages: 1 },
  { query: 'museums in Lanzarote Spain',                      city: 'Lanzarote', category: 'museum',        pages: 1 },
  { query: 'parks beaches in Lanzarote Spain',                city: 'Lanzarote', category: 'park',          pages: 1 },
  { query: 'entertainment in Lanzarote Spain',                city: 'Lanzarote', category: 'entertainment', pages: 1 },
  { query: 'shopping in Lanzarote Spain',                     city: 'Lanzarote', category: 'shopping',      pages: 1 },
  { query: 'tourist attractions in Lanzarote Spain',          city: 'Lanzarote', category: 'attraction',    pages: 1 },

  // Paris
  { query: 'restaurants cafes bistros in Paris France',       city: 'Paris',     category: 'restaurant',    pages: 2 },
  { query: 'bars wine bars nightlife in Paris France',        city: 'Paris',     category: 'bar',           pages: 2 },
  { query: 'museums art galleries in Paris France',           city: 'Paris',     category: 'museum',        pages: 2 },
  { query: 'parks gardens in Paris France',                   city: 'Paris',     category: 'park',          pages: 1 },
  { query: 'entertainment theaters cinemas in Paris France',  city: 'Paris',     category: 'entertainment', pages: 1 },
  { query: 'shopping malls markets boutiques in Paris',       city: 'Paris',     category: 'shopping',      pages: 2 },
  { query: 'tourist attractions landmarks in Paris France',   city: 'Paris',     category: 'attraction',    pages: 2 },

  // Amsterdam
  { query: 'restaurants cafes in Amsterdam Netherlands',      city: 'Amsterdam', category: 'restaurant',    pages: 2 },
  { query: 'bars pubs nightlife in Amsterdam Netherlands',    city: 'Amsterdam', category: 'bar',           pages: 2 },
  { query: 'museums galleries in Amsterdam Netherlands',      city: 'Amsterdam', category: 'museum',        pages: 1 },
  { query: 'parks gardens in Amsterdam Netherlands',          city: 'Amsterdam', category: 'park',          pages: 1 },
  { query: 'entertainment theaters cinemas in Amsterdam',     city: 'Amsterdam', category: 'entertainment', pages: 1 },
  { query: 'shopping markets stores in Amsterdam Netherlands',city: 'Amsterdam', category: 'shopping',      pages: 1 },
  { query: 'tourist attractions landmarks in Amsterdam',      city: 'Amsterdam', category: 'attraction',    pages: 2 },
];

// The fields we want back from Google — requesting them all here avoids a separate details call per place
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

// Maps Google's type labels to a subcategory we store ourselves
const TYPE_MAP = {
  cafe: 'cafe', bakery: 'bakery',
  bar: 'bar', night_club: 'nightclub',
  museum: 'museum', art_gallery: 'gallery',
  park: 'park', natural_feature: 'nature', campground: 'outdoor',
  movie_theater: 'cinema', amusement_park: 'amusement', bowling_alley: 'bowling',
  shopping_mall: 'mall', clothing_store: 'clothing', store: 'store',
  tourist_attraction: 'attraction', point_of_interest: 'landmark',
};

function getSubcategory(types = []) {
  for (const type of types) {
    if (TYPE_MAP[type]) return TYPE_MAP[type];
  }
  return null;
}

// Pause execution — needed between paginated requests (Google requires a short delay)
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Fetch one page of results from the Places API (New)
async function textSearch(query, pageToken = null) {
  const body = { textQuery: query, pageSize: 20 };
  if (pageToken) body.pageToken = pageToken;

  const res = await fetch(`${BASE_URL}:searchText`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify(body),
  });

  return res.json();
}

// Build the URL to display a place photo from Google
function buildPhotoUrl(photoName) {
  return `${BASE_URL}/${photoName}/media?maxHeightPx=800&key=${API_KEY}&skipHttpRedirect=true`;
}

// Save one place to the database
async function savePlace(place, city, category) {
  const photoRef  = place.photos?.[0]?.name || null;
  const photoRefs = place.photos?.map(p => p.name) || [];
  const imageUrl  = photoRef ? buildPhotoUrl(photoRef) : null;

  // weekday_text gives human-readable hours like "Monday: 9:00 AM – 10:00 PM"
  // JSON.stringify is needed because the hours column is JSONB — pg won't auto-convert a JS array for it
  const hoursRaw = place.regularOpeningHours?.weekdayDescriptions || null;
  const hours = hoursRaw ? JSON.stringify(hoursRaw) : null;

  await db.query(`
    INSERT INTO places (
      google_place_id, name, city, category, subcategory,
      address, latitude, longitude,
      phone, website, google_maps_url,
      google_rating, google_review_count,
      price_level, photo_reference, image_url, photos,
      hours, open_now
    ) VALUES (
      $1,$2,$3,$4,$5,
      $6,$7,$8,
      $9,$10,$11,
      $12,$13,
      $14,$15,$16,$17,
      $18,$19
    )
    ON CONFLICT (google_place_id) DO NOTHING
  `, [
    place.id,
    place.displayName?.text || null,
    city,
    category,
    getSubcategory(place.types),
    place.formattedAddress || null,
    place.location?.latitude  || null,
    place.location?.longitude || null,
    place.internationalPhoneNumber || null,
    place.websiteUri   || null,
    place.googleMapsUri || null,
    place.rating       || null,
    place.userRatingCount || 0,
    PRICE_MAP[place.priceLevel] || null,
    photoRef, imageUrl, photoRefs,
    hours,
    place.regularOpeningHours?.openNow ?? null,
  ]);
}

// Main function — loops through every search and saves the results
async function run() {
  console.log('Starting place fetch...\n');
  let total = 0;

  for (const search of SEARCHES) {
    console.log(`\n[${search.city}] ${search.category}...`);
    let pageToken = null;
    let pagesFetched = 0;
    let count = 0;

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
          await savePlace(place, search.city, search.category);
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
