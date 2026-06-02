// Routes for the recommendation system
// All routes require the user to be logged in

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');
const { getMyProfile, getRecommendations, getPlaceScore, getPeopleAlsoEnjoyed } = require('../controllers/recommendationsControllers');

router.use(requireAuth);

router.get('/',                 getRecommendations);
router.get('/profile',          getMyProfile);
router.get('/score/:placeId',   getPlaceScore);
router.get('/similar',          getPeopleAlsoEnjoyed);

module.exports = router;
