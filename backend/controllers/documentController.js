const path = require("path");
const fs = require("fs");
const { pool } = require("../config/db");
const { getPropertyById } = require("../models/propertyModel");
const {
  getDocumentsByPropertyId,
  getDocumentById,
  createDocument,
  deleteDocumentById,
} = require("../models/documentModel");
const { uploadDir } = require("../middleware/uploadMiddleware");

/**
 * Helper to get the agent_id for a given user_id
 */
const getAgentIdForUser = async (userId) => {
  const [rows] = await pool.execute(
    `
    SELECT id
    FROM agents
    WHERE user_id = ?
    LIMIT 1
    `,
    [userId]
  );
  return rows[0]?.id || null;
};

/**
 * Helper to check whether a user is authorized to manage/view documents for a property
 */
const checkPropertyDocumentAuthorization = async (user, property) => {
  if (!user) {
    return { authorized: false, status: 401, message: "Authentication required." };
  }

  if (user.role === "admin") {
    return { authorized: true };
  }

  if (user.role === "agent") {
    const agentId = await getAgentIdForUser(user.id);
    if (!agentId) {
      return { authorized: false, status: 403, message: "Agent profile not found." };
    }

    if (Number(property.agent_id) !== Number(agentId)) {
      return {
        authorized: false,
        status: 403,
        message: "You can only access documents for your own assigned properties.",
      };
    }

    return { authorized: true, agentId };
  }

  return {
    authorized: false,
    status: 403,
    message: "You do not have permission to access property documents.",
  };
};

/**
 * GET /api/properties/:propertyId/documents
 * List all documents for a property (Admins and assigned Agent)
 */
const getPropertyDocuments = async (req, res) => {
  try {
    const { propertyId } = req.params;

    if (!Number.isInteger(Number(propertyId)) || Number(propertyId) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid property ID.",
      });
    }

    const property = await getPropertyById(Number(propertyId));
    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found.",
      });
    }

    const authCheck = await checkPropertyDocumentAuthorization(req.user, property);
    if (!authCheck.authorized) {
      return res.status(authCheck.status).json({
        success: false,
        message: authCheck.message,
      });
    }

    const documents = await getDocumentsByPropertyId(Number(propertyId));

    // Sanitize document output: don't expose raw server filesystem paths
    const sanitizedDocuments = documents.map((doc) => ({
      id: doc.id,
      propertyId: doc.property_id,
      title: doc.title,
      documentType: doc.document_type,
      originalFilename: doc.original_filename,
      fileSize: doc.file_size,
      mimeType: doc.mime_type,
      uploadedBy: {
        id: doc.uploaded_by,
        name: doc.uploader_name || "Unknown",
        email: doc.uploader_email || "",
        role: doc.uploader_role || "agent",
      },
      createdAt: doc.created_at,
      updatedAt: doc.updated_at,
    }));

    return res.status(200).json({
      success: true,
      property: {
        id: property.id,
        title: property.title,
        propertyType: property.property_type,
        city: property.city,
        agentId: property.agent_id,
      },
      documents: sanitizedDocuments,
      totalCount: sanitizedDocuments.length,
    });
  } catch (error) {
    console.error("Get Property Documents Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch property documents.",
    });
  }
};

/**
 * POST /api/properties/:propertyId/documents
 * Upload a document to a property vault
 */
