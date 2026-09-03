const express = require("express");
const {
  createInquiry,
  getInquiries,
  getInquiry,
  updateInquiryStatus,
  deleteInquiry,
} = require("../controllers/inquiryController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", protect, createInquiry);
router.get("/", protect, getInquiries);
router.get("/:id", protect, getInquiry);
router.put("/:id/status", protect, updateInquiryStatus);
router.patch("/:id/status", protect, updateInquiryStatus);
router.delete("/:id", protect, deleteInquiry);

module.exports = router;
