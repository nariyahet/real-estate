const { pool } = require('../config/db');
const { getPropertyById, updateProperty } = require('../models/propertyModel');
const {
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
} = require('../models/operationsModel');
const { logAudit } = require('../utils/auditLogger');

// Authorization helper: Only Admin or Assigned Agent
const getAgentIdForUser = async (userId) => {
  const [rows] = await pool.execute(
    `SELECT id FROM agents WHERE user_id = ? LIMIT 1`,
    [userId]
  );
  return rows[0]?.id || null;
};

const checkPropertyAuthorization = async (user, property) => {
  if (!user) {
    return { authorized: false, status: 401, message: 'Authentication required.' };
  }

  if (user.role === 'admin') {
    return { authorized: true };
  }

  if (user.role === 'agent') {
    const agentId = await getAgentIdForUser(user.id);
    if (!agentId) {
      return { authorized: false, status: 403, message: 'Agent profile not found.' };
    }

    if (Number(property.agent_id) !== Number(agentId)) {
      return {
        authorized: false,
        status: 403,
        message: 'You can only manage operations for your own assigned properties.',
      };
    }

    return { authorized: true, agentId };
  }

  return {
    authorized: false,
    status: 403,
    message: 'Access restricted: Only Administrators and the assigned Listing Agent can access property operations.',
  };
};

// ==========================================
// FEATURE #3: OWNERSHIP VERIFICATION
// ==========================================

const getPropertyVerification = async (req, res) => {
  try {
    const { propertyId } = req.params;
    const property = await getPropertyById(Number(propertyId));
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found.' });
    }

    const authCheck = await checkPropertyAuthorization(req.user, property);
    if (!authCheck.authorized) {
      return res.status(authCheck.status).json({ success: false, message: authCheck.message });
    }

    let verification = await getVerificationByPropertyId(Number(propertyId));
    if (!verification) {
      verification = {
        id: null,
        property_id: Number(propertyId),
        status: 'Pending',
        verified_by: null,
        verification_date: null,
        notes: null,
        ownership_document_id: null,
        verified_by_name: null,
        verified_by_email: null,
        document_title: null,
      };
    }

    const history = await getVerificationHistory(Number(propertyId));

    return res.status(200).json({
      success: true,
      verification,
      history,
    });
  } catch (error) {
    console.error('Get Verification Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch ownership verification.' });
  }
};

const updatePropertyVerification = async (req, res) => {
  try {
    const { propertyId } = req.params;
    const { status, notes, ownership_document_id } = req.body;

    const property = await getPropertyById(Number(propertyId));
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found.' });
    }

    const authCheck = await checkPropertyAuthorization(req.user, property);
    if (!authCheck.authorized) {
      return res.status(authCheck.status).json({ success: false, message: authCheck.message });
    }

    const validStatuses = ['Pending', 'Verified', 'Rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: `Status must be one of: ${validStatuses.join(', ')}` });
    }

    const updated = await upsertVerification(Number(propertyId), {
      status,
      notes,
      verified_by: req.user.id,
      ownership_document_id: ownership_document_id ? Number(ownership_document_id) : null,
    });

    await logAudit({
      propertyId: Number(propertyId),
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'UPDATE_OWNERSHIP_VERIFICATION',
      entity: 'VERIFICATION',
      entityId: updated?.id || null,
      details: { status, notes, ownership_document_id },
    });

    const history = await getVerificationHistory(Number(propertyId));

    return res.status(200).json({
      success: true,
      message: `Ownership verification updated to ${status}.`,
      verification: updated,
      history,
    });
  } catch (error) {
    console.error('Update Verification Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update verification status.' });
  }
};

// ==========================================
// FEATURE #4: VERIFICATION CHECKLIST
// ==========================================

const getPropertyChecklist = async (req, res) => {
  try {
    const { propertyId } = req.params;
    const property = await getPropertyById(Number(propertyId));
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found.' });
    }

    const authCheck = await checkPropertyAuthorization(req.user, property);
    if (!authCheck.authorized) {
      return res.status(authCheck.status).json({ success: false, message: authCheck.message });
    }

    const checklistData = await getChecklistByPropertyId(Number(propertyId));

    return res.status(200).json({
      success: true,
      ...checklistData,
    });
  } catch (error) {
    console.error('Get Checklist Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch verification checklist.' });
  }
};

