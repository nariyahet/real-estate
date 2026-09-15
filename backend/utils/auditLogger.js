const { pool } = require('../config/db');

/**
 * Log an action to the property_audit_logs table.
 * Non-blocking / safe: Failures in logging should not crash or abort main operations.
 */
async function logAudit({ propertyId = null, userId, userName, userRole, action, entity, entityId = null, details = null }) {
  try {
    if (!userId || !action || !entity) {
      console.warn('Audit logger skipped: missing required parameters (userId, action, entity)');
      return;
    }

    const query = `
      INSERT INTO property_audit_logs
        (property_id, user_id, user_name, user_role, action, entity, entity_id, details)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const serializedDetails = details ? JSON.stringify(details) : null;
    await pool.query(query, [
      propertyId,
      userId,
      userName || 'System User',
      userRole || 'User',
      action,
      entity,
      entityId,
      serializedDetails
    ]);
  } catch (error) {
    console.error('Failed to write audit log entry:', error.message);
  }
}

module.exports = {
  logAudit
};
