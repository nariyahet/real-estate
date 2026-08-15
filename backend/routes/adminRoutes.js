const express = require("express");

const {
  getDashboardStats,
  getAllUsers,
  getAllAgents,
  updateUserRole,
  getAllAdminProperties,
  updateAdminPropertyStatus,
  deleteAdminProperty,
} = require("../controllers/adminController");

const { protect, adminOnly } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/dashboard-stats", protect, adminOnly, getDashboardStats);

router.get("/users", protect, adminOnly, getAllUsers);

router.get("/agents", protect, adminOnly, getAllAgents);

router.put("/users/:id/role", protect, adminOnly, updateUserRole);

router.get("/properties", protect, adminOnly, getAllAdminProperties);

router.put(
  "/properties/:id/status",
  protect,
  adminOnly,
  updateAdminPropertyStatus,
);

router.delete("/properties/:id", protect, adminOnly, deleteAdminProperty);

module.exports = router;
