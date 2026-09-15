const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const {
  downloadDocument,
  deletePropertyDocument,
} = require("../controllers/documentController");

const router = express.Router();

router.get("/:id/download", protect, downloadDocument);
router.delete("/:id", protect, deletePropertyDocument);

module.exports = router;
