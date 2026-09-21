const { getTenantForUser, getOrganizationSubscription, getOrganizationUsage } = require('../models/saasModel');

/**
 * Middleware: Require Tenant / Organization Membership
 * If the user has no org_memberships record, reject with 403 ORGANIZATION_REQUIRED.
 * Zero silent fallback to Organization 1!
 */
const requireTenantMembership = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const tenant = await getTenantForUser(req.user.id);

    if (!tenant) {
      return res.status(403).json({
        success: false,
        code: 'ORGANIZATION_REQUIRED',
        message: 'You are not a member of an active organization. Please create or join an organization to access SaaS subscriptions and billing.',
        action: 'ONBOARDING_REQUIRED',
      });
    }

    // Attach tenant context to request
    req.tenant = tenant;
    req.organizationId = tenant.organization_id;

    next();
  } catch (error) {
    console.error('Tenant Context Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify tenant context.',
    });
  }
};

/**
 * Middleware: Check Organization Property Listing Quota
 * Enforces organization-level property listing limits before allowing property creation.
 */
const checkPropertyQuota = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return next();
    }

    // Check if user belongs to an organization
    const tenant = await getTenantForUser(req.user.id);
    if (!tenant) {
      // If user has no organization, preserve legacy behavior (do not block)
      return next();
    }

    req.tenant = tenant;
    req.organizationId = tenant.organization_id;

    const sub = await getOrganizationSubscription(tenant.organization_id);
    if (!sub) {
      // Organization has not activated a subscription yet
      return next();
    }

    // Unlimited check (-1)
    if (sub.max_properties === -1) {
      return next();
    }

    const usage = await getOrganizationUsage(tenant.organization_id);

    if (usage.propertiesCount >= sub.max_properties) {
      return res.status(403).json({
        success: false,
        code: 'ORG_PROPERTY_QUOTA_EXCEEDED',
        message: `Your organization (${tenant.organization_name}) has reached its limit of ${sub.max_properties} property listings under the ${sub.plan_name}. Please upgrade to add more properties.`,
        usage: {
          propertiesCount: usage.propertiesCount,
          maxProperties: sub.max_properties,
          planName: sub.plan_name,
        },
      });
    }

    next();
  } catch (error) {
    console.error('Quota Check Error:', error);
    next(); // Fail open on internal error to preserve existing property operations
  }
};

module.exports = {
  requireTenantMembership,
  checkPropertyQuota,
};
