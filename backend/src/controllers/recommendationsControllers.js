// Handles recommendation related endpoints
// Currently exposes the user's taste profile

const { buildUserProfile } = require('../ml/userProfile');

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

module.exports = { getMyProfile };
