const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getSavedProperties,
  toggleSaveProperty,
  updateSavedNotes,
  removeSaved,
  getSavedSearches,
  saveSearch,
  deleteSearch,
  getCollections,
  getCollection,
  createNewCollection,
  deleteExistingCollection,
  addItemToCollection,
  removeItemFromCollection,
} = require('../controllers/savedController');

// Feature #9: Saved Properties
router.get('/saved-properties', protect, getSavedProperties);
router.post('/saved-properties/:propertyId/toggle', protect, toggleSaveProperty);
router.put('/saved-properties/:propertyId/notes', protect, updateSavedNotes);
router.delete('/saved-properties/:propertyId', protect, removeSaved);

// Feature #10: Saved Searches
router.get('/saved-searches', protect, getSavedSearches);
router.post('/saved-searches', protect, saveSearch);
router.delete('/saved-searches/:searchId', protect, deleteSearch);

// Feature #10: Collections
router.get('/collections', protect, getCollections);
router.post('/collections', protect, createNewCollection);
router.get('/collections/:collectionId', protect, getCollection);
router.delete('/collections/:collectionId', protect, deleteExistingCollection);
router.post('/collections/:collectionId/items', protect, addItemToCollection);
router.delete('/collections/:collectionId/items/:propertyId', protect, removeItemFromCollection);

module.exports = router;
