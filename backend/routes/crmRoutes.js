const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getLeads,
  getLeadById,
  createLead,
  updateLeadStatus,
  addLeadActivity,
  scheduleFollowUp,
  completeFollowUp,
  getCRMAnalytics
} = require('../controllers/crmController');

router.use(protect);

router.get('/leads', getLeads);
router.get('/leads/analytics', getCRMAnalytics);
router.get('/leads/:id', getLeadById);
router.post('/leads', createLead);
router.put('/leads/:id/status', updateLeadStatus);
router.post('/leads/:id/activities', addLeadActivity);
router.post('/leads/:id/follow-ups', scheduleFollowUp);
router.put('/follow-ups/:followUpId/complete', completeFollowUp);

module.exports = router;
