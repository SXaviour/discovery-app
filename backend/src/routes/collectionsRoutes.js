const express = require('express');
const router  = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');
const {
  listCollections, createCol, getCollection, deleteCol,
  addPlace, removePlace, placeCollections,
} = require('../controllers/collectionsControllers');

router.use(requireAuth);

router.get('/',                              listCollections);
router.post('/',                             createCol);
router.get('/:id',                           getCollection);
router.delete('/:id',                        deleteCol);
router.post('/:id/places/:placeId',          addPlace);
router.delete('/:id/places/:placeId',        removePlace);
router.get('/place/:placeId',                placeCollections);

module.exports = router;
