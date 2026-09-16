const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getExecutiveDashboard,
  getRolesAndPermissions,
  getSecurityLogs,
  getLegalAgreements,
  generateAgreement,
  signAgreement,
  getApiKeys,
  generateApiKey,
  createWebhookSubscription,
  getOrganizationProfile,
  updateOrganizationProfile
} = require('../controllers/enterpriseController');

router.use(protect);

// Phase 11: BI Analytics
router.get('/analytics/executive', getExecutiveDashboard);

// Phase 12: Admin & Security
router.get('/security/roles', getRolesAndPermissions);
router.get('/security/logs', getSecurityLogs);

// Phase 13: Legal Workflows
router.get('/legal/agreements', getLegalAgreements);
router.post('/legal/agreements/generate', generateAgreement);
router.put('/legal/agreements/:id/sign', signAgreement);

// Phase 14: Integrations & API Keys
router.get('/integrations/keys', getApiKeys);
router.post('/integrations/keys', generateApiKey);
router.post('/integrations/webhooks', createWebhookSubscription);

// Phase 15: Platform Foundation
router.get('/platform/organization', getOrganizationProfile);
router.put('/platform/organization', updateOrganizationProfile);

module.exports = router;
