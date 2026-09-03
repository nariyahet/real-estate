const {
  addFavorite: addFavoriteModel,
  removeFavorite: removeFavoriteModel,
  isPropertyFavorited,
  getUserFavorites: getUserFavoritesModel,
  getUserFavoritePropertyIds,
} = require("../models/favoriteModel");

/**
 * Add a property to favorites
 * POST /api/favorites/:propertyId
 */
const addFavorite = async (req, res) => {
  try {
    const userId = req.user.id;
    const propertyId = Number(req.params.propertyId);

    if (!propertyId || isNaN(propertyId) || propertyId <= 0) {
      return res.status(400).json({
        success: false,
        message: "A valid property ID is required.",
      });
    }

    const result = await addFavoriteModel(userId, propertyId);

    if (result.notFound) {
      return res.status(404).json({
        success: false,
        message: result.message,
      });
    }

    return res.status(result.alreadyFavorite ? 200 : 201).json({
      success: true,
      message: result.message,
      isFavorite: true,
      favoriteId: result.favoriteId,
    });
  } catch (error) {
    console.error("Add Favorite Error:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while adding property to favorites.",
    });
  }
};

/**
 * Remove a property from favorites
 * DELETE /api/favorites/:propertyId
 */
const removeFavorite = async (req, res) => {
  try {
    const userId = req.user.id;
    const propertyId = Number(req.params.propertyId);

    if (!propertyId || isNaN(propertyId) || propertyId <= 0) {
      return res.status(400).json({
        success: false,
        message: "A valid property ID is required.",
      });
    }

    const result = await removeFavoriteModel(userId, propertyId);

    return res.status(200).json({
      success: true,
      message: result.message,
      isFavorite: false,
      removed: result.removed,
    });
  } catch (error) {
    console.error("Remove Favorite Error:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while removing property from favorites.",
    });
  }
};

/**
 * Check if a property is in user's favorites
 * GET /api/favorites/check/:propertyId
 */
const checkFavorite = async (req, res) => {
  try {
    const userId = req.user.id;
    const propertyId = Number(req.params.propertyId);

    if (!propertyId || isNaN(propertyId) || propertyId <= 0) {
      return res.status(400).json({
        success: false,
        message: "A valid property ID is required.",
      });
    }

    const isFavorite = await isPropertyFavorited(userId, propertyId);

    return res.status(200).json({
      success: true,
      isFavorite,
    });
  } catch (error) {
    console.error("Check Favorite Error:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while checking favorite status.",
    });
  }
};

/**
 * Get all favorites for the logged-in user
 * GET /api/favorites
 */
const getMyFavorites = async (req, res) => {
  try {
    const userId = req.user.id;
    const favorites = await getUserFavoritesModel(userId);

    return res.status(200).json({
      success: true,
      favorites,
      count: favorites.length,
    });
  } catch (error) {
    console.error("Get Favorites Error:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while retrieving your favorites.",
    });
  }
};

/**
 * Get IDs of all favorited properties for logged-in user
 * GET /api/favorites/ids
 */
const getFavoriteIds = async (req, res) => {
  try {
    const userId = req.user.id;
    const favoriteIds = await getUserFavoritePropertyIds(userId);

    return res.status(200).json({
      success: true,
      favoriteIds,
    });
  } catch (error) {
    console.error("Get Favorite IDs Error:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while retrieving favorite IDs.",
    });
  }
};

module.exports = {
  addFavorite,
  removeFavorite,
  checkFavorite,
  getMyFavorites,
  getFavoriteIds,
};
