// Database helper functions for the places table

const db = require('../config/database');

// Get all places with optional filters. Supports multi-value category/price arrays,
// tag overlap filtering, and text search. Returns places and total for pagination.

async function getPlaces({
  city, categories, price_levels, min_rating, tags, search, subcategory,
  category, price_level,
  limit = 20, offset = 0, random = false,
} = {}) {
  const conditions = ['is_closed = false'];
  const values = [];
  let i = 1;

  // Merge singular legacy params into their array equivalents
  const cats   = categories  || (category    ? [category]    : null);
  const prices = price_levels || (price_level ? [price_level] : null);

  if (city)                     { conditions.push(`city = $${i++}`);                    values.push(city); }
  if (cats?.length)             { conditions.push(`category = ANY($${i++}::text[])`);   values.push(cats); }
  if (prices?.length)           { conditions.push(`price_level = ANY($${i++}::int[])`); values.push(prices.map(Number)); }
  if (min_rating != null)       { conditions.push(`google_rating >= $${i++}`);           values.push(min_rating); }
  if (tags?.length)             { conditions.push(`tags && $${i++}::text[]`);            values.push(tags); }
  if (subcategory)              { conditions.push(`subcategory = $${i++}`);              values.push(subcategory); }
  if (search) {
    const p = `$${i++}`;
    conditions.push(`(name ILIKE ${p} OR description ILIKE ${p} OR EXISTS (SELECT 1 FROM unnest(tags) t WHERE t ILIKE ${p}))`);
    values.push(`%${search}%`);
  }

  values.push(limit, offset);

  const result = await db.query(`
    SELECT id, name, city, category, subcategory, tags, address,
           latitude, longitude, google_rating, google_review_count,
           average_rating, total_ratings, price_level, image_url, description,
           COUNT(*) OVER() AS total_count
    FROM places
    WHERE ${conditions.join(' AND ')}
    ORDER BY ${random ? 'RANDOM()' : 'google_review_count DESC NULLS LAST'}
    LIMIT $${i++} OFFSET $${i++}
  `, values);

  return {
    places: result.rows,
    total:  parseInt(result.rows[0]?.total_count || 0),
  };
}

// Get a single place by its ID, including all details
async function getPlaceById(id) {
  const result = await db.query(
    'SELECT * FROM places WHERE id = $1 AND is_closed = false',
    [id]
  );
  return result.rows[0] || null;
}

// Get a quick count of how many places are stored per city and category
async function getPlaceStats() {
  const result = await db.query(`
    SELECT city, category, COUNT(*) as count
    FROM places
    WHERE is_closed = false
    GROUP BY city, category
    ORDER BY city, category
  `);
  return result.rows;
}

module.exports = { getPlaces, getPlaceById, getPlaceStats };
