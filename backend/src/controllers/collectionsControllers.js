const {
  createCollection,
  getUserCollections,
  getCollectionWithPlaces,
  addPlaceToCollection,
  removePlaceFromCollection,
  deleteCollection,
  getPlaceCollectionIds,
} = require('../database/collectionsHelpers');

async function listCollections(req, res) {
  try {
    const collections = await getUserCollections(req.session.userId);
    res.json({ success: true, collections });
  } catch (err) {
    console.error('listCollections error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch collections' });
  }
}

async function createCol(req, res) {
  try {
    const { name, description } = req.body;
    if (!name?.trim()) return res.status(400).json({ success: false, error: 'Name is required' });
    const col = await createCollection(req.session.userId, name.trim(), description);
    res.status(201).json({ success: true, collection: col });
  } catch (err) {
    console.error('createCol error:', err);
    res.status(500).json({ success: false, error: 'Failed to create collection' });
  }
}

async function getCollection(req, res) {
  try {
    const col = await getCollectionWithPlaces(parseInt(req.params.id), req.session.userId);
    if (!col) return res.status(404).json({ success: false, error: 'Collection not found' });
    res.json({ success: true, collection: col });
  } catch (err) {
    console.error('getCollection error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch collection' });
  }
}

async function deleteCol(req, res) {
  try {
    const result = await deleteCollection(parseInt(req.params.id), req.session.userId);
    if (!result) return res.status(404).json({ success: false, error: 'Collection not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('deleteCol error:', err);
    res.status(500).json({ success: false, error: 'Failed to delete collection' });
  }
}

async function addPlace(req, res) {
  try {
    const result = await addPlaceToCollection(
      parseInt(req.params.id),
      parseInt(req.params.placeId),
      req.session.userId
    );
    if (!result) return res.status(404).json({ success: false, error: 'Collection not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('addPlace error:', err);
    res.status(500).json({ success: false, error: 'Failed to add place' });
  }
}

async function removePlace(req, res) {
  try {
    const result = await removePlaceFromCollection(
      parseInt(req.params.id),
      parseInt(req.params.placeId),
      req.session.userId
    );
    if (!result) return res.status(404).json({ success: false, error: 'Collection not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('removePlace error:', err);
    res.status(500).json({ success: false, error: 'Failed to remove place' });
  }
}

async function placeCollections(req, res) {
  try {
    const ids = await getPlaceCollectionIds(parseInt(req.params.placeId), req.session.userId);
    res.json({ success: true, collectionIds: ids });
  } catch (err) {
    console.error('placeCollections error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch' });
  }
}

module.exports = { listCollections, createCol, getCollection, deleteCol, addPlace, removePlace, placeCollections };
