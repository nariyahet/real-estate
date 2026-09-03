const express = require("express");
const {
  addFavorite,
  removeFavorite,
  checkFavorite,
  getMyFavorites,
  getFavoriteIds,
} = require("../controllers/favoriteController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// All favorite routes require authentication
router.use(protect);

// GET all favorites for the logged-in user
router.get("/", getMyFavorites);

// GET array of favorite property IDs for the logged-in user
router.get("/ids", getFavoriteIds);

// GET check whether a specific property is favorited
router.get("/check/:propertyId", checkFavorite);

// POST add a property to favorites
router.post("/:propertyId", addFavorite);

// DELETE remove a property from favorites
router.delete("/:propertyId", removeFavorite);

module.exports = router;
