// Handles all requests related to browsing places

const { getPlaces, getPlaceById, getPlaceStats } = require('../database/placesHelpers');

// GET /api/places
// Returns a list of places and can be filtered by city, category, and price level via query params
// Example: /api/places?city=Dublin&category=restaurant&price_level=2&limit=20&offset=0
async function listPlaces(req, res) {
  try {
    const { city, category, price_level, min_review_count, max_review_count, min_rating, limit = 20, offset = 0 } = req.query;

    const places = await getPlaces({
      city,
      category,
      price_level:       price_level       ? parseInt(price_level)       : undefined,
      min_review_count:  min_review_count  ? parseInt(min_review_count)  : undefined,
      max_review_count:  max_review_count  ? parseInt(max_review_count)  : undefined,
      min_rating:        min_rating        ? parseFloat(min_rating)       : undefined,
      limit:  parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      count: places.length,
      places,
    });

  } catch (error) {
    console.error('listPlaces error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch places' });
  }
}

// GET /api/places/stats
// Returns a breakdown of how many places we have per city and category
// Useful for checking the database is populated correctly
async function placeStats(req, res) {
  try {
    const stats = await getPlaceStats();
    res.json({ success: true, stats });
  } catch (error) {
    console.error('placeStats error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
}

// GET /api/places/:id
// Returns full details for a single place
async function getPlace(req, res) {
  try {
    const place = await getPlaceById(parseInt(req.params.id));

    if (!place) {
      return res.status(404).json({ success: false, error: 'Place not found' });
    }

    res.json({ success: true, place });

  } catch (error) {
    console.error('getPlace error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch place' });
  }
}

module.exports = { listPlaces, placeStats, getPlace };
