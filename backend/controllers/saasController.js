const {
  getPlans: getPlansModel,
  createOrganizationWithMembership,
  getOrganizationSubscription,
  getOrganizationUsage,
  subscribeOrganizationPlan,
  cancelOrganizationSubscription,
  getOrganizationInvoices,
  getOrganizationMembers,
  addOrganizationMember,
  getSaaSAdminMetrics,
  getSaaSAdminTenants,
} = require('../models/saasModel');

// 1. Get all SaaS subscription plans
const getPlans = async (req, res) => {
  try {
    const plans = await getPlansModel();
    return res.status(200).json({
      success: true,
      plans,
    });
  } catch (error) {
    console.error('Get Plans Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load subscription plans.',
    });
  }
};

// 2. Organization Onboarding (for users who do not have an organization yet)
const createOrganization = async (req, res) => {
  try {
    const { name, slug, phone, email, currency } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Organization name is required.',
      });
    }

    const org = await createOrganizationWithMembership({
      name: name.trim(),
      slug: slug ? slug.trim() : undefined,
      phone: phone ? phone.trim() : undefined,
      email: email ? email.trim() : undefined,
      currency: currency || 'INR',
      userId: req.user.id,
    });

    return res.status(201).json({
      success: true,
      message: 'Organization created successfully with Starter tier activated.',
      organization: org,
    });
  } catch (error) {
    console.error('Create Org Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create organization.',
    });
  }
};

// 3. Get current organization's active subscription and usage metrics
const getCurrentSubscription = async (req, res) => {
  try {
    const organizationId = req.tenant.organization_id;
    const subscription = await getOrganizationSubscription(organizationId);
    const rawUsage = await getOrganizationUsage(organizationId);

    const maxProperties = subscription ? subscription.max_properties : 5;
    const maxAgents = subscription ? subscription.max_agents : 1;
    const propertiesPercentage = maxProperties === -1
      ? 0
      : Math.min(100, Math.round(((rawUsage.propertiesCount || 0) / maxProperties) * 100));
    const agentsPercentage = maxAgents === -1
      ? 0
      : Math.min(100, Math.round(((rawUsage.agentsCount || 0) / maxAgents) * 100));

    const usage = {
      ...rawUsage,
      maxProperties,
      maxAgents,
      propertiesPercentage,
      agentsPercentage,
      remainingProperties: maxProperties === -1 ? 'Unlimited' : Math.max(0, maxProperties - (rawUsage.propertiesCount || 0)),
      remainingAgents: maxAgents === -1 ? 'Unlimited' : Math.max(0, maxAgents - (rawUsage.agentsCount || 0)),
    };

    return res.status(200).json({
      success: true,
      tenant: {
        ...req.tenant,
        name: req.tenant.organization_name,
        slug: req.tenant.organization_slug,
        isPrimaryOwner: Boolean(req.tenant.is_primary),
      },
      organization: req.tenant,
      subscription: subscription || null,
      usage,
    });
  } catch (error) {
    console.error('Current Subscription Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve active subscription.',
    });
  }
};

// 4. Subscribe or change organization plan
const subscribePlan = async (req, res) => {
  try {
    const { planId, billingCycle = 'monthly', paymentMethod = 'Simulated Card' } = req.body;

    if (!planId) {
      return res.status(400).json({
        success: false,
        message: 'Plan ID is required.',
      });
    }

    const organizationId = req.tenant.organization_id;
    const result = await subscribeOrganizationPlan({
      organizationId,
      planId: Number(planId),
      billingCycle,
      paymentMethod,
    });

    return res.status(200).json({
      success: true,
      message: `Successfully subscribed to ${result.planName}!`,
      data: result,
    });
  } catch (error) {
    console.error('Subscribe Plan Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to process subscription.',
    });
  }
};

// 5. Cancel organization active subscription
const cancelSubscription = async (req, res) => {
  try {
    const organizationId = req.tenant.organization_id;
    const success = await cancelOrganizationSubscription(organizationId);

    if (!success) {
      return res.status(400).json({
        success: false,
        message: 'No active subscription found to cancel.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Subscription has been cancelled. Auto-renewal disabled.',
    });
  } catch (error) {
    console.error('Cancel Subscription Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to cancel subscription.',
    });
  }
};

// 6. Get billing invoices for current organization
const getInvoices = async (req, res) => {
  try {
    const organizationId = req.tenant.organization_id;
    const invoices = await getOrganizationInvoices(organizationId);

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

// 7. Get team members for current organization
const getTeamMembers = async (req, res) => {
  try {
    const organizationId = req.tenant.organization_id;
    const members = await getOrganizationMembers(organizationId);

    return res.status(200).json({
      success: true,
      members,
    });
  } catch (error) {
    console.error('Get Team Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load team members.',
    });
  }
};

// 8. Invite / Add user to organization
const inviteTeamMember = async (req, res) => {
  try {
    const { email, role = 'agent' } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Member email is required.',
      });
    }

    const organizationId = req.tenant.organization_id;
    const result = await addOrganizationMember({
      organizationId,
      email: email.trim().toLowerCase(),
      role,
    });

    return res.status(201).json({
      success: true,
      message: `User ${result.user.name} added to ${req.tenant.organization_name}.`,
      membership: result,
    });
  } catch (error) {
    console.error('Invite Team Member Error:', error);
    const statusCode = error.code === 'ORG_AGENT_QUOTA_EXCEEDED' ? 403 : 400;
    return res.status(statusCode).json({
      success: false,
      code: error.code || 'INVITE_FAILED',
      message: error.message || 'Failed to add team member.',
    });
  }
};

// 9. SaaS Super Admin: Global Metrics
const getAdminMetrics = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access restricted to Super Admin administrators only.',
      });
    }

    const metrics = await getSaaSAdminMetrics();

    return res.status(200).json({
      success: true,
      metrics,
    });
  } catch (error) {
    console.error('Admin Metrics Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve SaaS analytics.',
    });
  }
};

// 10. SaaS Super Admin: Global Tenants Directory
const getAdminTenants = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access restricted to Super Admin administrators only.',
      });
    }

    const tenants = await getSaaSAdminTenants();

    return res.status(200).json({
      success: true,
      tenants,
    });
  } catch (error) {
    console.error('Admin Tenants Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve tenant directory.',
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
