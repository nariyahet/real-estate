const { pool } = require("../config/db");

/**
 * Check if a property exists
 */
const checkPropertyExists = async (propertyId) => {
  const [rows] = await pool.execute(
    "SELECT id, title FROM properties WHERE id = ?",
    [propertyId]
  );
  return rows[0] || null;
};

/**
 * Add a property to a user's favorites
 */
const addFavorite = async (userId, propertyId) => {
  // 1. Verify property exists
  const property = await checkPropertyExists(propertyId);
  if (!property) {
    return { success: false, notFound: true, message: "Property not found." };
  }

  // 2. Check if already favorited
  const [existing] = await pool.execute(
    "SELECT id FROM favorites WHERE user_id = ? AND property_id = ?",
    [userId, propertyId]
  );

  if (existing.length > 0) {
    return {
      success: true,
      alreadyFavorite: true,
      favoriteId: existing[0].id,
      message: "Property is already in your favorites.",
    };
  }

  // 3. Insert favorite
  const [result] = await pool.execute(
    "INSERT INTO favorites (user_id, property_id) VALUES (?, ?)",
    [userId, propertyId]
  );

  return {
    success: true,
    alreadyFavorite: false,
    favoriteId: result.insertId,
    message: "Property added to favorites successfully.",
  };
};

/**
 * Remove a property from a user's favorites
 */
const removeFavorite = async (userId, propertyId) => {
  const [result] = await pool.execute(
    "DELETE FROM favorites WHERE user_id = ? AND property_id = ?",
    [userId, propertyId]
  );

  return {
    success: true,
    removed: result.affectedRows > 0,
    message:
      result.affectedRows > 0
        ? "Property removed from favorites."
        : "Property was not in your favorites.",
  };
};

/**
 * Check if a specific property is favorited by a user
 */
const isPropertyFavorited = async (userId, propertyId) => {
  const [rows] = await pool.execute(
    "SELECT id FROM favorites WHERE user_id = ? AND property_id = ?",
    [userId, propertyId]
  );

  return rows.length > 0;
};

/**
 * Get all favorite properties for a specific user
 */
const getUserFavorites = async (userId) => {
  const query = `
    SELECT
      f.id AS favorite_id,
      f.created_at AS favorited_at,
      p.id,
      p.title,
      p.description,
      p.property_type,
      p.listing_type,
      p.price,
      p.bedrooms,
      p.bathrooms,
      p.area,
      p.address,
      p.city,
      p.state,
      p.country,
      p.status,
      p.featured,
      p.created_at AS property_created_at,
      pi.image_url AS primary_image,
      u.name AS agent_name,
      u.email AS agent_email,
      u.phone AS agent_phone,
      a.agency_name
    FROM favorites f
    INNER JOIN properties p ON f.property_id = p.id
    LEFT JOIN property_images pi ON p.id = pi.property_id AND pi.is_primary = TRUE
    LEFT JOIN agents a ON p.agent_id = a.id
    LEFT JOIN users u ON a.user_id = u.id
    WHERE f.user_id = ?
    ORDER BY f.created_at DESC
  `;

  const [rows] = await pool.execute(query, [userId]);
  return rows;
};

/**
 * Get an array of property IDs favorited by a user (for bulk check)
 */
const getUserFavoritePropertyIds = async (userId) => {
  const [rows] = await pool.execute(
    "SELECT property_id FROM favorites WHERE user_id = ?",
    [userId]
  );
  return rows.map((r) => r.property_id);
};

module.exports = {
  checkPropertyExists,
  addFavorite,
  removeFavorite,
  isPropertyFavorited,
  getUserFavorites,
  getUserFavoritePropertyIds,
};
