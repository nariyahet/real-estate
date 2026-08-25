const express = require("express");

const {
  getProperties,
  getProperty,
  addProperty,
  editProperty,
  removeProperty,
  getMyProperties,
} = require("../controllers/propertyController");

const {
  protect,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", getProperties);

router.get(
  "/agent/my-properties",
  protect,
  getMyProperties
);

router.get("/:id", getProperty);

router.post("/", protect, addProperty);

router.put("/:id", protect, editProperty);

router.delete("/:id", protect, removeProperty);

module.exports = router;