const uploadPropertyDocument = async (req, res) => {
  const uploadedFile = req.file;

  const cleanupUploadedFile = () => {
    if (uploadedFile && uploadedFile.path) {
      try {
        if (fs.existsSync(uploadedFile.path)) {
          fs.unlinkSync(uploadedFile.path);
        }
      } catch (e) {
        console.error("File cleanup error:", e);
      }
    }
  };

  try {
    const { propertyId } = req.params;

    if (!Number.isInteger(Number(propertyId)) || Number(propertyId) <= 0) {
      cleanupUploadedFile();
      return res.status(400).json({
        success: false,
        message: "Invalid property ID.",
      });
    }

    const property = await getPropertyById(Number(propertyId));
    if (!property) {
      cleanupUploadedFile();
      return res.status(404).json({
        success: false,
        message: "Property not found.",
      });
    }

    const authCheck = await checkPropertyDocumentAuthorization(req.user, property);
    if (!authCheck.authorized) {
      cleanupUploadedFile();
      return res.status(authCheck.status).json({
        success: false,
        message: authCheck.message,
      });
    }

    if (!uploadedFile) {
      return res.status(400).json({
        success: false,
        message: "Please select a document file to upload.",
      });
    }

    const { title, document_type } = req.body;

    if (!title || !String(title).trim()) {
      cleanupUploadedFile();
      return res.status(400).json({
        success: false,
        message: "Document title is required.",
      });
    }

    const allowedTypes = [
      "Ownership Document",
      "Sale Agreement",
      "Property Tax Document",
      "Registration Document",
      "Title Document",
      "NOC",
      "Inspection Report",
      "Floor Plan",
      "Other",
    ];

    const finalType = allowedTypes.includes(document_type)
      ? document_type
      : "Other";

    // Safe filename and path handling
    const safeStoredFilename = path.basename(uploadedFile.filename);
    const safeOriginalFilename = path.basename(uploadedFile.originalname).slice(0, 255);

    const newDoc = await createDocument({
      property_id: Number(propertyId),
      title: String(title).trim().slice(0, 200),
      document_type: finalType,
      original_filename: safeOriginalFilename,
      file_path: safeStoredFilename,
      file_size: uploadedFile.size,
      mime_type: uploadedFile.mimetype,
      uploaded_by: req.user.id,
    });

    return res.status(201).json({
      success: true,
      message: "Document uploaded successfully.",
      document: {
        id: newDoc.id,
        propertyId: newDoc.property_id,
        title: newDoc.title,
        documentType: newDoc.document_type,
        originalFilename: newDoc.original_filename,
        fileSize: newDoc.file_size,
        mimeType: newDoc.mime_type,
        uploadedBy: {
          id: req.user.id,
          name: req.user.name,
          role: req.user.role,
        },
        createdAt: newDoc.created_at,
      },
    });
  } catch (error) {
    cleanupUploadedFile();
    console.error("Upload Property Document Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to upload property document.",
    });
  }
};

/**
 * GET /api/documents/:id/download
 * Download a document file securely
 */
const downloadDocument = async (req, res) => {
  try {
    const { id } = req.params;

    if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid document ID.",
      });
    }

    const document = await getDocumentById(Number(id));
    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found.",
      });
    }

    const property = {
      id: document.property_id,
      agent_id: document.property_agent_id,
    };

    const authCheck = await checkPropertyDocumentAuthorization(req.user, property);
    if (!authCheck.authorized) {
      return res.status(authCheck.status).json({
        success: false,
        message: authCheck.message,
      });
    }

    // Secure path resolution against directory traversal
    const safeFilename = path.basename(document.file_path);
    const absolutePath = path.resolve(uploadDir, safeFilename);

    // Verify file remains within uploadDir
    if (!absolutePath.startsWith(path.resolve(uploadDir))) {
      return res.status(400).json({
        success: false,
        message: "Invalid file location path.",
      });
    }

    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({
        success: false,
        message: "Document file not found on server storage.",
      });
    }

    return res.download(absolutePath, document.original_filename, (err) => {
      if (err && !res.headersSent) {
        console.error("File download streaming error:", err);
        return res.status(500).json({
          success: false,
          message: "Failed to download document.",
        });
      }
    });
  } catch (error) {
    console.error("Download Document Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to download document.",
    });
  }
};

/**
 * DELETE /api/documents/:id
 * Delete a document from vault and disk
 */
const deletePropertyDocument = async (req, res) => {
  try {
    const { id } = req.params;

    if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid document ID.",
      });
    }

    const document = await getDocumentById(Number(id));
    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found.",
      });
    }

    const property = {
      id: document.property_id,
      agent_id: document.property_agent_id,
    };

    const authCheck = await checkPropertyDocumentAuthorization(req.user, property);
    if (!authCheck.authorized) {
      return res.status(authCheck.status).json({
        success: false,
        message: authCheck.message,
      });
    }

    // Safely remove file from disk
    try {
      const safeFilename = path.basename(document.file_path);
      const absolutePath = path.resolve(uploadDir, safeFilename);
      if (fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath);
      }
    } catch (fsErr) {
      console.warn("Notice: file removal from disk had issue or was already deleted:", fsErr.message);
    }

    await deleteDocumentById(Number(id));

    return res.status(200).json({
      success: true,
      message: "Document deleted successfully.",
    });
  } catch (error) {
    console.error("Delete Document Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete document.",
    });
  }
};

module.exports = {
  getPropertyDocuments,
  uploadPropertyDocument,
  downloadDocument,
  deletePropertyDocument,
};
