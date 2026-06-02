// Maps /api/places URLs to their controller functions

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');
const { listPlaces, placeStats, getPlace } = require('../controllers/placesControllers');

router.use(requireAuth);
router.get('/stats', placeStats);
router.get('/', listPlaces);
router.get('/:id', getPlace);

module.exports = router;
