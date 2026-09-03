const { pool } = require("../config/db");

const baseInquirySelect = `
  SELECT
    i.id,
    i.user_id,
    i.property_id,
    i.agent_id,
    i.name,
    i.email,
    i.phone,
    i.message,
    i.agent_notes,
    i.status,
    i.created_at,
    i.updated_at,
    p.title AS property_title,
    p.property_type,
    p.listing_type,
    p.price AS property_price,
    p.city AS property_city,
    p.address AS property_address,
    p.status AS property_status,
    (
      SELECT pi.image_url
      FROM property_images pi
      WHERE pi.property_id = p.id
      ORDER BY pi.is_primary DESC, pi.id ASC
      LIMIT 1
    ) AS property_image,
    a.agency_name,
    u_agent.name AS agent_name,
    u_agent.email AS agent_email,
    u_agent.phone AS agent_phone
  FROM inquiries i
  LEFT JOIN properties p ON i.property_id = p.id
  LEFT JOIN agents a ON i.agent_id = a.id
  LEFT JOIN users u_agent ON a.user_id = u_agent.id
`;

const getInquiryById = async (id) => {
  const [rows] = await pool.execute(
    `
      ${baseInquirySelect}
      WHERE i.id = ?
      LIMIT 1
    `,
    [id],
  );

  return rows[0] || null;
};

const createInquiry = async ({
  property_id,
  user_id = null,
  name,
  email,
  phone = null,
  message,
}) => {
  // Determine agent_id from property
  const [propertyRows] = await pool.execute(
    `
      SELECT id, agent_id
      FROM properties
      WHERE id = ?
      LIMIT 1
    `,
    [property_id],
  );

  if (!propertyRows[0]) {
    throw new Error("Property not found");
  }

  const agentId = propertyRows[0].agent_id || null;

  const [result] = await pool.execute(
    `
      INSERT INTO inquiries
      (
        property_id,
        user_id,
        agent_id,
        name,
        email,
        phone,
        message,
        status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending')
    `,
    [
      property_id,
      user_id || null,
      agentId,
      name.trim(),
      email.trim().toLowerCase(),
      phone ? phone.trim() : null,
      message.trim(),
    ],
  );

  return getInquiryById(result.insertId);
};

const getInquiriesByUser = async (userId) => {
  const [rows] = await pool.execute(
    `
      ${baseInquirySelect}
      WHERE i.user_id = ?
      ORDER BY i.created_at DESC
    `,
    [userId],
  );

  return rows;
};

const getInquiriesByAgent = async (agentId) => {
  const [rows] = await pool.execute(
    `
      ${baseInquirySelect}
      WHERE i.agent_id = ?
      ORDER BY i.created_at DESC
    `,
    [agentId],
  );

  return rows;
};

const getAllInquiries = async ({ status = "", propertyId = "" } = {}) => {
  const conditions = [];
  const values = [];

  if (status && status !== "all") {
    conditions.push("i.status = ?");
    values.push(status);
  }

  if (propertyId) {
    conditions.push("i.property_id = ?");
    values.push(propertyId);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const [rows] = await pool.execute(
    `
      ${baseInquirySelect}
      ${whereClause}
      ORDER BY i.created_at DESC
    `,
    values,
  );

  return rows;
};

const updateInquiryStatus = async (id, { status, agent_notes = undefined }) => {
  const updates = [];
  const values = [];

  if (status !== undefined) {
    updates.push("status = ?");
    values.push(status);
  }

  if (agent_notes !== undefined) {
    updates.push("agent_notes = ?");
    values.push(agent_notes);
  }

  if (updates.length === 0) {
    return getInquiryById(id);
  }

  values.push(id);

  const [result] = await pool.execute(
    `
      UPDATE inquiries
      SET ${updates.join(", ")}
      WHERE id = ?
    `,
    values,
  );

  if (result.affectedRows === 0) {
    return null;
  }

  return getInquiryById(id);
};

const deleteInquiry = async (id) => {
  const [result] = await pool.execute(
    `
      DELETE FROM inquiries
      WHERE id = ?
    `,
    [id],
  );

  return result.affectedRows > 0;
};

const getInquiryStats = async () => {
  const [[totalResult]] = await pool.execute(
    "SELECT COUNT(*) AS totalInquiries FROM inquiries",
  );

  const [[pendingResult]] = await pool.execute(
    "SELECT COUNT(*) AS pendingInquiries FROM inquiries WHERE status = 'Pending'",
  );

  return {
    totalInquiries: Number(totalResult?.totalInquiries || 0),
    pendingInquiries: Number(pendingResult?.pendingInquiries || 0),
  };
};

module.exports = {
  createInquiry,
  getInquiryById,
  getInquiriesByUser,
  getInquiriesByAgent,
  getAllInquiries,
  updateInquiryStatus,
  deleteInquiry,
  getInquiryStats,
};
