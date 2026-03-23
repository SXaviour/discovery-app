// Maps /api/places URLs to their controller functions

const express = require('express');
const router = express.Router();
const { listPlaces, placeStats, getPlace } = require('../controllers/placesControllers');

// Stats route must come before /:id otherwise Express reads "stats" as an ID
router.get('/stats', placeStats);
router.get('/', listPlaces);
router.get('/:id', getPlace);

module.exports = router;
