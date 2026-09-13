const express = require("express");
const {
  createInquiry,
  getInquiries,
  getInquiry,
  updateInquiryStatus,
  deleteInquiry,
} = require("../controllers/inquiryController");
const { protect, optionalProtect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", optionalProtect, createInquiry);
router.get("/", protect, getInquiries);
router.get("/:id", protect, getInquiry);
router.put("/:id/status", protect, updateInquiryStatus);
router.patch("/:id/status", protect, updateInquiryStatus);
router.delete("/:id", protect, deleteInquiry);

module.exports = router;
