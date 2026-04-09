// Handles recommendation related endpoints

const { buildUserProfile }           = require('../ml/userProfile');
const { getHybridRecommendations }   = require('../ml/hybridScorer');

// GET /api/recommendations/profile
// Returns a breakdown of what the system has learned about this user's tastes
async function getMyProfile(req, res) {
  try {
    const profile = await buildUserProfile(req.session.userId);
    res.json({ success: true, profile });
  } catch (error) {
    console.error('getMyProfile error:', error);
    res.status(500).json({ success: false, error: 'Failed to build user profile' });
  }
}

// GET /api/recommendations?city=Dublin&limit=20
// Returns a ranked list of places personalised to the logged-in user
// Uses hybrid scoring: blends NCF collaborative filtering with content-based matching
// Falls back to content-only if the NCF model isn't trained or user is unknown
async function getRecommendations(req, res) {
  try {
    const city  = req.query.city  || null;
    const limit = parseInt(req.query.limit) || 20;

    const result = await getHybridRecommendations(req.session.userId, { city, limit });

    res.json({ success: true, ...result });
  } catch (error) {
    console.error('getRecommendations error:', error);
    res.status(500).json({ success: false, error: 'Failed to get recommendations' });
  }
}

module.exports = { getMyProfile, getRecommendations };
