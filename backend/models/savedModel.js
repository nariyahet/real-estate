const { pool } = require('../config/db');

// ==========================================
// FEATURE #9: SAVED PROPERTIES
// ==========================================

const getSavedPropertiesByUser = async (userId) => {
  const [rows] = await pool.execute(
    `
    SELECT
      sp.id AS saved_id,
      sp.personal_notes,
      sp.tags,
      sp.created_at AS saved_at,
      p.id,
      p.title,
      p.description,
      p.property_type,
      p.listing_type,
      p.price,
      p.bedrooms,
      p.bathrooms,
      p.area AS area_sqft,
      p.address,
      p.city,
      p.state,
      p.status,
      p.agent_id,
      (SELECT image_url FROM property_images WHERE property_id = p.id AND is_primary = 1 LIMIT 1) AS featured_image,
      (SELECT image_url FROM property_images WHERE property_id = p.id LIMIT 1) AS fallback_image
    FROM saved_properties sp
    INNER JOIN properties p ON sp.property_id = p.id
    WHERE sp.user_id = ?
    ORDER BY sp.created_at DESC
    `,
    [userId]
  );

  return rows.map(r => ({
    savedId: r.saved_id,
    personalNotes: r.personal_notes,
    tags: r.tags ? r.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    savedAt: r.saved_at,
    property: {
      id: r.id,
      title: r.title,
      description: r.description,
      property_type: r.property_type,
      listing_type: r.listing_type,
      price: r.price,
      bedrooms: r.bedrooms,
      bathrooms: r.bathrooms,
      area_sqft: r.area_sqft,
      address: r.address,
      city: r.city,
      state: r.state,
      status: r.status,
      agent_id: r.agent_id,
      image: r.featured_image || r.fallback_image || null,
    }
  }));
};

const getSavedPropertyRecord = async (userId, propertyId) => {
  const [rows] = await pool.execute(
    `SELECT * FROM saved_properties WHERE user_id = ? AND property_id = ? LIMIT 1`,
    [userId, propertyId]
  );
  return rows[0] || null;
};

const saveProperty = async (userId, propertyId, { personal_notes, tags } = {}) => {
  const serializedTags = Array.isArray(tags) ? tags.join(',') : (tags || null);
  await pool.execute(
    `
    INSERT INTO saved_properties (user_id, property_id, personal_notes, tags)
    VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      personal_notes = COALESCE(VALUES(personal_notes), personal_notes),
      tags = COALESCE(VALUES(tags), tags),
      updated_at = NOW()
    `,
    [userId, propertyId, personal_notes || null, serializedTags]
  );

  return getSavedPropertyRecord(userId, propertyId);
};

const removeSavedProperty = async (userId, propertyId) => {
  const [result] = await pool.execute(
    `DELETE FROM saved_properties WHERE user_id = ? AND property_id = ?`,
    [userId, propertyId]
  );
  return result.affectedRows > 0;
};

const updateSavedPropertyNotes = async (userId, propertyId, { personal_notes, tags }) => {
  const serializedTags = Array.isArray(tags) ? tags.join(',') : (tags !== undefined ? tags : null);
  await pool.execute(
    `
    UPDATE saved_properties
    SET personal_notes = ?, tags = ?, updated_at = NOW()
    WHERE user_id = ? AND property_id = ?
    `,
    [personal_notes || null, serializedTags, userId, propertyId]
  );
  return getSavedPropertyRecord(userId, propertyId);
};

// ==========================================
// FEATURE #10: SAVED SEARCHES & COLLECTIONS
// ==========================================

const getSavedSearchesByUser = async (userId) => {
  const [rows] = await pool.execute(
    `
    SELECT id, user_id, search_name, filters, created_at, updated_at
    FROM saved_searches
    WHERE user_id = ?
    ORDER BY created_at DESC
    `,
    [userId]
  );

  return rows.map(r => ({
    id: r.id,
    searchName: r.search_name,
    filters: typeof r.filters === 'string' ? JSON.parse(r.filters) : r.filters,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  }));
};

const createSavedSearch = async (userId, { search_name, filters }) => {
  const [result] = await pool.execute(
    `
    INSERT INTO saved_searches (user_id, search_name, filters)
    VALUES (?, ?, ?)
    `,
    [userId, search_name, JSON.stringify(filters || {})]
  );

  const [rows] = await pool.execute(
    `SELECT * FROM saved_searches WHERE id = ?`,
    [result.insertId]
  );
  const created = rows[0];
  return {
    id: created.id,
    searchName: created.search_name,
    filters: typeof created.filters === 'string' ? JSON.parse(created.filters) : created.filters,
    createdAt: created.created_at
  };
};

