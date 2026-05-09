// One-time script to populate image_url with stable Google CDN URLs
// The old image_url values were built with a double 'places/places/' bug and expired anyway
// This calls the Google photo media endpoint for each place to get the real CDN photoUri
// Run with: npm run update-images

require('dotenv').config();
const db = require('../config/database');

const API_KEY   = process.env.GOOGLE_API_KEY;
const DELAY_MS  = 50; // small delay between requests to stay within rate limits

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getCdnUrl(photoReference) {
  const url = `https://places.googleapis.com/v1/${photoReference}/media?maxHeightPx=800&key=${API_KEY}&skipHttpRedirect=true`;
  const res  = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  return data.photoUri || null;
}

async function run() {
  const result = await db.query(
    'SELECT id, name, photo_reference FROM places WHERE photo_reference IS NOT NULL AND is_closed = false'
  );
  const places = result.rows;
  console.log(`Updating image URLs for ${places.length} places...\n`);

  let updated = 0;
  let failed  = 0;

  for (const place of places) {
    try {
      const cdnUrl = await getCdnUrl(place.photo_reference);
      if (cdnUrl) {
        await db.query('UPDATE places SET image_url = $1 WHERE id = $2', [cdnUrl, place.id]);
        updated++;
        process.stdout.write(`\r  Updated ${updated} / ${places.length}`);
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
    await sleep(DELAY_MS);
  }

  console.log(`\n\nDone. ${updated} updated, ${failed} failed.`);
  await db.end();
}

run().catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});
