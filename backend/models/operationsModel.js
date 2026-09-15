const { pool } = require('../config/db');

// ==========================================
// 1. OWNERSHIP VERIFICATION (Feature #3)
// ==========================================

const DEFAULT_VERIFICATION_CHECKLIST = [
  { key: 'title_deed', label: 'Title Deed Verification' },
  { key: 'encumbrance_cert', label: 'Encumbrance Certificate' },
  { key: 'municipal_tax_clearance', label: 'Municipal Tax Clearance' },
  { key: 'approved_building_plan', label: 'Approved Building Plan' },
  { key: 'occupancy_cert', label: 'Occupancy Certificate' },
  { key: 'local_authority_noc', label: 'Local Authority NOC' },
  { key: 'ownership_verification', label: 'Property Ownership Verification' },
  { key: 'tax_dues_verification', label: 'Property Tax / Dues Verification' },
  { key: 'physical_inspection', label: 'Physical Property Inspection' },
];

const getVerificationByPropertyId = async (propertyId) => {
  const [rows] = await pool.execute(
    `
    SELECT
      v.id,
      v.property_id,
      v.status,
      v.verified_by,
      v.verification_date,
      v.notes,
      v.ownership_document_id,
      v.created_at,
      v.updated_at,
      u.name AS verified_by_name,
      u.email AS verified_by_email,
      u.role AS verified_by_role,
      d.title AS document_title,
      d.original_filename AS document_filename
    FROM property_verifications v
    LEFT JOIN users u ON v.verified_by = u.id
    LEFT JOIN property_documents d ON v.ownership_document_id = d.id
    WHERE v.property_id = ?
    LIMIT 1
    `,
    [propertyId]
  );

  return rows[0] || null;
};

const getVerificationHistory = async (propertyId) => {
  const [rows] = await pool.execute(
    `
    SELECT
      vh.id,
      vh.property_id,
      vh.status,
      vh.notes,
      vh.verified_by,
      vh.created_at,
      u.name AS verified_by_name,
      u.role AS verified_by_role
    FROM property_verification_history vh
    LEFT JOIN users u ON vh.verified_by = u.id
    WHERE vh.property_id = ?
    ORDER BY vh.created_at DESC
    `,
    [propertyId]
  );

  return rows;
};

