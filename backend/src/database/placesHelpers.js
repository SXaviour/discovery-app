// Database helper functions for the places table

const db = require('../config/database');

// Get all places, with optional filters for city, category, price level, and review count range
async function getPlaces({ city, category, price_level, min_review_count, max_review_count, min_rating, limit = 50, offset = 0 } = {}) {
  const conditions = ['is_closed = false'];
  const values = [];
  let i = 1;

  if (city)              { conditions.push(`city = $${i++}`);                values.push(city); }
  if (category)          { conditions.push(`category = $${i++}`);            values.push(category); }
  if (price_level)       { conditions.push(`price_level = $${i++}`);         values.push(price_level); }
  if (min_review_count != null) { conditions.push(`google_review_count >= $${i++}`); values.push(min_review_count); }
  if (max_review_count != null) { conditions.push(`google_review_count < $${i++}`);  values.push(max_review_count); }
  if (min_rating != null)       { conditions.push(`google_rating >= $${i++}`);       values.push(min_rating); }

  // When fetching hidden gems (by review count range), sort by rating so best ones come first
  const orderBy = (min_review_count != null || max_review_count != null)
    ? 'google_rating DESC NULLS LAST'
    : 'google_review_count DESC NULLS LAST';

  values.push(limit, offset);

  const result = await db.query(`
    SELECT id, name, city, category, subcategory, tags, address,
           latitude, longitude, google_rating, google_review_count,
           average_rating, total_ratings, price_level, image_url, description
    FROM places
    WHERE ${conditions.join(' AND ')}
    ORDER BY ${orderBy}
    LIMIT $${i++} OFFSET $${i++}
  `, values);

  return result.rows;
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