const updatePropertyChecklistItem = async (req, res) => {
  try {
    const { propertyId, itemKey } = req.params;
    const { is_completed, notes } = req.body;

    const property = await getPropertyById(Number(propertyId));
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found.' });
    }

    const authCheck = await checkPropertyAuthorization(req.user, property);
    if (!authCheck.authorized) {
      return res.status(authCheck.status).json({ success: false, message: authCheck.message });
    }

    const checklistData = await updateChecklistItem(Number(propertyId), itemKey, {
      is_completed: Boolean(is_completed),
      notes,
      completed_by: req.user.id,
    });

    await logAudit({
      propertyId: Number(propertyId),
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: is_completed ? 'CHECKLIST_ITEM_COMPLETED' : 'CHECKLIST_ITEM_UNCHECKED',
      entity: 'CHECKLIST',
      details: { itemKey, is_completed: Boolean(is_completed), notes },
    });

    return res.status(200).json({
      success: true,
      message: 'Checklist item updated.',
      ...checklistData,
    });
  } catch (error) {
    console.error('Update Checklist Item Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update checklist item.' });
  }
};

// ==========================================
// FEATURE #5: PROPERTY INSPECTIONS
// ==========================================

const getPropertyInspections = async (req, res) => {
  try {
    const { propertyId } = req.params;
    const property = await getPropertyById(Number(propertyId));
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found.' });
    }

    const authCheck = await checkPropertyAuthorization(req.user, property);
    if (!authCheck.authorized) {
      return res.status(authCheck.status).json({ success: false, message: authCheck.message });
    }

    const inspections = await getInspectionsByPropertyId(Number(propertyId));

    return res.status(200).json({
      success: true,
      inspections,
      totalCount: inspections.length,
    });
  } catch (error) {
    console.error('Get Inspections Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch inspections.' });
  }
};

const createPropertyInspection = async (req, res) => {
  try {
    const { propertyId } = req.params;
    const { inspector_name, inspection_type, scheduled_date, condition_rating, findings, notes, document_id } = req.body;

    const property = await getPropertyById(Number(propertyId));
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found.' });
    }

    const authCheck = await checkPropertyAuthorization(req.user, property);
    if (!authCheck.authorized) {
      return res.status(authCheck.status).json({ success: false, message: authCheck.message });
    }

    if (!inspector_name || !scheduled_date) {
      return res.status(400).json({ success: false, message: 'Inspector name and scheduled date are required.' });
    }

    const inspection = await createInspection(Number(propertyId), {
      inspector_name,
      inspection_type,
      scheduled_date,
      condition_rating,
      findings,
      notes,
      document_id: document_id ? Number(document_id) : null,
      created_by: req.user.id,
    });

    await logAudit({
      propertyId: Number(propertyId),
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'SCHEDULE_INSPECTION',
      entity: 'INSPECTION',
      entityId: inspection?.id || null,
      details: { inspector_name, inspection_type, scheduled_date },
    });

    return res.status(201).json({
      success: true,
      message: 'Inspection scheduled successfully.',
      inspection,
    });
  } catch (error) {
    console.error('Create Inspection Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to schedule inspection.' });
  }
};

const updatePropertyInspection = async (req, res) => {
  try {
    const { inspectionId } = req.params;
    const { status, condition_rating, findings, notes, document_id } = req.body;

    const inspection = await getInspectionById(Number(inspectionId));
    if (!inspection) {
      return res.status(404).json({ success: false, message: 'Inspection not found.' });
    }

    const property = await getPropertyById(inspection.property_id);
    const authCheck = await checkPropertyAuthorization(req.user, property);
    if (!authCheck.authorized) {
      return res.status(authCheck.status).json({ success: false, message: authCheck.message });
    }

    const updated = await updateInspection(Number(inspectionId), {
      status,
      condition_rating,
      findings,
      notes,
      document_id: document_id ? Number(document_id) : null,
    });

    await logAudit({
      propertyId: inspection.property_id,
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'UPDATE_INSPECTION',
      entity: 'INSPECTION',
      entityId: Number(inspectionId),
      details: { status, condition_rating, findings },
    });

    return res.status(200).json({
      success: true,
      message: 'Inspection updated successfully.',
      inspection: updated,
    });
  } catch (error) {
    console.error('Update Inspection Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update inspection.' });
  }
};

