const { pool } = require('../config/db');

/**
 * Stage 2: SaaS Multi-Tenant Model
 * Strict Tenant Data Isolation Scoped to `organizations(id)`
 */

// Helper to format canonical plan names
const getCanonicalPlanName = (plan) => {
  if (!plan) return 'Starter';
  const slug = (plan.slug || '').toLowerCase();
  const name = (plan.name || '').toLowerCase();
  if (slug === 'enterprise' || name.includes('enterprise')) return 'Enterprise Elite';
  if (slug === 'pro' || name.includes('pro')) return 'Professional Agency';
  if (slug === 'starter' || name.includes('starter')) return 'Starter';
  return plan.name || 'Starter';
};

// 1. Resolve organization/tenant membership for an authenticated user
const getTenantForUser = async (userId) => {
  const [rows] = await pool.execute(
    `
      SELECT
        om.id as membership_id,
        om.organization_id,
        om.user_id,
        om.branch_id,
        om.role_id,
        om.is_primary,
        o.name as organization_name,
        o.slug as organization_slug,
        o.logo_url,
        o.tax_id,
        o.primary_phone,
        o.primary_email,
        o.currency,
        o.fiscal_year_start,
        o.settings as org_settings
      FROM org_memberships om
      JOIN organizations o ON om.organization_id = o.id
      WHERE om.user_id = ?
      ORDER BY om.is_primary DESC, om.id ASC
      LIMIT 1
    `,
    [userId]
  );

  return rows[0] || null;
};

