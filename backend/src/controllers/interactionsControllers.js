// Handles rating, favoriting, and marking places as visited

const {
  upsertRating,
  deleteRating,
  toggleInteraction,
  getUserInteractions,
  getUserInteractionsByType,
  getUserPlaceInteractions,
} = require('../database/interactionsHelpers');

// POST /api/interactions/rate
// Body: { placeId, rating }  — rating must be 1 to 5
async function ratePlace(req, res) {
  try {
    const { placeId, rating } = req.body;
    const userId = req.session.userId;

    if (!placeId || !rating) {
      return res.status(400).json({ success: false, error: 'placeId and rating are required' });
    }

    if (rating < 1 || rating > 5 || !Number.isInteger(Number(rating))) {
      return res.status(400).json({ success: false, error: 'Rating must be a whole number between 1 and 5' });
    }

    const result = await upsertRating(userId, placeId, Number(rating));

    res.json({
      success: true,
      message: 'Rating saved',
      newAverage: result.average,
      totalRatings: result.total,
    });

  } catch (error) {
    console.error('ratePlace error:', error);
    res.status(500).json({ success: false, error: 'Failed to save rating' });
  }
}

// DELETE /api/interactions/rate/:placeId
// Removes the user's rating for a place
async function removeRating(req, res) {
  try {
    const userId = req.session.userId;
    const placeId = parseInt(req.params.placeId);

    const result = await deleteRating(userId, placeId);

    if (!result) {
      return res.status(404).json({ success: false, error: 'No rating found to remove' });
    }

    res.json({ success: true, message: 'Rating removed' });

  } catch (error) {
    console.error('removeRating error:', error);
    res.status(500).json({ success: false, error: 'Failed to remove rating' });
  }
}

// POST /api/interactions/favorite/:placeId
// Toggles a place as favorited — call it again to unfavorite
async function toggleFavorite(req, res) {
  try {
    const userId = req.session.userId;
    const placeId = parseInt(req.params.placeId);

    const result = await toggleInteraction(userId, placeId, 'favorite');

    res.json({
      success: true,
      favorited: result.active,
      message: result.active ? 'Added to favorites' : 'Removed from favorites',
    });

  } catch (error) {
    console.error('toggleFavorite error:', error);
    res.status(500).json({ success: false, error: 'Failed to update favorite' });
  }
}

// POST /api/interactions/visited/:placeId
// Toggles a place as visited — call it again to unmark
async function toggleVisited(req, res) {
  try {
    const userId = req.session.userId;
    const placeId = parseInt(req.params.placeId);

    const result = await toggleInteraction(userId, placeId, 'visited');

    res.json({
      success: true,
      visited: result.active,
      message: result.active ? 'Marked as visited' : 'Removed from visited',
    });

  } catch (error) {
    console.error('toggleVisited error:', error);
    res.status(500).json({ success: false, error: 'Failed to update visited' });
  }
}

// GET /api/interactions/my
// Returns all of the logged-in user's interactions across all places
async function getMyInteractions(req, res) {
  try {
    const interactions = await getUserInteractions(req.session.userId);

    res.json({ success: true, interactions });

  } catch (error) {
    console.error('getMyInteractions error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch interactions' });
  }
}

// GET /api/interactions/place/:placeId
// Returns the logged-in user's interactions with one specific place
// Used by the frontend to know if a place is already favorited, visited, or rated
async function getPlaceInteractions(req, res) {
  try {
    const userId = req.session.userId;
    const placeId = parseInt(req.params.placeId);

    const rows = await getUserPlaceInteractions(userId, placeId);

    // Shape the data into a simple object the frontend can use directly
    const result = { rating: null, favorited: false, visited: false };
    for (const row of rows) {
      if (row.interaction_type === 'rating')   result.rating    = row.rating_value;
      if (row.interaction_type === 'favorite') result.favorited = true;
      if (row.interaction_type === 'visited')  result.visited   = true;
    }

    res.json({ success: true, interactions: result });

  } catch (error) {
    console.error('getPlaceInteractions error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch interactions' });
  }
}

// GET /api/interactions/my/favorites
async function getMyFavorites(req, res) {
  try {
    const places = await getUserInteractionsByType(req.session.userId, 'favorite');
    res.json({ success: true, count: places.length, places });
  } catch (error) {
    console.error('getMyFavorites error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch favorites' });
  }
}

// GET /api/interactions/my/visited
async function getMyVisited(req, res) {
  try {
    const places = await getUserInteractionsByType(req.session.userId, 'visited');
    res.json({ success: true, count: places.length, places });
  } catch (error) {
    console.error('getMyVisited error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch visited places' });
  }
}

module.exports = {
  ratePlace,
  removeRating,
  toggleFavorite,
  toggleVisited,
  getMyInteractions,
  getMyFavorites,
  getMyVisited,
  getPlaceInteractions,
};
