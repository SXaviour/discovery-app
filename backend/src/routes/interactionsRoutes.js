// Maps /api/interactions URLs to their controller functions
// All routes require the user to be logged in

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');
const {
  ratePlace,
  removeRating,
  toggleFavorite,
  toggleVisited,
  getMyInteractions,
  getMyFavorites,
  getMyVisited,
  getPlaceInteractions,
  clearMyInteractions,
} = require('../controllers/interactionsControllers');

// Apply requireAuth to every route in this file
router.use(requireAuth);

router.post('/rate',                 ratePlace);
router.delete('/rate/:placeId',      removeRating);
router.post('/favorite/:placeId',    toggleFavorite);
router.post('/visited/:placeId',     toggleVisited);
router.get('/my',                    getMyInteractions);
router.get('/my/favorites',          getMyFavorites);
router.get('/my/visited',            getMyVisited);
router.get('/place/:placeId',        getPlaceInteractions);
router.delete('/my',                 clearMyInteractions);

module.exports = router;
