// Handles recommendation related endpoints

const { buildUserProfile }           = require('../ml/userProfile');
const { getHybridRecommendations }   = require('../ml/hybridScorer');
const { scoreSinglePlace }           = require('../ml/contentScorer');
const { getSimilarUserPicks }        = require('../database/interactionsHelpers');

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

async function getPlaceScore(req, res) {
  try {
    const placeId = parseInt(req.params.placeId);
    const result  = await scoreSinglePlace(req.session.userId, placeId);
    if (!result) return res.status(404).json({ success: false });
    res.json({ success: true, score: result.score, mode: result.mode });
  } catch (err) {
    console.error('getPlaceScore error:', err);
    res.status(500).json({ success: false });
  }
}

// GET /api/recommendations/similar?city=Dublin
// Returns places liked by users with similar interaction history to the current user
async function getPeopleAlsoEnjoyed(req, res) {
  try {
    const city  = req.query.city || null;
    const limit = parseInt(req.query.limit) || 25;
    const places = await getSimilarUserPicks(req.session.userId, city, limit);
    res.json({ success: true, places });
  } catch (err) {
    console.error('getPeopleAlsoEnjoyed error:', err);
    res.status(500).json({ success: false });
  }
}

module.exports = { getMyProfile, getRecommendations, getPlaceScore, getPeopleAlsoEnjoyed };
