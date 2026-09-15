const {
  getSavedPropertiesByUser,
  getSavedPropertyRecord,
  saveProperty,
  removeSavedProperty,
  updateSavedPropertyNotes,
  getSavedSearchesByUser,
  createSavedSearch,
  deleteSavedSearch,
  getCollectionsByUser,
  getCollectionDetails,
  createCollection,
  deleteCollection,
  addPropertyToCollection,
  removePropertyFromCollection,
} = require('../models/savedModel');
const { getPropertyById } = require('../models/propertyModel');
const { logAudit } = require('../utils/auditLogger');

// ==========================================
// FEATURE #9: SAVED PROPERTIES
// ==========================================

const getSavedProperties = async (req, res) => {
  try {
    const userId = req.user.id;
    const saved = await getSavedPropertiesByUser(userId);

    return res.status(200).json({
      success: true,
      savedProperties: saved,
      totalCount: saved.length,
    });
  } catch (error) {
    console.error('Get Saved Properties Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch saved properties.' });
  }
};

const toggleSaveProperty = async (req, res) => {
  try {
    const userId = req.user.id;
    const { propertyId } = req.params;
    const { personal_notes, tags } = req.body || {};

    const property = await getPropertyById(Number(propertyId));
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found.' });
    }

    const existing = await getSavedPropertyRecord(userId, Number(propertyId));
    if (existing) {
      await removeSavedProperty(userId, Number(propertyId));
      return res.status(200).json({
        success: true,
        isSaved: false,
        message: 'Property removed from saved list.',
      });
    } else {
      const saved = await saveProperty(userId, Number(propertyId), { personal_notes, tags });
      return res.status(201).json({
        success: true,
        isSaved: true,
        message: 'Property saved successfully.',
        saved,
      });
    }
  } catch (error) {
    console.error('Toggle Save Property Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to toggle saved property.' });
  }
};

const updateSavedNotes = async (req, res) => {
  try {
    const userId = req.user.id;
    const { propertyId } = req.params;
    const { personal_notes, tags } = req.body;

    const existing = await getSavedPropertyRecord(userId, Number(propertyId));
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Property is not in your saved list.' });
    }

    const updated = await updateSavedPropertyNotes(userId, Number(propertyId), { personal_notes, tags });

    return res.status(200).json({
      success: true,
      message: 'Notes and tags updated.',
      saved: updated,
    });
  } catch (error) {
    console.error('Update Saved Notes Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update notes.' });
  }
};

const removeSaved = async (req, res) => {
  try {
    const userId = req.user.id;
    const { propertyId } = req.params;

    await removeSavedProperty(userId, Number(propertyId));
    return res.status(200).json({
      success: true,
      message: 'Property removed from saved list.',
    });
  } catch (error) {
    console.error('Remove Saved Property Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to remove saved property.' });
  }
};

// ==========================================
// FEATURE #10: SAVED SEARCHES & COLLECTIONS
// ==========================================

const getSavedSearches = async (req, res) => {
  try {
    const userId = req.user.id;
    const searches = await getSavedSearchesByUser(userId);

    return res.status(200).json({
      success: true,
      searches,
      totalCount: searches.length,
    });
  } catch (error) {
    console.error('Get Saved Searches Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch saved searches.' });
  }
};

const saveSearch = async (req, res) => {
  try {
    const userId = req.user.id;
    const { search_name, filters } = req.body;

    if (!search_name || !String(search_name).trim()) {
      return res.status(400).json({ success: false, message: 'Search name is required.' });
    }

    const created = await createSavedSearch(userId, {
      search_name: String(search_name).trim(),
      filters: filters || {},
    });

    return res.status(201).json({
      success: true,
      message: 'Search criteria saved.',
      search: created,
    });
  } catch (error) {
    console.error('Save Search Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to save search.' });
  }
};

const deleteSearch = async (req, res) => {
  try {
    const userId = req.user.id;
    const { searchId } = req.params;

    await deleteSavedSearch(userId, Number(searchId));

    return res.status(200).json({
      success: true,
      message: 'Saved search deleted.',
    });
  } catch (error) {
    console.error('Delete Saved Search Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete saved search.' });
  }
};

// Collections
const getCollections = async (req, res) => {
  try {
    const userId = req.user.id;
    const collections = await getCollectionsByUser(userId);

    return res.status(200).json({
      success: true,
      collections,
      totalCount: collections.length,
    });
  } catch (error) {
    console.error('Get Collections Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch collections.' });
  }
};

const getCollection = async (req, res) => {
  try {
    const userId = req.user.id;
    const { collectionId } = req.params;

    const collection = await getCollectionDetails(userId, Number(collectionId));
    if (!collection) {
      return res.status(404).json({ success: false, message: 'Collection not found.' });
    }

    return res.status(200).json({
      success: true,
      collection,
    });
  } catch (error) {
    console.error('Get Collection Details Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch collection details.' });
  }
};

const createNewCollection = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, description, color } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, message: 'Collection name is required.' });
    }

    const created = await createCollection(userId, {
      name: String(name).trim(),
      description: description ? String(description).trim() : null,
      color: color || '#3b82f6',
    });

    return res.status(201).json({
      success: true,
      message: 'Collection created successfully.',
      collection: created,
    });
  } catch (error) {
    console.error('Create Collection Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create collection.' });
  }
};

const deleteExistingCollection = async (req, res) => {
  try {
    const userId = req.user.id;
    const { collectionId } = req.params;

    await deleteCollection(userId, Number(collectionId));

    return res.status(200).json({
      success: true,
      message: 'Collection deleted.',
    });
  } catch (error) {
    console.error('Delete Collection Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete collection.' });
  }
};

const addItemToCollection = async (req, res) => {
  try {
    const userId = req.user.id;
    const { collectionId } = req.params;
    const { propertyId, notes } = req.body;

    if (!propertyId) {
      return res.status(400).json({ success: false, message: 'Property ID is required.' });
    }

    const property = await getPropertyById(Number(propertyId));
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found.' });
    }

    const updated = await addPropertyToCollection(userId, Number(collectionId), Number(propertyId), notes);

    return res.status(200).json({
      success: true,
      message: 'Property added to collection.',
      collection: updated,
    });
  } catch (error) {
    console.error('Add To Collection Error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to add property to collection.' });
  }
};

const removeItemFromCollection = async (req, res) => {
  try {
    const userId = req.user.id;
    const { collectionId, propertyId } = req.params;

    await removePropertyFromCollection(userId, Number(collectionId), Number(propertyId));

    return res.status(200).json({
      success: true,
      message: 'Property removed from collection.',
    });
  } catch (error) {
    console.error('Remove From Collection Error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to remove property from collection.' });
  }
};

module.exports = {
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
};
