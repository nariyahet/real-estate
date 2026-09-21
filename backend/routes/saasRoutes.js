const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { requireTenantMembership } = require('../middleware/saasMiddleware');
const {
  getPlans,
  createOrganization,
  getCurrentSubscription,
  subscribePlan,
  cancelSubscription,
  getInvoices,
  getTeamMembers,
  inviteTeamMember,
  getAdminMetrics,
  getAdminTenants,
} = require('../controllers/saasController');

// 1. Public or Authenticated Plans Discovery
router.get('/plans', getPlans);

// 2. Organization Onboarding (for users who do not belong to any tenant yet)
router.post('/organization/create', protect, createOrganization);

// 3. Tenant-Scoped Subscription & Usage (Strict Tenant Isolation)
router.get('/subscription/current', protect, requireTenantMembership, getCurrentSubscription);
router.post('/subscription/subscribe', protect, requireTenantMembership, subscribePlan);
router.post('/subscription/cancel', protect, requireTenantMembership, cancelSubscription);
router.get('/invoices', protect, requireTenantMembership, getInvoices);

// 4. Organization Team Management (Respects Agent Seat Quota)
router.get('/team', protect, requireTenantMembership, getTeamMembers);
router.post('/team/invite', protect, requireTenantMembership, inviteTeamMember);

// 5. SaaS Super Admin Overview & Directory
router.get('/admin/metrics', protect, getAdminMetrics);
router.get('/admin/tenants', protect, getAdminTenants);

module.exports = router;