const upsertVerification = async (propertyId, { status, notes, verified_by, ownership_document_id = null }) => {
  const existing = await getVerificationByPropertyId(propertyId);
  const verificationDate = (status === 'Verified' || status === 'Rejected') ? new Date() : null;

  if (existing) {
    await pool.execute(
      `
      UPDATE property_verifications
      SET status = ?, notes = ?, verified_by = ?, verification_date = ?, ownership_document_id = ?, updated_at = NOW()
      WHERE property_id = ?
      `,
      [status, notes || null, verified_by, verificationDate, ownership_document_id || null, propertyId]
    );
  } else {
    await pool.execute(
      `
      INSERT INTO property_verifications
        (property_id, status, notes, verified_by, verification_date, ownership_document_id)
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [propertyId, status, notes || null, verified_by, verificationDate, ownership_document_id || null]
    );
  }

  // Record history
  await pool.execute(
    `
    INSERT INTO property_verification_history (property_id, status, notes, verified_by)
    VALUES (?, ?, ?, ?)
    `,
    [propertyId, status, notes || null, verified_by]
  );

  return getVerificationByPropertyId(propertyId);
};

// ==========================================
// 2. VERIFICATION CHECKLIST (Feature #4)
// ==========================================

const ensureChecklistSeeded = async (propertyId) => {
  const [rows] = await pool.execute(
    `SELECT item_key FROM property_checklists WHERE property_id = ?`,
    [propertyId]
  );
  const existingKeys = new Set(rows.map(r => r.item_key));
  const validKeys = new Set(DEFAULT_VERIFICATION_CHECKLIST.map(i => i.key));

  for (const item of DEFAULT_VERIFICATION_CHECKLIST) {
    if (!existingKeys.has(item.key)) {
      await pool.execute(
        `INSERT INTO property_checklists (property_id, item_key, item_label, is_completed)
         VALUES (?, ?, ?, FALSE)`,
        [propertyId, item.key, item.label]
      );
    } else {
      await pool.execute(
        `UPDATE property_checklists SET item_label = ? WHERE property_id = ? AND item_key = ?`,
        [item.label, propertyId, item.key]
      );
    }
  }

  for (const key of existingKeys) {
    if (!validKeys.has(key)) {
      await pool.execute(
        `DELETE FROM property_checklists WHERE property_id = ? AND item_key = ?`,
        [propertyId, key]
      );
    }
  }
};

const getChecklistByPropertyId = async (propertyId) => {
  await ensureChecklistSeeded(propertyId);

  const [rows] = await pool.execute(
    `
    SELECT
      c.id,
      c.property_id,
      c.item_key,
      c.item_label,
      c.is_completed,
      c.completed_by,
      c.completed_at,
      c.notes,
      c.created_at,
      c.updated_at,
      u.name AS completed_by_name
    FROM property_checklists c
    LEFT JOIN users u ON c.completed_by = u.id
    WHERE c.property_id = ?
    ORDER BY c.id ASC
    `,
    [propertyId]
  );

  const totalItems = rows.length;
  const completedItems = rows.filter(r => Boolean(r.is_completed)).length;
  const progressPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return {
    items: rows,
    totalItems,
    completedItems,
    progressPercentage,
    isFullyVerified: completedItems === totalItems && totalItems > 0
  };
};

const updateChecklistItem = async (propertyId, itemKey, { is_completed, notes, completed_by }) => {
  const completedAt = is_completed ? new Date() : null;
  const completedByUser = is_completed ? completed_by : null;

  await pool.execute(
    `
    UPDATE property_checklists
    SET is_completed = ?, completed_by = ?, completed_at = ?, notes = ?, updated_at = NOW()
    WHERE property_id = ? AND item_key = ?
    `,
    [is_completed ? 1 : 0, completedByUser, completedAt, notes || null, propertyId, itemKey]
  );

  return getChecklistByPropertyId(propertyId);
};

// ==========================================
// 3. PROPERTY INSPECTIONS (Feature #5)
// ==========================================

const getInspectionsByPropertyId = async (propertyId) => {
  const [rows] = await pool.execute(
    `
    SELECT
      i.id,
      i.property_id,
      i.inspector_name,
      i.inspection_type,
      i.scheduled_date,
      i.status,
      i.condition_rating,
      i.findings,
      i.notes,
      i.document_id,
      i.created_by,
      i.created_at,
      i.updated_at,
      u.name AS creator_name,
      d.title AS document_title,
      d.original_filename AS document_filename
    FROM property_inspections i
    LEFT JOIN users u ON i.created_by = u.id
    LEFT JOIN property_documents d ON i.document_id = d.id
    WHERE i.property_id = ?
    ORDER BY i.scheduled_date DESC
    `,
    [propertyId]
  );

  return rows;
};

const getInspectionById = async (inspectionId) => {
  const [rows] = await pool.execute(
    `
    SELECT
      i.id,
      i.property_id,
      i.inspector_name,
      i.inspection_type,
      i.scheduled_date,
      i.status,
      i.condition_rating,
      i.findings,
      i.notes,
      i.document_id,
      i.created_by,
      i.created_at,
      i.updated_at,
      p.agent_id AS property_agent_id
    FROM property_inspections i
    INNER JOIN properties p ON i.property_id = p.id
    WHERE i.id = ?
    LIMIT 1
    `,
    [inspectionId]
  );

  return rows[0] || null;
};

const createInspection = async (propertyId, { inspector_name, inspection_type, scheduled_date, condition_rating, findings, notes, document_id, created_by }) => {
  const [result] = await pool.execute(
    `
    INSERT INTO property_inspections
      (property_id, inspector_name, inspection_type, scheduled_date, condition_rating, findings, notes, document_id, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      propertyId,
      inspector_name,
      inspection_type || 'Routine',
      scheduled_date,
      condition_rating || null,
      findings || null,
      notes || null,
      document_id || null,
      created_by
    ]
  );

  return getInspectionById(result.insertId);
};

const updateInspection = async (inspectionId, { status, condition_rating, findings, notes, document_id }) => {
  await pool.execute(
    `
    UPDATE property_inspections
    SET status = COALESCE(?, status),
        condition_rating = COALESCE(?, condition_rating),
        findings = COALESCE(?, findings),
        notes = COALESCE(?, notes),
        document_id = COALESCE(?, document_id),
        updated_at = NOW()
    WHERE id = ?
    `,
    [status || null, condition_rating || null, findings || null, notes || null, document_id || null, inspectionId]
  );

  return getInspectionById(inspectionId);
};

const deleteInspection = async (inspectionId) => {
  const [result] = await pool.execute(
    `DELETE FROM property_inspections WHERE id = ?`,
    [inspectionId]
  );
  return result.affectedRows > 0;
};

// ==========================================
// 4. MAINTENANCE MANAGEMENT (Feature #6)
// ==========================================

const getMaintenanceByPropertyId = async (propertyId) => {
  const [rows] = await pool.execute(
    `
    SELECT
      m.id,
      m.property_id,
      m.title,
      m.description,
      m.category,
      m.priority,
      m.status,
      m.assigned_to,
      m.estimated_cost,
      m.actual_cost,
      m.scheduled_date,
      m.completed_date,
      m.notes,
      m.created_by,
      m.created_at,
      m.updated_at,
      u.name AS creator_name
    FROM property_maintenance m
    LEFT JOIN users u ON m.created_by = u.id
    WHERE m.property_id = ?
    ORDER BY m.created_at DESC
    `,
    [propertyId]
  );

  return rows;
};

const getMaintenanceById = async (maintenanceId) => {
  const [rows] = await pool.execute(
    `
    SELECT
      m.id,
      m.property_id,
      m.title,
      m.description,
      m.category,
      m.priority,
      m.status,
      m.assigned_to,
      m.estimated_cost,
      m.actual_cost,
      m.scheduled_date,
      m.completed_date,
      m.notes,
      m.created_by,
      m.created_at,
      m.updated_at,
      p.agent_id AS property_agent_id
    FROM property_maintenance m
    INNER JOIN properties p ON m.property_id = p.id
    WHERE m.id = ?
    LIMIT 1
    `,
    [maintenanceId]
  );

  return rows[0] || null;
};

const createMaintenance = async (propertyId, { title, description, category, priority, assigned_to, estimated_cost, scheduled_date, notes, created_by }) => {
  const [result] = await pool.execute(
    `
    INSERT INTO property_maintenance
      (property_id, title, description, category, priority, assigned_to, estimated_cost, scheduled_date, notes, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      propertyId,
      title,
      description || null,
      category || 'General',
      priority || 'Medium',
      assigned_to || null,
      Number(estimated_cost) || 0,
      scheduled_date || null,
      notes || null,
      created_by
    ]
  );

  return getMaintenanceById(result.insertId);
};

const updateMaintenance = async (maintenanceId, { status, assigned_to, actual_cost, completed_date, notes }) => {
  await pool.execute(
    `
    UPDATE property_maintenance
    SET status = COALESCE(?, status),
        assigned_to = COALESCE(?, assigned_to),
        actual_cost = COALESCE(?, actual_cost),
        completed_date = COALESCE(?, completed_date),
        notes = COALESCE(?, notes),
        updated_at = NOW()
    WHERE id = ?
    `,
    [status || null, assigned_to || null, actual_cost !== undefined ? Number(actual_cost) : null, completed_date || null, notes || null, maintenanceId]
  );

  return getMaintenanceById(maintenanceId);
};

const deleteMaintenance = async (maintenanceId) => {
  const [result] = await pool.execute(
    `DELETE FROM property_maintenance WHERE id = ?`,
    [maintenanceId]
  );
  return result.affectedRows > 0;
};

// ==========================================
// 5. PROPERTY LIFECYCLE TRACKING (Feature #7)
// ==========================================

const getLifecycleHistory = async (propertyId) => {
  const [rows] = await pool.execute(
    `
    SELECT
      lt.id,
      lt.property_id,
      lt.from_state,
      lt.to_state,
      lt.notes,
      lt.changed_by,
      lt.created_at,
      u.name AS changed_by_name,
      u.role AS changed_by_role
    FROM property_lifecycle_transitions lt
    LEFT JOIN users u ON lt.changed_by = u.id
    WHERE lt.property_id = ?
    ORDER BY lt.created_at DESC
    `,
    [propertyId]
  );

  return rows;
};

const recordLifecycleTransition = async (propertyId, { from_state, to_state, notes, changed_by }) => {
  const [result] = await pool.execute(
    `
    INSERT INTO property_lifecycle_transitions
      (property_id, from_state, to_state, notes, changed_by)
    VALUES (?, ?, ?, ?, ?)
    `,
    [propertyId, from_state || null, to_state, notes || null, changed_by]
  );

  const [rows] = await pool.execute(
    `SELECT * FROM property_lifecycle_transitions WHERE id = ?`,
    [result.insertId]
  );
  return rows[0] || null;
};

// ==========================================
// 6. PROPERTY AUDIT TRAIL (Feature #8)
// ==========================================

const getAuditLogsByPropertyId = async (propertyId, { limit = 50, offset = 0 } = {}) => {
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
  const safeOffset = Math.max(Number(offset) || 0, 0);

  const [rows] = await pool.query(
    `
    SELECT
      id,
      property_id,
      user_id,
      user_name,
      user_role,
      action,
      entity,
      entity_id,
      details,
      created_at
    FROM property_audit_logs
    WHERE property_id = ?
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
    `,
    [propertyId, safeLimit, safeOffset]
  );

  const [countResult] = await pool.query(
    `SELECT COUNT(*) AS total FROM property_audit_logs WHERE property_id = ?`,
    [propertyId]
  );

  return {
    logs: rows,
    total: countResult[0]?.total || 0,
    limit: safeLimit,
    offset: safeOffset
  };
};

module.exports = {
  getVerificationByPropertyId,
  getVerificationHistory,
  upsertVerification,
  getChecklistByPropertyId,
  updateChecklistItem,
  getInspectionsByPropertyId,
  getInspectionById,
  createInspection,
  updateInspection,
  deleteInspection,
  getMaintenanceByPropertyId,
  getMaintenanceById,
  createMaintenance,
  updateMaintenance,
  deleteMaintenance,
  getLifecycleHistory,
  recordLifecycleTransition,
  getAuditLogsByPropertyId,
};