// 2. Organization Onboarding: Create organization and link user as primary owner
const createOrganizationWithMembership = async ({ name, slug, phone, email, currency = 'INR', userId }) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Generate unique slug if not provided or taken
    let baseSlug = (slug || name).toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    if (!baseSlug) baseSlug = `org-${Date.now().toString().slice(-4)}`;
    let safeSlug = baseSlug;

    const [existingSlug] = await conn.execute(`SELECT id FROM organizations WHERE slug = ? LIMIT 1`, [safeSlug]);
    if (existingSlug.length > 0) {
      safeSlug = `${baseSlug}-${Date.now().toString().slice(-4)}`;
    }

    // Insert Organization
    const [orgResult] = await conn.execute(
      `
        INSERT INTO organizations (name, slug, primary_phone, primary_email, currency, settings)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [name, safeSlug, phone || null, email || null, currency, JSON.stringify({ theme: 'dark', autoRenew: true })]
    );
    const orgId = orgResult.insertId;

    // Link User in org_memberships as primary admin/owner
    await conn.execute(
      `
        INSERT INTO org_memberships (organization_id, user_id, is_primary)
        VALUES (?, ?, TRUE)
      `,
      [orgId, userId]
    );

    // Auto-seed Free Starter Plan Subscription for new organization
    const [starterPlan] = await conn.execute(`SELECT id FROM saas_plans WHERE slug = 'starter' LIMIT 1`);
    if (starterPlan.length > 0) {
      const now = new Date();
      const nextMonth = new Date(now);
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      await conn.execute(
        `
          INSERT INTO subscriptions (organization_id, plan_id, billing_cycle, status, current_period_start, current_period_end, auto_renew, payment_method)
          VALUES (?, ?, 'monthly', 'active', ?, ?, TRUE, 'Simulated Starter Activation')
        `,
        [orgId, starterPlan[0].id, now, nextMonth]
      );
    }

    await conn.commit();
    return { organizationId: orgId, slug: safeSlug, name };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};

// 3. Get all available SaaS plans
const getPlans = async () => {
  const [rows] = await pool.query(
    `
      SELECT
        id,
        slug,
        name,
        tagline,
        price_monthly,
        price_yearly,
        currency,
        max_properties,
        max_agents,
        features,
        is_popular,
        created_at
      FROM saas_plans
      ORDER BY price_monthly ASC
    `
  );

  return rows.map((p) => ({
    ...p,
    name: getCanonicalPlanName(p),
    features: typeof p.features === 'string' ? JSON.parse(p.features) : p.features || [],
  }));
};

// 4. Get active subscription for an organization
const getOrganizationSubscription = async (organizationId) => {
  const [rows] = await pool.execute(
    `
      SELECT
        s.id as subscription_id,
        s.organization_id,
        s.plan_id,
        s.billing_cycle,
        s.status,
        s.current_period_start,
        s.current_period_end,
        s.auto_renew,
        s.payment_method,
        s.created_at as subscribed_at,
        p.slug as plan_slug,
        p.name as plan_name,
        p.tagline as plan_tagline,
        p.price_monthly,
        p.price_yearly,
        p.currency,
        p.max_properties,
        p.max_agents,
        p.features as plan_features
      FROM subscriptions s
      JOIN saas_plans p ON s.plan_id = p.id
      WHERE s.organization_id = ?
      ORDER BY s.id DESC
      LIMIT 1
    `,
    [organizationId]
  );

  if (!rows[0]) {
    const [starterPlan] = await pool.execute(`SELECT * FROM saas_plans WHERE slug = 'starter' LIMIT 1`);
    if (starterPlan[0]) {
      const now = new Date();
      const nextMonth = new Date(now);
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      const [ins] = await pool.execute(
        `
          INSERT INTO subscriptions
            (organization_id, plan_id, billing_cycle, status, current_period_start, current_period_end, auto_renew, payment_method)
          VALUES (?, ?, 'monthly', 'active', ?, ?, TRUE, 'Starter Tier Auto-Provision')
        `,
        [organizationId, starterPlan[0].id, now, nextMonth]
      );

      return {
        subscription_id: ins.insertId,
        organization_id: organizationId,
        plan_id: starterPlan[0].id,
        billing_cycle: 'monthly',
        price: Number(starterPlan[0].price_monthly || 0),
        status: 'active',
        current_period_start: now,
        current_period_end: nextMonth,
        auto_renew: 1,
        payment_method: 'Starter Tier Auto-Provision',
        subscribed_at: now,
        plan_slug: 'starter',
        plan_name: 'Starter',
        plan_tagline: starterPlan[0].tagline,
        price_monthly: starterPlan[0].price_monthly,
        price_yearly: starterPlan[0].price_yearly,
        currency: starterPlan[0].currency,
        max_properties: starterPlan[0].max_properties,
        max_agents: starterPlan[0].max_agents,
        plan_features: typeof starterPlan[0].features === 'string' ? JSON.parse(starterPlan[0].features) : starterPlan[0].features || [],
        features: typeof starterPlan[0].features === 'string' ? JSON.parse(starterPlan[0].features) : starterPlan[0].features || [],
      };
    }
    return null;
  }

  const sub = rows[0];
  const normalizedCycle = (sub.billing_cycle || 'monthly').toLowerCase() === 'yearly' ? 'yearly' : 'monthly';
  const currentPrice = normalizedCycle === 'yearly' ? Number(sub.price_yearly) : Number(sub.price_monthly);
  const parsedFeatures = typeof sub.plan_features === 'string' ? JSON.parse(sub.plan_features) : sub.plan_features || [];

  return {
    ...sub,
    price: currentPrice,
    billing_cycle: normalizedCycle,
    plan_name: getCanonicalPlanName({ slug: sub.plan_slug, name: sub.plan_name }),
    plan_features: parsedFeatures,
    features: parsedFeatures,
  };
};

// 5. Get organization resource usage (properties & agent seats)
const getOrganizationUsage = async (organizationId) => {
  // Count properties listed by agents belonging to this organization
  const [propRows] = await pool.execute(
    `
      SELECT COUNT(p.id) as properties_count
      FROM properties p
      JOIN agents a ON p.agent_id = a.id
      JOIN org_memberships om ON a.user_id = om.user_id
      WHERE om.organization_id = ?
    `,
    [organizationId]
  );

  // Count agent seats in this organization
  const [agentRows] = await pool.execute(
    `
      SELECT COUNT(om.id) as agents_count
      FROM org_memberships om
      JOIN users u ON om.user_id = u.id
      WHERE om.organization_id = ? AND u.role = 'agent'
    `,
    [organizationId]
  );

  // Total team members
  const [memberRows] = await pool.execute(
    `
      SELECT COUNT(id) as total_members
      FROM org_memberships
      WHERE organization_id = ?
    `,
    [organizationId]
  );

  return {
    propertiesCount: Number(propRows[0]?.properties_count || 0),
    agentsCount: Number(agentRows[0]?.agents_count || 0),
    totalMembers: Number(memberRows[0]?.total_members || 0),
  };
};

// 6. Subscribe or upgrade organization plan (100% simulated billing)
const subscribeOrganizationPlan = async ({ organizationId, planId, billingCycle = 'monthly', paymentMethod = 'Simulated Card' }) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [plans] = await conn.execute(`SELECT * FROM saas_plans WHERE id = ? LIMIT 1`, [planId]);
    if (!plans[0]) {
      throw new Error('Plan not found.');
    }
    const plan = plans[0];

    const normalizedCycle = (billingCycle || 'monthly').trim().toLowerCase() === 'yearly' ? 'yearly' : 'monthly';
    const isAnnual = normalizedCycle === 'yearly';
    const rawPrice = isAnnual ? Number(plan.price_yearly) : Number(plan.price_monthly);
    const taxRate = rawPrice > 0 ? 0.18 : 0; // 18% GST for paid plans
    const taxAmount = Math.round(rawPrice * taxRate * 100) / 100;
    const totalAmount = rawPrice + taxAmount;

    const now = new Date();
    const periodEnd = new Date(now);
    if (isAnnual) {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    // Check existing active subscription
    const [existingSubs] = await conn.execute(
      `SELECT id FROM subscriptions WHERE organization_id = ? ORDER BY id DESC LIMIT 1`,
      [organizationId]
    );

    let subscriptionId;
    if (existingSubs.length > 0) {
      subscriptionId = existingSubs[0].id;
      await conn.execute(
        `
          UPDATE subscriptions
          SET plan_id = ?,
              billing_cycle = ?,
              status = 'active',
              current_period_start = ?,
              current_period_end = ?,
              auto_renew = TRUE,
              payment_method = ?,
              updated_at = NOW()
          WHERE id = ?
        `,
        [planId, normalizedCycle, now, periodEnd, paymentMethod, subscriptionId]
      );
    } else {
      const [insertRes] = await conn.execute(
        `
          INSERT INTO subscriptions
            (organization_id, plan_id, billing_cycle, status, current_period_start, current_period_end, auto_renew, payment_method)
          VALUES (?, ?, ?, 'active', ?, ?, TRUE, ?)
        `,
        [organizationId, planId, normalizedCycle, now, periodEnd, paymentMethod]
      );
      subscriptionId = insertRes.insertId;
    }

    const canonicalName = getCanonicalPlanName(plan);

    // Generate simulated formal invoice
    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;
    const [invRes] = await conn.execute(
      `
        INSERT INTO subscription_invoices
          (organization_id, subscription_id, invoice_number, amount, tax_amount, currency, status, billing_reason, payment_method, invoice_date, paid_at)
        VALUES (?, ?, ?, ?, ?, ?, 'paid', ?, ?, NOW(), NOW())
      `,
      [
        organizationId,
        subscriptionId,
        invoiceNumber,
        totalAmount,
        taxAmount,
        plan.currency || 'INR',
        `${canonicalName} (${normalizedCycle.toUpperCase()}) Subscription`,
        paymentMethod,
      ]
    );

    await conn.commit();

    return {
      subscriptionId,
      invoiceId: invRes.insertId,
      invoiceNumber,
      planName: canonicalName,
      billingCycle: normalizedCycle,
      price: rawPrice,
      taxAmount,
      amount: totalAmount,
      currency: plan.currency,
      currentPeriodEnd: periodEnd,
    };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};

// 7. Cancel organization subscription auto-renew
const cancelOrganizationSubscription = async (organizationId) => {
  const [res] = await pool.execute(
    `
      UPDATE subscriptions
      SET auto_renew = FALSE, status = 'canceled', updated_at = NOW()
      WHERE organization_id = ?
    `,
    [organizationId]
  );
  return res.affectedRows > 0;
};

// 8. Get invoices for an organization (Strict Tenant Isolation)
const getOrganizationInvoices = async (organizationId) => {
  const [rows] = await pool.execute(
    `
      SELECT
        si.id,
        si.invoice_number,
        si.amount,
        si.tax_amount,
        si.currency,
        si.status,
        si.billing_reason,
        si.payment_method,
        si.invoice_date,
        si.paid_at,
        si.created_at,
        o.name as organization_name,
        o.tax_id as organization_tax_id
      FROM subscription_invoices si
      JOIN organizations o ON si.organization_id = o.id
      WHERE si.organization_id = ?
      ORDER BY si.id DESC
    `,
    [organizationId]
  );
  return rows;
};

// 9. Get team members of an organization
const getOrganizationMembers = async (organizationId) => {
  const [rows] = await pool.execute(
    `
      SELECT
        om.id as membership_id,
        om.user_id,
        om.is_primary,
        om.created_at as joined_at,
        u.name,
        u.email,
        u.role,
        u.phone,
        a.agency_name,
        a.id as agent_id
      FROM org_memberships om
      JOIN users u ON om.user_id = u.id
      LEFT JOIN agents a ON a.user_id = u.id
      WHERE om.organization_id = ?
      ORDER BY om.is_primary DESC, om.id ASC
    `,
    [organizationId]
  );
  return rows;
};

// 10. Add member to organization (enforcing agent seat quota if role is agent)
const addOrganizationMember = async ({ organizationId, email, role = 'agent' }) => {
  const [users] = await pool.execute(`SELECT id, name, email, role FROM users WHERE email = ? LIMIT 1`, [email]);
  if (!users[0]) {
    throw new Error('User with this email does not exist.');
  }
  const targetUser = users[0];

  // Check if already a member
  const [existing] = await pool.execute(
    `SELECT id FROM org_memberships WHERE organization_id = ? AND user_id = ? LIMIT 1`,
    [organizationId, targetUser.id]
  );
  if (existing.length > 0) {
    throw new Error('User is already a member of this organization.');
  }

  // Check agent quota if adding an agent
  const sub = await getOrganizationSubscription(organizationId);
  const usage = await getOrganizationUsage(organizationId);
  if (sub && sub.max_agents !== -1 && usage.agentsCount >= sub.max_agents && targetUser.role === 'agent') {
    const err = new Error(`Agent seat quota reached (${sub.max_agents} allowed under ${sub.plan_name}). Upgrade plan to add more team members.`);
    err.code = 'ORG_AGENT_QUOTA_EXCEEDED';
    throw err;
  }

  const [res] = await pool.execute(
    `
      INSERT INTO org_memberships (organization_id, user_id, is_primary)
      VALUES (?, ?, FALSE)
    `,
    [organizationId, targetUser.id]
  );

  return { membershipId: res.insertId, user: targetUser };
};

// 11. SaaS Super Admin Overview: Metrics across all tenants
const getSaaSAdminMetrics = async () => {
  // Query only the latest active subscription for each organization
  const [subs] = await pool.query(
    `
      SELECT
        s.id,
        s.organization_id,
        s.billing_cycle,
        s.status,
        p.slug as plan_slug,
        p.name as plan_name,
        p.price_monthly,
        p.price_yearly
      FROM subscriptions s
      JOIN saas_plans p ON s.plan_id = p.id
      WHERE s.status = 'active'
        AND s.id IN (
          SELECT MAX(id) FROM subscriptions WHERE status = 'active' GROUP BY organization_id
        )
    `
  );

  let mrr = 0;
  let arr = 0;
  const uniquePaidOrgs = new Set();
  const planDistribution = { starter: 0, pro: 0, enterprise: 0 };

  subs.forEach((s) => {
    const isPaid = (s.billing_cycle === 'yearly' && Number(s.price_yearly) > 0) ||
                   (s.billing_cycle === 'monthly' && Number(s.price_monthly) > 0);

    if (isPaid) {
      uniquePaidOrgs.add(s.organization_id);
      const monthlyVal = s.billing_cycle === 'yearly' ? Number(s.price_yearly) / 12 : Number(s.price_monthly);
      mrr += monthlyVal;
      const annualVal = s.billing_cycle === 'yearly' ? Number(s.price_yearly) : Number(s.price_monthly) * 12;
      arr += annualVal;
    }

    if (planDistribution[s.plan_slug] !== undefined) {
      planDistribution[s.plan_slug] += 1;
    }
  });

  const [orgCount] = await pool.query(`SELECT COUNT(*) as total_tenants FROM organizations`);
  const [userCount] = await pool.query(`SELECT COUNT(*) as total_users FROM users`);
  const [propCount] = await pool.query(`SELECT COUNT(*) as total_properties FROM properties`);
  const [paidInvoices] = await pool.query(`SELECT SUM(amount) as total_revenue, COUNT(*) as total_invoices FROM subscription_invoices WHERE status = 'paid'`);

  return {
    mrr: Math.round(mrr * 100) / 100,
    arr: Math.round(arr * 100) / 100,
    activePaidSubscribers: uniquePaidOrgs.size,
    activeSubscribers: subs.length,
    totalTenants: Number(orgCount[0]?.total_tenants || 0),
    totalUsers: Number(userCount[0]?.total_users || 0),
    totalProperties: Number(propCount[0]?.total_properties || 0),
    totalRevenue: Number(paidInvoices[0]?.total_revenue || 0),
    totalInvoicesCount: Number(paidInvoices[0]?.total_invoices || 0),
    planDistribution,
  };
};

// 12. SaaS Super Admin Tenants Directory
const getSaaSAdminTenants = async () => {
  const [rows] = await pool.query(
    `
      SELECT
        o.id as organization_id,
        o.name as organization_name,
        o.slug as organization_slug,
        o.primary_email,
        o.primary_phone,
        o.created_at,
        s.status as subscription_status,
        s.billing_cycle,
        s.current_period_end,
        p.name as plan_name,
        p.slug as plan_slug,
        p.price_monthly,
        (SELECT COUNT(id) FROM org_memberships WHERE organization_id = o.id) as members_count,
        (SELECT COUNT(p2.id)
         FROM properties p2
         JOIN agents a ON p2.agent_id = a.id
         JOIN org_memberships om2 ON a.user_id = om2.user_id
         WHERE om2.organization_id = o.id) as properties_count
      FROM organizations o
      LEFT JOIN subscriptions s ON s.id = (
        SELECT MAX(id) FROM subscriptions WHERE organization_id = o.id AND status = 'active'
      )
      LEFT JOIN saas_plans p ON s.plan_id = p.id
      ORDER BY o.id DESC
    `
  );

  return rows.map((r) => ({
    ...r,
    plan_name: r.plan_name ? getCanonicalPlanName({ slug: r.plan_slug, name: r.plan_name }) : null,
  }));
};

module.exports = {
  getTenantForUser,
  createOrganizationWithMembership,
  getPlans,
  getOrganizationSubscription,
  getOrganizationUsage,
  subscribeOrganizationPlan,
  cancelOrganizationSubscription,
  getOrganizationInvoices,
  getOrganizationMembers,
  addOrganizationMember,
  getSaaSAdminMetrics,
  getSaaSAdminTenants,
};
