// Fetches a description for every place in the database that doesn't have one yet
// Run with: npm run enrich-descriptions
// Safe to re-run, only places with a null description are processed

require('dotenv').config();
const db = require('../config/database');

const API_KEY = process.env.GOOGLE_API_KEY;
const BASE_URL = 'https://places.googleapis.com/v1/places';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchDescription(googlePlaceId) {
  const res = await fetch(`${BASE_URL}/${googlePlaceId}`, {
    headers: {
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': 'editorialSummary',
    },
  });

  const data = await res.json();
  return data.editorialSummary?.text || null;
}

async function updateDescription(id, description) {
  await db.query(
    'UPDATE places SET description = $1 WHERE id = $2',
    [description, id]
  );
}

async function run() {
  const result = await db.query(
    'SELECT id, name, google_place_id FROM places WHERE description IS NULL AND google_place_id IS NOT NULL ORDER BY id'
  );

  const places = result.rows;
  console.log(`Found ${places.length} places without a description\n`);

  let updated = 0;
  let skipped = 0;

  for (const place of places) {
    try {
      const description = await fetchDescription(place.google_place_id);

      if (description) {
        await updateDescription(place.id, description);
        updated++;
        process.stdout.write(`\r  Updated ${updated}, skipped ${skipped}...`);
      } else {
        skipped++;
      }

      await sleep(80);
    } catch (err) {
      console.error(`\n  Failed for "${place.name}": ${err.message}`);
    }
  }

  console.log(`\n\nDone! ${updated} descriptions added, ${skipped} places had none available`);
  await db.end();
}

run().catch(err => {
  console.error('Script crashed:', err);
  process.exit(1);
});
