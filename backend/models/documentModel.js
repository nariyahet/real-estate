const { pool } = require("../config/db");

/**
 * Fetch all documents for a given property
 */
const getDocumentsByPropertyId = async (propertyId) => {
  const [rows] = await pool.execute(
    `
    SELECT
      d.id,
      d.property_id,
      d.title,
      d.document_type,
      d.original_filename,
      d.file_path,
      d.file_size,
      d.mime_type,
      d.uploaded_by,
      d.created_at,
      d.updated_at,
      u.name AS uploader_name,
      u.email AS uploader_email,
      u.role AS uploader_role
    FROM property_documents d
    LEFT JOIN users u ON d.uploaded_by = u.id
    WHERE d.property_id = ?
    ORDER BY d.created_at DESC
    `,
    [propertyId]
  );

  return rows;
};

/**
 * Fetch a single document by its ID, with property and agent ownership info
 */
const getDocumentById = async (documentId) => {
  const [rows] = await pool.execute(
    `
    SELECT
      d.id,
      d.property_id,
      d.title,
      d.document_type,
      d.original_filename,
      d.file_path,
      d.file_size,
      d.mime_type,
      d.uploaded_by,
      d.created_at,
      d.updated_at,
      p.title AS property_title,
      p.agent_id AS property_agent_id,
      p.property_type,
      p.city AS property_city,
      u.name AS uploader_name,
      u.role AS uploader_role
    FROM property_documents d
    INNER JOIN properties p ON d.property_id = p.id
    LEFT JOIN users u ON d.uploaded_by = u.id
    WHERE d.id = ?
    LIMIT 1
    `,
    [documentId]
  );

  return rows[0] || null;
};

/**
 * Insert a new property document record
 */
const createDocument = async ({
  property_id,
  title,
  document_type,
  original_filename,
  file_path,
  file_size,
  mime_type,
  uploaded_by,
}) => {
  const [result] = await pool.execute(
    `
    INSERT INTO property_documents (
      property_id,
      title,
      document_type,
      original_filename,
      file_path,
      file_size,
      mime_type,
      uploaded_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      property_id,
      title,
      document_type || "Other",
      original_filename,
      file_path,
      file_size,
      mime_type,
      uploaded_by,
    ]
  );

  return getDocumentById(result.insertId);
};

/**
 * Delete a document record by ID
 */
const deleteDocumentById = async (documentId) => {
  const [result] = await pool.execute(
    `
    DELETE FROM property_documents
    WHERE id = ?
    `,
    [documentId]
  );

  return result.affectedRows > 0;
};

module.exports = {
  getDocumentsByPropertyId,
  getDocumentById,
  createDocument,
  deleteDocumentById,
};
