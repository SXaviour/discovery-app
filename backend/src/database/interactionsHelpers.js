// Database helper functions for user interactions (ratings, favorites, visited)

const db = require('../config/database');

// Add or update a rating for a place
// Uses a transaction so the rating save and average recalculation always happen together
async function upsertRating(userId, placeId, ratingValue) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // Insert the rating — if the user already rated this place, update it instead
    await client.query(`
      INSERT INTO user_interactions (user_id, place_id, interaction_type, rating_value)
      VALUES ($1, $2, 'rating', $3)
      ON CONFLICT (user_id, place_id, interaction_type)
      DO UPDATE SET rating_value = $3, created_at = NOW()
    `, [userId, placeId, ratingValue]);

    // Recalculate the average from all ratings for this place
    const avgResult = await client.query(`
      SELECT ROUND(AVG(rating_value)::NUMERIC, 2) as average, COUNT(*) as total
      FROM user_interactions
      WHERE place_id = $1 AND interaction_type = 'rating'
    `, [placeId]);

    // Update the place's average and total count
    await client.query(`
      UPDATE places SET average_rating = $1, total_ratings = $2 WHERE id = $3
    `, [avgResult.rows[0].average, avgResult.rows[0].total, placeId]);

    await client.query('COMMIT');
    return avgResult.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Remove a user's rating for a place and recalculate the average
async function deleteRating(userId, placeId) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const result = await client.query(`
      DELETE FROM user_interactions
      WHERE user_id = $1 AND place_id = $2 AND interaction_type = 'rating'
      RETURNING id
    `, [userId, placeId]);

    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    // Recalculate after removal — if no ratings left, reset to 0
    const avgResult = await client.query(`
      SELECT ROUND(AVG(rating_value)::NUMERIC, 2) as average, COUNT(*) as total
      FROM user_interactions
      WHERE place_id = $1 AND interaction_type = 'rating'
    `, [placeId]);

    await client.query(`
      UPDATE places SET average_rating = $1, total_ratings = $2 WHERE id = $3
    `, [avgResult.rows[0].average || 0, avgResult.rows[0].total, placeId]);

    await client.query('COMMIT');
    return true;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Toggle a favorite or visited interaction on/off
// Returns whether the interaction is now active or removed
async function toggleInteraction(userId, placeId, type) {
  const existing = await db.query(`
    SELECT id FROM user_interactions
    WHERE user_id = $1 AND place_id = $2 AND interaction_type = $3
  `, [userId, placeId, type]);

  if (existing.rows.length > 0) {
    await db.query(`
      DELETE FROM user_interactions
      WHERE user_id = $1 AND place_id = $2 AND interaction_type = $3
    `, [userId, placeId, type]);
    return { active: false };
  } else {
    await db.query(`
      INSERT INTO user_interactions (user_id, place_id, interaction_type)
      VALUES ($1, $2, $3)
    `, [userId, placeId, type]);
    return { active: true };
  }
}

// Get all interactions for a user, grouped by type
async function getUserInteractions(userId) {
  const result = await db.query(`
    SELECT
      ui.id, ui.interaction_type, ui.rating_value, ui.created_at,
      p.id as place_id, p.name, p.city, p.category, p.image_url,
      p.average_rating, p.google_rating, p.price_level
    FROM user_interactions ui
    JOIN places p ON ui.place_id = p.id
    WHERE ui.user_id = $1
    ORDER BY ui.created_at DESC
  `, [userId]);
  return result.rows;
}

// Get only favorites or only visited places for a user
async function getUserInteractionsByType(userId, type) {
  const result = await db.query(`
    SELECT
      ui.id, ui.interaction_type, ui.created_at,
      p.id as place_id, p.name, p.city, p.category, p.subcategory,
      p.address, p.image_url, p.average_rating, p.google_rating, p.price_level
    FROM user_interactions ui
    JOIN places p ON ui.place_id = p.id
    WHERE ui.user_id = $1 AND ui.interaction_type = $2
    ORDER BY ui.created_at DESC
  `, [userId, type]);
  return result.rows;
}

// Get all of a user's interactions with one specific place
// Used by the frontend to know which buttons (favorite, visited, rating) to show as active
async function getUserPlaceInteractions(userId, placeId) {
  const result = await db.query(`
    SELECT interaction_type, rating_value
    FROM user_interactions
    WHERE user_id = $1 AND place_id = $2
  `, [userId, placeId]);
  return result.rows;
}

module.exports = {
  upsertRating,
  deleteRating,
  toggleInteraction,
  getUserInteractions,
  getUserInteractionsByType,
  getUserPlaceInteractions,
};
