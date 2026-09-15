const express = require('express');
const router = express.Router({ mergeParams: true });
const { protect } = require('../middleware/authMiddleware');
const {
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
} = require('../controllers/operationsController');

// Feature #3: Ownership Verification
router.get('/:propertyId/verification', protect, getPropertyVerification);
router.put('/:propertyId/verification', protect, updatePropertyVerification);

// Feature #4: Verification Checklist
router.get('/:propertyId/checklist', protect, getPropertyChecklist);
router.put('/:propertyId/checklist/:itemKey', protect, updatePropertyChecklistItem);

// Feature #5: Inspections
router.get('/:propertyId/inspections', protect, getPropertyInspections);
router.post('/:propertyId/inspections', protect, createPropertyInspection);
router.put('/:propertyId/inspections/:inspectionId', protect, updatePropertyInspection);
router.put('/inspections/:inspectionId', protect, updatePropertyInspection);
router.delete('/:propertyId/inspections/:inspectionId', protect, deletePropertyInspection);
router.delete('/inspections/:inspectionId', protect, deletePropertyInspection);

// Feature #6: Maintenance
router.get('/:propertyId/maintenance', protect, getPropertyMaintenance);
router.post('/:propertyId/maintenance', protect, createPropertyMaintenance);
router.put('/:propertyId/maintenance/:maintenanceId', protect, updatePropertyMaintenance);
router.put('/maintenance/:maintenanceId', protect, updatePropertyMaintenance);
router.delete('/:propertyId/maintenance/:maintenanceId', protect, deletePropertyMaintenance);
router.delete('/maintenance/:maintenanceId', protect, deletePropertyMaintenance);

// Feature #7: Lifecycle Tracking
router.get('/:propertyId/lifecycle', protect, getPropertyLifecycle);
router.post('/:propertyId/lifecycle', protect, transitionPropertyLifecycle);

// Feature #8: Audit Logs
router.get('/:propertyId/audit-logs', protect, getPropertyAuditLogs);

module.exports = router;