const deletePropertyInspection = async (req, res) => {
  try {
    const { inspectionId } = req.params;

    const inspection = await getInspectionById(Number(inspectionId));
    if (!inspection) {
      return res.status(404).json({ success: false, message: 'Inspection not found.' });
    }

    const property = await getPropertyById(inspection.property_id);
    const authCheck = await checkPropertyAuthorization(req.user, property);
    if (!authCheck.authorized) {
      return res.status(authCheck.status).json({ success: false, message: authCheck.message });
    }

    await deleteInspection(Number(inspectionId));

    await logAudit({
      propertyId: inspection.property_id,
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'DELETE_INSPECTION',
      entity: 'INSPECTION',
      entityId: Number(inspectionId),
      details: { inspector_name: inspection.inspector_name, scheduled_date: inspection.scheduled_date },
    });

    return res.status(200).json({
      success: true,
      message: 'Inspection deleted successfully.',
    });
  } catch (error) {
    console.error('Delete Inspection Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete inspection.' });
  }
};

// ==========================================
// FEATURE #6: MAINTENANCE MANAGEMENT
// ==========================================

const getPropertyMaintenance = async (req, res) => {
  try {
    const { propertyId } = req.params;
    const property = await getPropertyById(Number(propertyId));
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found.' });
    }

    const authCheck = await checkPropertyAuthorization(req.user, property);
    if (!authCheck.authorized) {
      return res.status(authCheck.status).json({ success: false, message: authCheck.message });
    }

    const maintenanceList = await getMaintenanceByPropertyId(Number(propertyId));

    return res.status(200).json({
      success: true,
      maintenance: maintenanceList,
      totalCount: maintenanceList.length,
    });
  } catch (error) {
    console.error('Get Maintenance Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch maintenance requests.' });
  }
};

const createPropertyMaintenance = async (req, res) => {
  try {
    const { propertyId } = req.params;
    const { title, description, category, priority, assigned_to, estimated_cost, scheduled_date, notes } = req.body;

    const property = await getPropertyById(Number(propertyId));
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found.' });
    }

    const authCheck = await checkPropertyAuthorization(req.user, property);
    if (!authCheck.authorized) {
      return res.status(authCheck.status).json({ success: false, message: authCheck.message });
    }

    if (!title) {
      return res.status(400).json({ success: false, message: 'Maintenance title is required.' });
    }

    const maintenance = await createMaintenance(Number(propertyId), {
      title,
      description,
      category,
      priority,
      assigned_to,
      estimated_cost,
      scheduled_date,
      notes,
      created_by: req.user.id,
    });

    await logAudit({
      propertyId: Number(propertyId),
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'CREATE_MAINTENANCE_TICKET',
      entity: 'MAINTENANCE',
      entityId: maintenance?.id || null,
      details: { title, category, priority, estimated_cost },
    });

    return res.status(201).json({
      success: true,
      message: 'Maintenance ticket created successfully.',
      maintenance,
    });
  } catch (error) {
    console.error('Create Maintenance Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create maintenance ticket.' });
  }
};

