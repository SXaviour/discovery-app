// Maps /api/preferences URLs to their controller functions
// All routes require the user to be logged in

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');
const { getMyPreferences, updateMyPreferences } = require('../controllers/preferencesControllers');

router.use(requireAuth);

router.get('/',  getMyPreferences);
router.put('/',  updateMyPreferences);

module.exports = router;
