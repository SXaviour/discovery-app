const db = require('../config/database');

async function createCollection(userId, name, description) {
  const result = await db.query(
    'INSERT INTO collections (user_id, name, description) VALUES ($1, $2, $3) RETURNING *',
    [userId, name, description || null]
  );
  return result.rows[0];
}

async function getUserCollections(userId) {
  const result = await db.query(`
    SELECT
      c.id, c.name, c.description, c.created_at,
      COUNT(cp.place_id)::int AS place_count,
      (
        SELECT p.image_url FROM places p
        JOIN collection_places cp2 ON cp2.place_id = p.id
        WHERE cp2.collection_id = c.id AND p.image_url IS NOT NULL
        ORDER BY cp2.added_at DESC LIMIT 1
      ) AS cover_image
    FROM collections c
    LEFT JOIN collection_places cp ON cp.collection_id = c.id
    WHERE c.user_id = $1
    GROUP BY c.id
    ORDER BY c.created_at DESC
  `, [userId]);
  return result.rows;
}

async function getCollectionWithPlaces(collectionId, userId) {
  const col = await db.query(
    'SELECT * FROM collections WHERE id = $1 AND user_id = $2',
    [collectionId, userId]
  );
  if (!col.rows[0]) return null;

  const places = await db.query(`
    SELECT
      p.id AS place_id, p.name, p.city, p.category, p.subcategory,
      p.address, p.image_url, p.google_rating, p.average_rating,
      p.google_review_count, p.tags, cp.added_at
    FROM collection_places cp
    JOIN places p ON p.id = cp.place_id
    WHERE cp.collection_id = $1
    ORDER BY cp.added_at DESC
  `, [collectionId]);

  return { ...col.rows[0], places: places.rows };
}

async function addPlaceToCollection(collectionId, placeId, userId) {
  const col = await db.query(
    'SELECT id FROM collections WHERE id = $1 AND user_id = $2',
    [collectionId, userId]
  );
  if (!col.rows[0]) return null;

  await db.query(`
    INSERT INTO collection_places (collection_id, place_id)
    VALUES ($1, $2)
    ON CONFLICT (collection_id, place_id) DO NOTHING
  `, [collectionId, placeId]);
  return true;
}

async function removePlaceFromCollection(collectionId, placeId, userId) {
  const col = await db.query(
    'SELECT id FROM collections WHERE id = $1 AND user_id = $2',
    [collectionId, userId]
  );
  if (!col.rows[0]) return null;

  await db.query(
    'DELETE FROM collection_places WHERE collection_id = $1 AND place_id = $2',
    [collectionId, placeId]
  );
  return true;
}

async function deleteCollection(collectionId, userId) {
  const result = await db.query(
    'DELETE FROM collections WHERE id = $1 AND user_id = $2 RETURNING id',
    [collectionId, userId]
  );
  return result.rows[0] || null;
}

// Returns the set of collection IDs that contain a given place for this user
async function getPlaceCollectionIds(placeId, userId) {
  const result = await db.query(`
    SELECT cp.collection_id
    FROM collection_places cp
    JOIN collections c ON c.id = cp.collection_id
    WHERE cp.place_id = $1 AND c.user_id = $2
  `, [placeId, userId]);
  return result.rows.map(r => r.collection_id);
}

module.exports = {
  createCollection,
  getUserCollections,
  getCollectionWithPlaces,
  addPlaceToCollection,
  removePlaceFromCollection,
  deleteCollection,
  getPlaceCollectionIds,
};
