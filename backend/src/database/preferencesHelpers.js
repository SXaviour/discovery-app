// Database helpers for reading and saving user preferences

const db = require('../config/database');

// Get preferences for a user — returns null if they haven't set any yet
async function getPreferences(userId) {
  const result = await db.query(
    'SELECT * FROM user_preferences WHERE user_id = $1',
    [userId]
  );
  return result.rows[0] || null;
}

// Save or update a user's preferences
// Uses upsert so it works whether the user has preferences saved already or not
async function upsertPreferences(userId, { preferred_categories, preferred_price_range, interests, default_city }) {
  const result = await db.query(`
    INSERT INTO user_preferences (user_id, preferred_categories, preferred_price_range, interests, default_city, updated_at)
    VALUES ($1, $2, $3, $4, $5, NOW())
    ON CONFLICT (user_id)
    DO UPDATE SET
      preferred_categories  = COALESCE($2, user_preferences.preferred_categories),
      preferred_price_range = COALESCE($3, user_preferences.preferred_price_range),
      interests             = COALESCE($4, user_preferences.interests),
      default_city          = COALESCE($5, user_preferences.default_city),
      updated_at            = NOW()
    RETURNING *
  `, [
    userId,
    preferred_categories  ? JSON.stringify(preferred_categories)  : null,
    preferred_price_range ? JSON.stringify(preferred_price_range) : null,
    interests || null,
    default_city || null,
  ]);
  return result.rows[0];
}

module.exports = { getPreferences, upsertPreferences };