const updatePropertyMaintenance = async (req, res) => {
  try {
    const { maintenanceId } = req.params;
    const { status, assigned_to, actual_cost, completed_date, notes } = req.body;

    const maintenance = await getMaintenanceById(Number(maintenanceId));
    if (!maintenance) {
      return res.status(404).json({ success: false, message: 'Maintenance ticket not found.' });
    }

    const property = await getPropertyById(maintenance.property_id);
    const authCheck = await checkPropertyAuthorization(req.user, property);
    if (!authCheck.authorized) {
      return res.status(authCheck.status).json({ success: false, message: authCheck.message });
    }

    const updated = await updateMaintenance(Number(maintenanceId), {
      status,
      assigned_to,
      actual_cost,
      completed_date,
      notes,
    });

    await logAudit({
      propertyId: maintenance.property_id,
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'UPDATE_MAINTENANCE_TICKET',
      entity: 'MAINTENANCE',
      entityId: Number(maintenanceId),
      details: { status, actual_cost, completed_date },
    });

    return res.status(200).json({
      success: true,
      message: 'Maintenance ticket updated successfully.',
      maintenance: updated,
    });
  } catch (error) {
    console.error('Update Maintenance Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update maintenance ticket.' });
  }
};

const deletePropertyMaintenance = async (req, res) => {
  try {
    const { maintenanceId } = req.params;

    const maintenance = await getMaintenanceById(Number(maintenanceId));
    if (!maintenance) {
      return res.status(404).json({ success: false, message: 'Maintenance ticket not found.' });
    }

    const property = await getPropertyById(maintenance.property_id);
    const authCheck = await checkPropertyAuthorization(req.user, property);
    if (!authCheck.authorized) {
      return res.status(authCheck.status).json({ success: false, message: authCheck.message });
    }

    await deleteMaintenance(Number(maintenanceId));

    await logAudit({
      propertyId: maintenance.property_id,
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'DELETE_MAINTENANCE_TICKET',
      entity: 'MAINTENANCE',
      entityId: Number(maintenanceId),
      details: { title: maintenance.title },
    });

    return res.status(200).json({
      success: true,
      message: 'Maintenance ticket deleted successfully.',
    });
  } catch (error) {
    console.error('Delete Maintenance Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete maintenance ticket.' });
  }
};

// ==========================================
// FEATURE #7: PROPERTY LIFECYCLE TRACKING
// ==========================================

const LIFECYCLE_STATES = [
  'Created',
  'Listed',
  'Under Review',
  'Verified',
  'Available',
  'Reserved',
  'Rented',
  'Sold',
  'Archived',
];

const ALLOWED_LIFECYCLE_TRANSITIONS = {
  'Created': ['Listed', 'Archived'],
  'Listed': ['Under Review', 'Available', 'Archived'],
  'Under Review': ['Verified', 'Listed', 'Archived'],
  'Verified': ['Available', 'Under Review', 'Archived'],
  'Available': ['Reserved', 'Sold', 'Rented', 'Under Review', 'Archived'],
  'Reserved': ['Available', 'Sold', 'Rented', 'Archived'],
  'Rented': ['Available', 'Archived'],
  'Sold': ['Archived'],
  'Archived': ['Created', 'Listed', 'Available'],
};

const getPropertyLifecycle = async (req, res) => {
  try {
    const { propertyId } = req.params;
    const property = await getPropertyById(Number(propertyId));
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found.' });
    }

    const authCheck = await checkPropertyAuthorization(req.user, property);
    if (!authCheck.authorized) {
      return res.status(authCheck.status).json({ success: false, message: authCheck.message });
    }

    const transitions = await getLifecycleHistory(Number(propertyId));
    const latestTransition = transitions.length > 0 ? transitions[0] : null;

    let currentState = latestTransition ? latestTransition.to_state : null;
    if (!currentState) {
      if (property.status === 'Sold') currentState = 'Sold';
      else if (property.status === 'Rented') currentState = 'Rented';
      else if (property.status === 'Inactive') currentState = 'Archived';
      else currentState = 'Available';
    }

    const allowedTransitions = ALLOWED_LIFECYCLE_TRANSITIONS[currentState] || [];

    return res.status(200).json({
      success: true,
      currentState,
      propertyStatus: property.status,
      propertyId: property.id,
      allowedTransitions,
      allLifecycleStates: LIFECYCLE_STATES,
      transitions,
    });
  } catch (error) {
    console.error('Get Lifecycle Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch lifecycle transitions.' });
  }
};

