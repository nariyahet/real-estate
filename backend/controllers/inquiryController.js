const { pool } = require("../config/db");
const {
  createInquiry: createInquiryModel,
  getInquiryById: getInquiryByIdModel,
  getInquiriesByUser,
  getInquiriesByAgent,
  getAllInquiries,
  updateInquiryStatus: updateInquiryStatusModel,
  deleteInquiry: deleteInquiryModel,
} = require("../models/inquiryModel");

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const createInquiry = async (req, res) => {
  try {
    const { property_id, message } = req.body;
    let { name, email, phone } = req.body;

    // Default to authenticated user data if not provided
    if (!name && req.user?.name) {
      name = req.user.name;
    }
    if (!email && req.user?.email) {
      email = req.user.email;
    }
    if (!phone && req.user?.phone) {
      phone = req.user.phone;
    }

    if (!property_id || !Number.isInteger(Number(property_id)) || Number(property_id) <= 0) {
      return res.status(400).json({
        success: false,
        message: "A valid property ID is required.",
      });
    }

    if (!name || !String(name).trim()) {
      return res.status(400).json({
        success: false,
        message: "Your name is required.",
      });
    }

    if (!email || !emailRegex.test(String(email).trim())) {
      return res.status(400).json({
        success: false,
        message: "A valid email address is required.",
      });
    }

    if (!message || !String(message).trim()) {
      return res.status(400).json({
        success: false,
        message: "Inquiry message cannot be empty.",
      });
    }

    if (String(message).trim().length < 5) {
      return res.status(400).json({
        success: false,
        message: "Inquiry message must be at least 5 characters long.",
      });
    }

    // Check if property exists
    const [propertyRows] = await pool.execute(
      "SELECT id FROM properties WHERE id = ? LIMIT 1",
      [Number(property_id)],
    );

    if (!propertyRows[0]) {
      return res.status(404).json({
        success: false,
        message: "The requested property was not found.",
      });
    }

    const inquiry = await createInquiryModel({
      property_id: Number(property_id),
      user_id: req.user ? req.user.id : null,
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      phone: phone ? String(phone).trim() : null,
      message: String(message).trim(),
    });

    return res.status(201).json({
      success: true,
      message: "Inquiry sent successfully. The agent will contact you soon.",
      inquiry,
    });
  } catch (error) {
    console.error("Create Inquiry Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to submit inquiry. Please try again later.",
      error: error.message,
    });
  }
};

const getInquiries = async (req, res) => {
  try {
    const userRole = req.user.role;
    const userId = req.user.id;

    if (userRole === "admin") {
      const { status, propertyId } = req.query;
      const inquiries = await getAllInquiries({ status, propertyId });

      return res.status(200).json({
        success: true,
        inquiries,
      });
    }

    if (userRole === "agent") {
      // Find the agent profile for this user
      const [agentRows] = await pool.execute(
        "SELECT id FROM agents WHERE user_id = ? LIMIT 1",
        [userId],
      );

      if (!agentRows[0]) {
        return res.status(200).json({
          success: true,
          inquiries: [],
        });
      }

      const agentId = agentRows[0].id;
      const inquiries = await getInquiriesByAgent(agentId);

      return res.status(200).json({
        success: true,
        inquiries,
      });
    }

    // Default: regular user
    const inquiries = await getInquiriesByUser(userId);

    return res.status(200).json({
      success: true,
      inquiries,
    });
  } catch (error) {
    console.error("Get Inquiries Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve inquiries.",
      error: error.message,
    });
  }
};

const getInquiry = async (req, res) => {
  try {
    const { id } = req.params;

    if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid inquiry ID.",
      });
    }

    const inquiry = await getInquiryByIdModel(Number(id));

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: "Inquiry not found.",
      });
    }

    // Role-based authorization
    if (req.user.role === "admin") {
      return res.status(200).json({
        success: true,
        inquiry,
      });
    }

    if (req.user.role === "agent") {
      const [agentRows] = await pool.execute(
        "SELECT id FROM agents WHERE user_id = ? LIMIT 1",
        [req.user.id],
      );

      const agentId = agentRows[0]?.id;

      if (!agentId || Number(inquiry.agent_id) !== Number(agentId)) {
        return res.status(403).json({
          success: false,
          message: "You do not have permission to view this inquiry.",
        });
      }

      return res.status(200).json({
        success: true,
        inquiry,
      });
    }

    // Regular user
    if (Number(inquiry.user_id) !== Number(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to view this inquiry.",
      });
    }

    return res.status(200).json({
      success: true,
      inquiry,
    });
  } catch (error) {
    console.error("Get Inquiry Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch inquiry details.",
      error: error.message,
    });
  }
};

const updateInquiryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, agent_notes } = req.body;

    if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid inquiry ID.",
      });
    }

    const allowedStatuses = ["Pending", "Contacted", "Closed", "Resolved", "Cancelled"];

    if (status !== undefined && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed values: ${allowedStatuses.join(", ")}.`,
      });
    }

    const inquiryId = Number(id);
    const existingInquiry = await getInquiryByIdModel(inquiryId);

    if (!existingInquiry) {
      return res.status(404).json({
        success: false,
        message: "Inquiry not found.",
      });
    }

    // Only assigned agent or admin can update status and notes
    if (req.user.role === "agent") {
      const [agentRows] = await pool.execute(
        "SELECT id FROM agents WHERE user_id = ? LIMIT 1",
        [req.user.id],
      );

      const agentId = agentRows[0]?.id;

      if (!agentId || Number(existingInquiry.agent_id) !== Number(agentId)) {
        return res.status(403).json({
          success: false,
          message: "You can only update inquiries for your own listings.",
        });
      }
    } else if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to update this inquiry.",
      });
    }

    const updatedInquiry = await updateInquiryStatusModel(inquiryId, {
      status,
      agent_notes,
    });

    return res.status(200).json({
      success: true,
      message: "Inquiry updated successfully.",
      inquiry: updatedInquiry,
    });
  } catch (error) {
    console.error("Update Inquiry Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update inquiry.",
      error: error.message,
    });
  }
};

const deleteInquiry = async (req, res) => {
  try {
    const { id } = req.params;

    if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid inquiry ID.",
      });
    }

    const inquiryId = Number(id);
    const existingInquiry = await getInquiryByIdModel(inquiryId);

    if (!existingInquiry) {
      return res.status(404).json({
        success: false,
        message: "Inquiry not found.",
      });
    }

    // Admins can delete any inquiry; Users can delete their own inquiry
    if (req.user.role !== "admin" && Number(existingInquiry.user_id) !== Number(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to delete this inquiry.",
      });
    }

    const deleted = await deleteInquiryModel(inquiryId);

    if (!deleted) {
      return res.status(500).json({
        success: false,
        message: "Could not delete inquiry.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Inquiry deleted successfully.",
    });
  } catch (error) {
    console.error("Delete Inquiry Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete inquiry.",
      error: error.message,
    });
  }
};

module.exports = {
  createInquiry,
  getInquiries,
  getInquiry,
  updateInquiryStatus,
  deleteInquiry,
};
