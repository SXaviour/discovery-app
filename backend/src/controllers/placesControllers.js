// Handles all requests related to browsing places

const { getPlaces, getPlaceById, getPlaceStats } = require('../database/placesHelpers');

// GET /api/places
// Supports multi-value filters: categories=adventure,indoor_activity  price_levels=1,2
// tags=date+night,escape+room  search=escape  min_rating=4.0
// Also accepts legacy single-value: category=adventure  price_level=2
async function listPlaces(req, res) {
  try {
    const {
      city, search, min_rating,
      categories, price_levels, tags,
      category, price_level,  // legacy single-value aliases
      limit = 20, offset = 0, random,
    } = req.query;

    const { places, total } = await getPlaces({
      city,
      search,
      min_rating:   min_rating   ? parseFloat(min_rating)                   : undefined,
      categories:   categories   ? categories.split(',').map(s => s.trim())  : undefined,
      price_levels: price_levels ? price_levels.split(',').map(Number)       : undefined,
      tags:         tags         ? tags.split(',').map(s => s.trim())        : undefined,
      category,
      price_level:  price_level  ? parseInt(price_level)                    : undefined,
      limit:  parseInt(limit),
      offset: parseInt(offset),
      random: random === 'true',
    });

    res.json({ success: true, count: places.length, total, places });

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

const PHOTO_BASE = 'https://places.googleapis.com/v1';

function buildPhotoUrl(ref) {
  return `${PHOTO_BASE}/${ref}/media?maxHeightPx=800&key=${process.env.GOOGLE_API_KEY}`;
}

// GET /api/places/:id
// Returns full details for a single place
async function getPlace(req, res) {
  try {
    const place = await getPlaceById(parseInt(req.params.id));

    if (!place) {
      return res.status(404).json({ success: false, error: 'Place not found' });
    }

    const photoUrls = (place.photos || []).slice(0, 6).map(buildPhotoUrl);
    if (photoUrls.length === 0 && place.image_url) photoUrls.push(place.image_url);

    res.json({ success: true, place: { ...place, photo_urls: photoUrls } });

  } catch (error) {
    console.error('getPlace error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch place' });
  }
}

module.exports = { listPlaces, placeStats, getPlace };
