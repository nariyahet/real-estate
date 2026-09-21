const saasModel = require('../models/saasModel');

// 1. Get all SaaS plans
const getPlans = async (req, res) => {
  try {
    const plans = await saasModel.getPlans();
    return res.status(200).json({
      success: true,
      plans,
    });
  } catch (error) {
    console.error('Get Plans Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription plans.',
    });
  }
};

// 2. Organization Onboarding: Create Organization and link current user
const createOrganization = async (req, res) => {
  try {
    const { name, slug, phone, email, currency } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Organization name is required.',
      });
    }

    // Check if user already has an organization
    const existingTenant = await saasModel.getTenantForUser(req.user.id);
    if (existingTenant) {
      return res.status(400).json({
        success: false,
        message: `You are already a member of ${existingTenant.organization_name}.`,
        tenant: existingTenant,
      });
    }

    const org = await saasModel.createOrganizationWithMembership({
      name: name.trim(),
      slug: slug ? slug.trim() : null,
      phone: phone ? phone.trim() : req.user.phone,
      email: email ? email.trim() : req.user.email,
      currency: currency || 'INR',
      userId: req.user.id,
    });

    const tenant = await saasModel.getTenantForUser(req.user.id);

    return res.status(201).json({
      success: true,
      message: 'Organization created successfully.',
      organization: org,
      tenant,
    });
  } catch (error) {
    console.error('Create Org Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create organization.',
    });
  }
};

// 3. Get current organization's subscription & usage metrics
const getCurrentSubscription = async (req, res) => {
  try {
    const orgId = req.organizationId;
    const tenant = req.tenant;

    const subscription = await saasModel.getOrganizationSubscription(orgId);
    const usage = await saasModel.getOrganizationUsage(orgId);

    return res.status(200).json({
      success: true,
      tenant: {
        id: tenant.organization_id,
        name: tenant.organization_name,
        slug: tenant.organization_slug,
        currency: tenant.currency,
        isPrimaryOwner: Boolean(tenant.is_primary),
      },
      subscription: subscription || {
        status: 'none',
        message: 'No active subscription. Please select a plan.',
      },
      usage: {
        propertiesCount: usage.propertiesCount,
        maxProperties: subscription ? subscription.max_properties : 0,
        propertiesPercentage: subscription && subscription.max_properties > 0
          ? Math.min(100, Math.round((usage.propertiesCount / subscription.max_properties) * 100))
          : subscription && subscription.max_properties === -1 ? 0 : 100,
        agentsCount: usage.agentsCount,
        maxAgents: subscription ? subscription.max_agents : 0,
        agentsPercentage: subscription && subscription.max_agents > 0
          ? Math.min(100, Math.round((usage.agentsCount / subscription.max_agents) * 100))
          : subscription && subscription.max_agents === -1 ? 0 : 100,
        totalMembers: usage.totalMembers,
      },
    });
  } catch (error) {
    console.error('Get Current Sub Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve subscription details.',
    });
  }
};

// 4. Subscribe or upgrade organization plan (100% simulated payment)
const subscribePlan = async (req, res) => {
  try {
    const orgId = req.organizationId;
    const { planId, billingCycle = 'monthly', paymentMethod = 'Simulated Card' } = req.body;

    if (!planId) {
      return res.status(400).json({
        success: false,
        message: 'Plan ID is required.',
      });
    }

    const result = await saasModel.subscribeOrganizationPlan({
      organizationId: orgId,
      planId: Number(planId),
      billingCycle,
      paymentMethod,
    });

    return res.status(200).json({
      success: true,
      message: `Successfully subscribed to ${result.planName} (${billingCycle.toUpperCase()}).`,
      result,
    });
  } catch (error) {
    console.error('Subscribe Plan Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to process subscription change.',
    });
  }
};

// 5. Cancel organization subscription auto-renewal
const cancelSubscription = async (req, res) => {
  try {
    const orgId = req.organizationId;
    await saasModel.cancelOrganizationSubscription(orgId);

    return res.status(200).json({
      success: true,
      message: 'Subscription auto-renew canceled successfully.',
    });
  } catch (error) {
    console.error('Cancel Sub Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to cancel subscription.',
    });
  }
};

// 6. Get billing invoices for organization (Tenant Isolated)
const getInvoices = async (req, res) => {
  try {
    const orgId = req.organizationId;
    const invoices = await saasModel.getOrganizationInvoices(orgId);

    return res.status(200).json({
      success: true,
      invoices,
    });
  } catch (error) {
    console.error('Get Invoices Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve billing invoices.',
    });
  }
};

// 7. Get team members for organization
const getTeamMembers = async (req, res) => {
  try {
    const orgId = req.organizationId;
    const members = await saasModel.getOrganizationMembers(orgId);

    return res.status(200).json({
      success: true,
      members,
    });
  } catch (error) {
    console.error('Get Team Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve organization team members.',
    });
  }
};

// 8. Invite / Add team member to organization
const inviteTeamMember = async (req, res) => {
  try {
    const orgId = req.organizationId;
    const { email, role } = req.body;

    if (!email || email.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid user email is required.',
      });
    }

    const result = await saasModel.addOrganizationMember({
      organizationId: orgId,
      email: email.trim(),
      role: role || 'agent',
    });

    return res.status(201).json({
      success: true,
      message: `Added ${result.user.name} to the organization workspace.`,
      result,
    });
  } catch (error) {
    console.error('Invite Team Member Error:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to add team member.',
    });
  }
};

// 9. SaaS Super Admin: Executive platform metrics across tenants
const getAdminMetrics = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Super Admin privileges required.',
      });
    }

    const metrics = await saasModel.getSaaSAdminMetrics();

    return res.status(200).json({
      success: true,
      metrics,
    });
  } catch (error) {
    console.error('Admin Metrics Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load SaaS admin metrics.',
    });
  }
};

// 10. SaaS Super Admin: Tenants directory
const getAdminTenants = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Super Admin privileges required.',
      });
    }

    const tenants = await saasModel.getSaaSAdminTenants();

    return res.status(200).json({
      success: true,
      tenants,
    });
  } catch (error) {
    console.error('Admin Tenants Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load tenant subscriber directory.',
    });
  }
};

module.exports = {
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
};