const transitionPropertyLifecycle = async (req, res) => {
  try {
    const { propertyId } = req.params;
    const { to_state, notes } = req.body;

    const property = await getPropertyById(Number(propertyId));
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found.' });
    }

    const authCheck = await checkPropertyAuthorization(req.user, property);
    if (!authCheck.authorized) {
      return res.status(authCheck.status).json({ success: false, message: authCheck.message });
    }

    if (!LIFECYCLE_STATES.includes(to_state)) {
      return res.status(400).json({
        success: false,
        message: `Invalid state '${to_state}'. Must be one of: ${LIFECYCLE_STATES.join(', ')}`,
      });
    }

    const transitionsList = await getLifecycleHistory(Number(propertyId));
    const latestTransition = transitionsList.length > 0 ? transitionsList[0] : null;

    let fromState = latestTransition ? latestTransition.to_state : null;
    if (!fromState) {
      if (property.status === 'Sold') fromState = 'Sold';
      else if (property.status === 'Rented') fromState = 'Rented';
      else if (property.status === 'Inactive') fromState = 'Archived';
      else fromState = 'Available';
    }

    if (fromState === to_state) {
      return res.status(400).json({
        success: false,
        message: `Property is already in state '${to_state}'.`,
      });
    }

    const allowedTransitions = ALLOWED_LIFECYCLE_TRANSITIONS[fromState] || [];
    if (!allowedTransitions.includes(to_state)) {
      return res.status(400).json({
        success: false,
        message: `Invalid lifecycle transition from '${fromState}' to '${to_state}'. Allowed transitions: ${allowedTransitions.join(', ')}`,
      });
    }

    // Sync database properties.status where enum is compatible
    const dbStatusMap = {
      'Available': 'Available',
      'Sold': 'Sold',
      'Rented': 'Rented',
      'Archived': 'Inactive',
    };
    if (dbStatusMap[to_state]) {
      await pool.execute(
        `UPDATE properties SET status = ?, updated_at = NOW() WHERE id = ?`,
        [dbStatusMap[to_state], Number(propertyId)]
      );
    }

    // Record transition in property_lifecycle_transitions table
    const transition = await recordLifecycleTransition(Number(propertyId), {
      from_state: fromState,
      to_state,
      notes,
      changed_by: req.user.id,
    });

    await logAudit({
      propertyId: Number(propertyId),
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'LIFECYCLE_STATE_TRANSITION',
      entity: 'PROPERTY',
      entityId: Number(propertyId),
      details: { fromState, toState: to_state, notes },
    });

    const transitions = await getLifecycleHistory(Number(propertyId));

    return res.status(200).json({
      success: true,
      message: `Property transitioned from '${fromState}' to '${to_state}'.`,
      currentState: to_state,
      allowedTransitions: ALLOWED_LIFECYCLE_TRANSITIONS[to_state] || [],
      transition,
      transitions,
    });
  } catch (error) {
    console.error('Transition Lifecycle Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to transition property state.' });
  }
};

// ==========================================
// FEATURE #8: PROPERTY AUDIT TRAIL
// ==========================================

const getPropertyAuditLogs = async (req, res) => {
  try {
    const { propertyId } = req.params;
    const { limit, offset } = req.query;

    const property = await getPropertyById(Number(propertyId));
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found.' });
    }

    const authCheck = await checkPropertyAuthorization(req.user, property);
    if (!authCheck.authorized) {
      return res.status(authCheck.status).json({ success: false, message: authCheck.message });
    }

    const auditData = await getAuditLogsByPropertyId(Number(propertyId), { limit, offset });

    return res.status(200).json({
      success: true,
      propertyId: Number(propertyId),
      ...auditData,
    });
  } catch (error) {
    console.error('Get Audit Logs Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch audit logs.' });
  }
};

module.exports = {
  getPropertyVerification,
  updatePropertyVerification,
  getPropertyChecklist,
  updatePropertyChecklistItem,
  getPropertyInspections,
  createPropertyInspection,
  updatePropertyInspection,
  deletePropertyInspection,
  getPropertyMaintenance,
  createPropertyMaintenance,
  updatePropertyMaintenance,
  deletePropertyMaintenance,
  getPropertyLifecycle,
  transitionPropertyLifecycle,
  getPropertyAuditLogs,
};