const deleteSavedSearch = async (userId, searchId) => {
  const [result] = await pool.execute(
    `DELETE FROM saved_searches WHERE id = ? AND user_id = ?`,
    [searchId, userId]
  );
  return result.affectedRows > 0;
};

// COLLECTIONS

const getCollectionsByUser = async (userId) => {
  const [collections] = await pool.execute(
    `
    SELECT
      c.id,
      c.name,
      c.description,
      c.color,
      c.created_at,
      c.updated_at,
      COUNT(ci.id) AS item_count
    FROM property_collections c
    LEFT JOIN property_collection_items ci ON c.id = ci.collection_id
    WHERE c.user_id = ?
    GROUP BY c.id
    ORDER BY c.created_at DESC
    `,
    [userId]
  );

  return collections.map(c => ({
    id: c.id,
    name: c.name,
    description: c.description,
    color: c.color,
    itemCount: Number(c.item_count) || 0,
    createdAt: c.created_at,
    updatedAt: c.updated_at
  }));
};

const getCollectionDetails = async (userId, collectionId) => {
  const [collections] = await pool.execute(
    `SELECT * FROM property_collections WHERE id = ? AND user_id = ? LIMIT 1`,
    [collectionId, userId]
  );

  if (!collections[0]) return null;
  const col = collections[0];

  const [items] = await pool.execute(
    `
    SELECT
      ci.id AS item_id,
      ci.notes,
      ci.created_at AS added_at,
      p.id,
      p.title,
      p.property_type,
      p.listing_type,
      p.price,
      p.city,
      p.status,
      (SELECT image_url FROM property_images WHERE property_id = p.id AND is_primary = 1 LIMIT 1) AS featured_image,
      (SELECT image_url FROM property_images WHERE property_id = p.id LIMIT 1) AS fallback_image
    FROM property_collection_items ci
    INNER JOIN properties p ON ci.property_id = p.id
    WHERE ci.collection_id = ?
    ORDER BY ci.created_at DESC
    `,
    [collectionId]
  );

  return {
    id: col.id,
    name: col.name,
    description: col.description,
    color: col.color,
    createdAt: col.created_at,
    items: items.map(it => ({
      itemId: it.item_id,
      notes: it.notes,
      addedAt: it.added_at,
      property: {
        id: it.id,
        title: it.title,
        property_type: it.property_type,
        listing_type: it.listing_type,
        price: it.price,
        city: it.city,
        status: it.status,
        image: it.featured_image || it.fallback_image || null
      }
    }))
  };
};

const createCollection = async (userId, { name, description, color }) => {
  const [result] = await pool.execute(
    `
    INSERT INTO property_collections (user_id, name, description, color)
    VALUES (?, ?, ?, ?)
    `,
    [userId, name, description || null, color || '#3b82f6']
  );

  return getCollectionDetails(userId, result.insertId);
};

const deleteCollection = async (userId, collectionId) => {
  const [result] = await pool.execute(
    `DELETE FROM property_collections WHERE id = ? AND user_id = ?`,
    [collectionId, userId]
  );
  return result.affectedRows > 0;
};

const addPropertyToCollection = async (userId, collectionId, propertyId, notes = null) => {
  // Ensure collection belongs to user
  const [col] = await pool.execute(
    `SELECT id FROM property_collections WHERE id = ? AND user_id = ? LIMIT 1`,
    [collectionId, userId]
  );
  if (!col[0]) {
    throw new Error('Collection not found or unauthorized.');
  }

  await pool.execute(
    `
    INSERT INTO property_collection_items (collection_id, property_id, notes)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE notes = COALESCE(VALUES(notes), notes)
    `,
    [collectionId, propertyId, notes || null]
  );

  return getCollectionDetails(userId, collectionId);
};

const removePropertyFromCollection = async (userId, collectionId, propertyId) => {
  const [col] = await pool.execute(
    `SELECT id FROM property_collections WHERE id = ? AND user_id = ? LIMIT 1`,
    [collectionId, userId]
  );
  if (!col[0]) {
    throw new Error('Collection not found or unauthorized.');
  }

  const [result] = await pool.execute(
    `DELETE FROM property_collection_items WHERE collection_id = ? AND property_id = ?`,
    [collectionId, propertyId]
  );
  return result.affectedRows > 0;
};

module.exports = {
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
};
