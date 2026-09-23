const express = require("express");

const {
  getProperties,
  getProperty,
  addProperty,
  editProperty,
  removeProperty,
  getMyProperties,
  getPropertyIntelligence,
} = require("../controllers/propertyController");

const {
  getPropertyDocuments,
  uploadPropertyDocument,
} = require("../controllers/documentController");

const {
  handleDocumentUpload,
} = require("../middleware/uploadMiddleware");

const {
  protect,
} = require("../middleware/authMiddleware");

const {
  checkPropertyQuota,
} = require("../middleware/saasMiddleware");

const router = express.Router();

router.get("/", getProperties);

router.get(
  "/agent/my-properties",
  protect,
  getMyProperties
);

router.get("/:id/intelligence", getPropertyIntelligence);

router.get("/:propertyId/documents", protect, getPropertyDocuments);
router.post(
  "/:propertyId/documents",
  protect,
  handleDocumentUpload("file"),
  uploadPropertyDocument
);

router.get("/:id", getProperty);

router.post("/", protect, checkPropertyQuota, addProperty);

router.put("/:id", protect, editProperty);

router.delete("/:id", protect, removeProperty);

module.exports = router;