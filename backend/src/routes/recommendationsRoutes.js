// Routes for the recommendation system
// All endpoints require the user to be logged in

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');
const { getMyProfile } = require('../controllers/recommendationsControllers');

router.use(requireAuth);

router.get('/profile', getMyProfile);

module.exports = router;
