import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../../api/axios";
import AdminSidebar from "../../components/AdminSidebar/AdminSidebar";
import "../../App.css";
import "./SubscriptionPlans.css";

export default function SubscriptionPlans() {
  const navigate = useNavigate();

  const getUser = () => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  };
  const user = getUser();
  const isAdmin = user?.role === "admin";

  // State Management
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  // SaaS Data
  const [plans, setPlans] = useState([]);
  const [tenant, setTenant] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [usage, setUsage] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [adminMetrics, setAdminMetrics] = useState(null);
  const [adminTenants, setAdminTenants] = useState([]);

  // UI State
  const [activeTab, setActiveTab] = useState("plans"); // 'plans' | 'invoices' | 'team' | 'admin'
  const [billingCycle, setBillingCycle] = useState("monthly"); // 'monthly' | 'yearly'
  const [userToggledCycle, setUserToggledCycle] = useState(false);
  const [selectedPlanForCheckout, setSelectedPlanForCheckout] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("Simulated Credit Card");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState(null);
  const [openFaqIndex, setOpenFaqIndex] = useState(0);

  // Onboarding Form State
  const [onboardingForm, setOnboardingForm] = useState({
    name: "",
    slug: "",
    phone: user?.phone || "",
    email: user?.email || "",
    currency: "INR",
  });
  const [onboardingSubmitting, setOnboardingSubmitting] = useState(false);

  // Invite Member Form State
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("agent");
  const [inviteLoading, setInviteLoading] = useState(false);

  // ─────────────────────────────────────────────────────────────
  // DATA FETCHING (Strictly reusing existing endpoints)
  // ─────────────────────────────────────────────────────────────
  const fetchSaaSData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // 1. Fetch public/active plans
      const plansRes = await api.get("/saas/plans");
      if (plansRes.data?.success) {
        setPlans(plansRes.data.plans || []);
      }

      // 2. Fetch current tenant subscription & usage
      try {
        const subRes = await api.get("/saas/subscription/current");
        if (subRes.data?.success) {
          setTenant(subRes.data.tenant);
          setSubscription(subRes.data.subscription);
          setUsage(subRes.data.usage);
          setNeedsOnboarding(false);
        }
      } catch (err) {
        if (err.response?.status === 403 && err.response?.data?.code === "ORGANIZATION_REQUIRED") {
          setNeedsOnboarding(true);
          setTenant(null);
          setSubscription(null);
        }
      }
    } catch (err) {
      setError("Failed to load subscription data. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchInvoices = useCallback(async () => {
    try {
      const res = await api.get("/saas/invoices");
      if (res.data?.success) {
        setInvoices(res.data.invoices || []);
      }
    } catch (err) {
      // Handled silently
    }
  }, []);

  const fetchTeamMembers = useCallback(async () => {
    try {
      const res = await api.get("/saas/team");
      if (res.data?.success) {
        setTeamMembers(res.data.members || []);
      }
    } catch (err) {
      // Handled silently
    }
  }, []);

  const fetchAdminData = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const [metricsRes, tenantsRes] = await Promise.all([
        api.get("/saas/admin/metrics"),
        api.get("/saas/admin/tenants"),
      ]);
      if (metricsRes.data?.success) setAdminMetrics(metricsRes.data.metrics);
      if (tenantsRes.data?.success) setAdminTenants(tenantsRes.data.tenants || []);
    } catch (err) {
      // Handled silently
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchSaaSData();
  }, [fetchSaaSData]);

  useEffect(() => {
    if (activeTab === "invoices" && !needsOnboarding) fetchInvoices();
    if (activeTab === "team" && !needsOnboarding) fetchTeamMembers();
    if (activeTab === "admin" && isAdmin) fetchAdminData();
  }, [activeTab, needsOnboarding, isAdmin, fetchInvoices, fetchTeamMembers, fetchAdminData]);

  // Keyboard accessibility: Close modals on ESC
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (selectedPlanForCheckout) setSelectedPlanForCheckout(null);
        if (activeReceipt) setActiveReceipt(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedPlanForCheckout, activeReceipt]);

  // ─────────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────────
  const handleOnboardingSubmit = async (e) => {
    e.preventDefault();
    if (!onboardingForm.name.trim()) {
      setError("Organization Name is required.");
      return;
    }

    setOnboardingSubmitting(true);
    setError("");
    try {
      const res = await api.post("/saas/organization/create", onboardingForm);
      if (res.data?.success) {
        setSuccessMsg(`Welcome to ${res.data.organization.name}! Free Starter Tier activated.`);
        setNeedsOnboarding(false);
        await fetchSaaSData();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create organization workspace.");
    } finally {
      setOnboardingSubmitting(false);
    }
  };

  const handleOpenCheckout = (plan) => {
    setSelectedPlanForCheckout(plan);
  };

  const handleConfirmCheckout = async () => {
    if (!selectedPlanForCheckout || checkoutLoading) return;
    setCheckoutLoading(true);
    setError("");
    try {
      const planToActivate = selectedPlanForCheckout;
      const cycleToActivate = billingCycle;
      const res = await api.post("/saas/subscription/subscribe", {
        planId: planToActivate.id,
        billingCycle: cycleToActivate,
        paymentMethod,
      });

      if (res.data?.success) {
        const canonical = getCanonicalPlanName(planToActivate);
        setSuccessMsg(`Subscription successfully updated to ${canonical}!`);
        setSelectedPlanForCheckout(null);
        setUserToggledCycle(false);

        // Fetch fresh subscription & invoices
        await fetchSaaSData();
        const invRes = await api.get("/saas/invoices");
        if (invRes.data?.success && invRes.data.invoices?.length > 0) {
          setInvoices(invRes.data.invoices);
          // Auto-show official receipt specifically created for THIS transaction
          const createdInvoiceId = res.data.data?.invoiceId;
          const createdInvoiceNum = res.data.data?.invoiceNumber;
          const thisInv = invRes.data.invoices.find(
            (i) => (createdInvoiceId && i.id === createdInvoiceId) || (createdInvoiceNum && i.invoice_number === createdInvoiceNum)
          ) || invRes.data.invoices[0];
          if (thisInv) setActiveReceipt(thisInv);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to complete simulated payment.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleCancelAutoRenew = async () => {
    if (!window.confirm("Are you sure you want to cancel subscription auto-renewal?")) return;
    try {
      const res = await api.post("/saas/subscription/cancel");
      if (res.data?.success) {
        setSuccessMsg("Subscription auto-renewal canceled.");
        await fetchSaaSData();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to cancel subscription.");
    }
  };

  const handleInviteMember = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setInviteLoading(true);
    setError("");
    try {
      const res = await api.post("/saas/team/invite", {
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      if (res.data?.success) {
        setSuccessMsg(res.data.message);
        setInviteEmail("");
        await fetchTeamMembers();
        await fetchSaaSData();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to invite member.");
    } finally {
      setInviteLoading(false);
    }
  };

  // Plan-Specific Tier Configurations (Core, Advanced, Enterprise Hierarchy)
  const PLAN_TIER_CONFIG = {
    starter: {
      tierKey: "starter",
      canonicalName: "Starter",
      badgeLabel: "Individual Agent",
      seatAllowance: "1 dedicated agent seat",
      seatBadgeText: "1 Agent Seat",
      sectionTitle: "Core Features",
      inheritedNote: null,
      features: [
        "Up to 5 active property listings",
        "1 dedicated agent seat",
        "Standard lead inquiry forms",
        "Basic property management",
        "Basic customer management",
        "Basic dashboard",
        "Basic saved properties",
        "Basic inquiry tracking",
      ],
    },
    pro: {
      tierKey: "pro",
      canonicalName: "Professional Agency",
      badgeLabel: "Growing Brokerage",
      seatAllowance: "Up to 5 agent seats",
      seatBadgeText: "Up to 5 Agent Seats",
      sectionTitle: "Advanced Features",
      inheritedNote: "Everything in Starter +",
      features: [
        "Up to 50 active property listings",
        "Up to 5 agent seats",
        "Full CRM pipeline",
        "Kanban lead management",
        "Advanced property search",
        "Lead assignment",
        "Agent collaboration",
        "Advanced dashboard/analytics",
        "Property performance tracking",
        "Advanced inquiry management",
        "Team management",
      ],
    },
    enterprise: {
      tierKey: "enterprise",
      canonicalName: "Enterprise Elite",
      badgeLabel: "Large Organization",
      seatAllowance: "Unlimited agent/broker seats",
      seatBadgeText: "Unlimited Agent / Broker Seats",
      sectionTitle: "Enterprise Features",
      inheritedNote: "Everything in Professional +",
      features: [
        "Unlimited property listings",
        "Unlimited agent/broker seats",
        "AI Buyer–Property Match",
        "Natural Language Property Search",
        "Advanced analytics/reporting",
        "Enterprise CRM",
        "Advanced role & permission management",
        "Multi-team/department management",
        "Priority support",
        "Enterprise-level customization",
        "Advanced security/audit controls",
      ],
    },
  };

  // Helper to determine the tier key for styling & feature mapping
  const getPlanTierKey = (plan) => {
    if (!plan) return "starter";
    const slug = (typeof plan === "string" ? plan : (plan.slug || plan.plan_slug || "")).toLowerCase();
    const name = (typeof plan === "string" ? plan : (plan.name || plan.plan_name || "")).toLowerCase();
    if (slug === "enterprise" || name.includes("enterprise")) return "enterprise";
    if (slug === "pro" || name.includes("pro")) return "pro";
    if (slug === "starter" || name.includes("starter")) return "starter";
    return "starter";
  };

  // Canonical Plan Name Helper: Starter, Professional Agency, Enterprise Elite
  const getCanonicalPlanName = (plan) => {
    if (!plan) return "Starter";
    const slug = typeof plan === "string" ? plan.toLowerCase() : (plan.slug || plan.plan_slug || "").toLowerCase();
    const name = typeof plan === "string" ? plan.toLowerCase() : (plan.name || plan.plan_name || "").toLowerCase();
    if (slug === "enterprise" || name.includes("enterprise")) return "Enterprise Elite";
    if (slug === "pro" || name.includes("pro")) return "Professional Agency";
    if (slug === "starter" || name.includes("starter")) return "Starter";
    return typeof plan === "string" ? plan : plan.name || "Starter";
  };

  // Currency formatting helper
  const formatCurrency = (val, forceDecimals = false) => {
    const num = Number(val) || 0;
    if (num === 0) return "₹0";
    if (forceDecimals || num % 1 !== 0) {
      return `₹${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `₹${num.toLocaleString("en-IN")}`;
  };

  // Helper for pricing display
  const getDisplayPrice = (plan) => {
    if (plan.price_monthly === "0.00" || Number(plan.price_monthly) === 0) return "₹0";
    if (billingCycle === "yearly") {
      const annual = Number(plan.price_yearly);
      return formatCurrency(annual);
    }
    return formatCurrency(Number(plan.price_monthly));
  };

  // Robust Quota Calculations
  const maxProperties = usage?.maxProperties ?? subscription?.max_properties ?? 5;
  const maxAgents = usage?.maxAgents ?? subscription?.max_agents ?? 1;
  const propertiesCount = usage?.propertiesCount || 0;
  const agentsCount = usage?.agentsCount || 0;
  const propertiesPercentage = maxProperties === -1
    ? 0
    : Math.min(100, Math.round((propertiesCount / maxProperties) * 100));
  const agentsPercentage = maxAgents === -1
    ? 0
    : Math.min(100, Math.round((agentsCount / maxAgents) * 100));
  const remainingProperties = maxProperties === -1
    ? "Unlimited"
    : Math.max(0, maxProperties - propertiesCount);
  const remainingAgents = maxAgents === -1
    ? "Unlimited"
    : Math.max(0, maxAgents - agentsCount);

  // Grouped Feature Comparison Matrix Data
  const comparisonGroups = [
    {
      group: "PROPERTY MANAGEMENT",
      features: [
        { name: "Active Property Listings", starter: "5 Listings", pro: "50 Listings", enterprise: "Unlimited" },
        { name: "Property Document Vault", starter: "Standard", pro: "Encrypted Multi-file", enterprise: "Enterprise Audit Vault" },
        { name: "Ownership Verification Badge", starter: false, pro: true, enterprise: true },
        { name: "Interactive Map Explorer & AI Maps", starter: true, pro: true, enterprise: true },
        { name: "AI Property Valuation", starter: false, pro: "Basic Market Est.", enterprise: "Real-Time AI Model" },
      ],
    },
    {
      group: "CRM & LEADS",
      features: [
        { name: "Lead Capture & Inquiry System", starter: "Standard Form", pro: "Automated Routing", enterprise: "Omnichannel AI Dispatch" },
        { name: "CRM Pipeline with Kanban Board", starter: false, pro: true, enterprise: true },
        { name: "Client Activity Timeline & History", starter: false, pro: true, enterprise: true },
        { name: "AI Buyer-Property Matching", starter: false, pro: false, enterprise: true },
      ],
    },
    {
      group: "SALES & DEALS",
      features: [
        { name: "Deal Milestone Escrow Tracking", starter: false, pro: true, enterprise: true },
        { name: "Digital Contracts & E-Signatures", starter: false, pro: true, enterprise: true },
        { name: "Legal Agreement Templates", starter: false, pro: "Standard Legal", enterprise: "Unlimited Custom" },
        { name: "Closing Milestone Notifications", starter: false, pro: true, enterprise: true },
      ],
    },
    {
      group: "TEAM & AGENTS",
      features: [
        { name: "Licensed Agent Seats Included", starter: "1 Seat", pro: "5 Seats", enterprise: "Unlimited Seats" },
        { name: "Role-Based Access Control (RBAC)", starter: "Standard", pro: "Branch & Agent Roles", enterprise: "Custom Enterprise Roles" },
        { name: "Automated Commission Ledger", starter: false, pro: true, enterprise: true },
        { name: "Multi-Branch & Territory Management", starter: false, pro: false, enterprise: true },
      ],
    },
    {
      group: "FINANCE & COMPLIANCE",
      features: [
        { name: "Automated Tax Invoicing", starter: true, pro: true, enterprise: true },
        { name: "18% GST Compliant Receipts", starter: true, pro: true, enterprise: true },
        { name: "Executive P&L & Chart of Accounts", starter: false, pro: "Basic Ledger", enterprise: "Full Chart of Accounts" },
        { name: "Multi-Currency Transactions", starter: "INR Only", pro: "INR / USD / EUR", enterprise: "Global Multi-Currency" },
      ],
    },
    {
      group: "ANALYTICS & BI",
      features: [
        { name: "Performance KPI Dashboard", starter: "Basic Stats", pro: "Advanced Metrics", enterprise: "Executive BI Studio" },
        { name: "Deal Velocity & Conversion Funnel", starter: false, pro: true, enterprise: true },
        { name: "Locality Market Heatmaps", starter: false, pro: false, enterprise: true },
        { name: "Data Export (CSV & Audit PDF)", starter: false, pro: true, enterprise: true },
      ],
    },
    {
      group: "ENTERPRISE OPERATIONS",
      features: [
        { name: "Developer API Keys & Webhooks", starter: false, pro: false, enterprise: true },
        { name: "Multi-Tenant Data Isolation", starter: true, pro: true, enterprise: true },
        { name: "Custom Domain & Whitelabel", starter: false, pro: false, enterprise: true },
        { name: "Support SLA", starter: "Standard Community", pro: "Priority Agency (12h)", enterprise: "24/7 Dedicated SLA (1h)" },
      ],
    },
  ];

  // FAQ Items
  const faqItems = [
    {
      q: "Can I upgrade or switch my subscription plan at any time?",
      a: "Yes, you can upgrade, downgrade, or switch plans at any moment. When upgrading, your new property listing quotas and collaborative agent seats activate immediately, and an updated simulated invoice is generated.",
    },
    {
      q: "What happens when my agency reaches its property listing quota?",
      a: "Once your organization reaches its plan limit (e.g. 5 on Starter, 50 on Professional Agency), adding new listings will be safely paused with a friendly notification. Existing listings remain live and fully accessible. Upgrading your tier instantly restores full creation capacity.",
    },
    {
      q: "Can I switch between monthly and annual billing cycles?",
      a: "Absolutely! Switching to annual billing provides approximately 17% savings (2 full months free of charge). You can toggle between monthly and yearly billing anytime using the toggle switch in the hero section.",
    },
    {
      q: "Are payments real or simulated in this environment?",
      a: "All payments in this application are 100% simulated for demonstration and portfolio review. No real credit card or bank credentials are ever required, while formal tax invoices, GST calculations, and multi-tenant ledger entries are executed accurately.",
    },
    {
      q: "How is the 18% Goods and Services Tax (GST) calculated?",
      a: "For paid subscription plans (Professional Agency and Enterprise Elite), 18% GST is automatically calculated on top of the base plan price, itemized in your checkout breakdown, and reflected on official downloadable tax receipts.",
    },
    {
      q: "Can I cancel subscription auto-renewal?",
      a: "Yes, workspace owners can cancel auto-renewal with a single click. Your plan will remain active with full privileges until the end of the current billing cycle, without automatically renewing.",
    },
    {
      q: "What happens to our agency data and team members if we change plans?",
      a: "All organization records, client relationships, property listings, and legal documents are preserved with strict multi-tenant isolation. No data is deleted when changing plans.",
    },
  ];

  return (
    <div className="admin-layout">
      <AdminSidebar />

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="page-label">
              {isAdmin ? "REAL ESTATE SaaS SUPER ADMIN" : "TENANT WORKSPACE & BILLING"}
            </p>
            <h1>SaaS Plans & Subscription Hub</h1>
          </div>

          <div className="admin-profile">
            <div className="profile-avatar">
              {(user?.name || "U").charAt(0).toUpperCase()}
            </div>
            <div>
              <strong>{user?.name || "User"}</strong>
              <span>{isAdmin ? "Administrator" : "Licensed Agent"}</span>
            </div>
          </div>
        </header>

        {/* Global Notifications */}
        {error && (
          <div className="saas-notification error" role="alert">
            <span>⚠️ {error}</span>
            <button type="button" onClick={() => setError("")} aria-label="Dismiss error">×</button>
          </div>
        )}

        {successMsg && (
          <div className="saas-notification success" role="status">
            <span>✓ {successMsg}</span>
            <button type="button" onClick={() => setSuccessMsg("")} aria-label="Dismiss message">×</button>
          </div>
        )}

        {loading ? (
          <div className="saas-loading-state">
            <div className="saas-spinner" aria-hidden="true" />
            <p>Loading multi-tenant SaaS workspace...</p>
          </div>
        ) : needsOnboarding ? (
          /* ONBOARDING VIEW (When User Has No Organization Membership) */
          <div className="onboarding-wrap">
            <div className="onboarding-card">
              <div className="onboarding-icon">🏢</div>
              <h2>Create Your Agency Workspace</h2>
              <p>
                To activate property listings, CRM deal pipelines, collaborative agent seats, and billing, please establish your Organization Workspace.
              </p>

              <form onSubmit={handleOnboardingSubmit} className="onboarding-form">
                <div className="form-group">
                  <label htmlFor="orgName">Organization / Brokerage Name *</label>
                  <input
                    id="orgName"
                    type="text"
                    required
                    placeholder="e.g. Skyline Realty Group"
                    value={onboardingForm.name}
                    onChange={(e) => {
                      const nameVal = e.target.value;
                      setOnboardingForm({
                        ...onboardingForm,
                        name: nameVal,
                        slug: nameVal.toLowerCase().replace(/[^a-z0-9]/g, "-"),
                      });
                    }}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="orgSlug">Workspace URL Slug</label>
                  <input
                    id="orgSlug"
                    type="text"
                    placeholder="skyline-realty"
                    value={onboardingForm.slug}
                    onChange={(e) => setOnboardingForm({ ...onboardingForm, slug: e.target.value })}
                  />
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label htmlFor="orgEmail">Business Email</label>
                    <input
                      id="orgEmail"
                      type="email"
                      value={onboardingForm.email}
                      onChange={(e) => setOnboardingForm({ ...onboardingForm, email: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="orgPhone">Business Phone</label>
                    <input
                      id="orgPhone"
                      type="text"
                      value={onboardingForm.phone}
                      onChange={(e) => setOnboardingForm({ ...onboardingForm, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="orgCurrency">Billing Currency</label>
                  <select
                    id="orgCurrency"
                    value={onboardingForm.currency}
                    onChange={(e) => setOnboardingForm({ ...onboardingForm, currency: e.target.value })}
                  >
                    <option value="INR">INR (₹) - Indian Rupee</option>
                    <option value="USD">USD ($) - US Dollar</option>
                    <option value="EUR">EUR (€) - Euro</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={onboardingSubmitting}
                  className="onboarding-submit-btn"
                >
                  {onboardingSubmitting ? "Creating Workspace..." : "Create Workspace & Activate Starter Tier"}
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* ACTIVE TENANT SAAS WORKSPACE */
          <div className="saas-page-root">
            {/* Top Tenant Context Card & Subscription State */}
            <div className="tenant-context-card">
              <div className="tenant-identity-wrap">
                <div className="tenant-badge-icon">🏛️</div>
                <div className="tenant-info-block">
                  <h2>
                    {tenant?.name}
                    <span className="tenant-tag">Verified Tenant</span>
                  </h2>
                  <p className="tenant-subtext">
                    Tenant Slug: <strong>{tenant?.slug}</strong> • Role:{" "}
                    <strong>{tenant?.isPrimaryOwner ? "Workspace Owner" : "Member"}</strong>
                  </p>
                </div>
              </div>

              <div className="tenant-status-pill">
                <div>
                  <div className="pill-subtext">Active Subscription</div>
                  <span
                    className={`plan-tier-badge ${
                      subscription?.plan_slug === "enterprise"
                        ? "enterprise"
                        : subscription?.plan_slug === "pro"
                        ? "pro"
                        : "starter"
                    }`}
                  >
                    {getCanonicalPlanName(subscription)} ({subscription?.billing_cycle ? subscription.billing_cycle.toUpperCase() : "MONTHLY"})
                  </span>
                </div>

                {subscription?.current_period_end && (
                  <div className="renewal-block">
                    <div className="pill-subtext">Next Renewal</div>
                    <strong className="renewal-date">
                      {new Date(subscription.current_period_end).toLocaleDateString()}
                    </strong>
                  </div>
                )}
              </div>
            </div>

            {/* Live Quota & Usage Meters */}
            <div className="usage-meters-grid">
              {/* Property Listing Quota */}
              <div className="usage-meter-card">
                <div className="meter-header">
                  <span className="meter-title">🏠 Property Listings Quota</span>
                  <span className="meter-stat">
                    {propertiesCount} / {maxProperties === -1 ? "∞ Unlimited" : maxProperties}
                  </span>
                </div>
                <div className="meter-progress-track">
                  <div
                    className={`meter-progress-bar ${
                      propertiesPercentage >= 90
                        ? "danger"
                        : propertiesPercentage >= 70
                        ? "warning"
                        : ""
                    }`}
                    style={{ width: `${propertiesPercentage}%` }}
                  />
                </div>
                <div className="meter-subtext">
                  <span>{propertiesPercentage}% Capacity Consumed</span>
                  {maxProperties !== -1 && (
                    <span>{remainingProperties} Listings Remaining</span>
                  )}
                </div>
              </div>

              {/* Agent Seats Quota */}
              <div className="usage-meter-card">
                <div className="meter-header">
                  <span className="meter-title">👔 Licensed Agent Seats</span>
                  <span className="meter-stat">
                    {agentsCount} / {maxAgents === -1 ? "∞ Unlimited" : maxAgents}
                  </span>
                </div>
                <div className="meter-progress-track">
                  <div
                    className={`meter-progress-bar ${
                      agentsPercentage >= 90
                        ? "danger"
                        : agentsPercentage >= 70
                        ? "warning"
                        : ""
                    }`}
                    style={{ width: `${agentsPercentage}%` }}
                  />
                </div>
                <div className="meter-subtext">
                  <span>{agentsCount} agent seat{agentsCount === 1 ? "" : "s"} used</span>
                  <span>{usage?.totalMembers || 0} total workspace member{usage?.totalMembers === 1 ? "" : "s"}</span>
                </div>
                <p className="meter-caption">
                  Agent seats count licensed agents only. Workspace owners and admins are not counted against the quota.
                </p>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="saas-nav-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "plans"}
                className={`saas-tab-btn ${activeTab === "plans" ? "active" : ""}`}
                id="tab-pricing-plans"
                onClick={() => setActiveTab("plans")}
              >
                💎 Subscription Plans
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "invoices"}
                className={`saas-tab-btn ${activeTab === "invoices" ? "active" : ""}`}
                id="tab-billing-invoices"
                onClick={() => setActiveTab("invoices")}
              >
                📜 Billing & Invoices
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "team"}
                className={`saas-tab-btn ${activeTab === "team" ? "active" : ""}`}
                id="tab-team-seats"
                onClick={() => setActiveTab("team")}
              >
                👥 Team & Agent Seats
              </button>

              {isAdmin && (
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "admin"}
                  className={`saas-tab-btn ${activeTab === "admin" ? "active" : ""}`}
                  id="tab-super-admin"
                  onClick={() => setActiveTab("admin")}
                >
                  📊 SaaS Super Admin
                </button>
              )}
            </div>

            {/* ==============================================================
               TAB 1: PRICING PLANS & ARCHITECTURAL EXPERIENCE
               ============================================================== */}
            {activeTab === "plans" && (
              <div className="pricing-experience-container">
                {/* 1. PRICING HERO SECTION */}
                <section className="pricing-hero-section">
                  <div className="pricing-hero-badge">
                    <span className="hero-badge-dot" />
                    <span>✨ Enterprise Architectural SaaS</span>
                  </div>

                  <h2 className="pricing-hero-title">
                    Scale Your Real Estate Business with{" "}
                    <span className="pricing-gradient-text">Deterministic Power</span>
                  </h2>

                  <p className="pricing-hero-description">
                    Empowering modern brokerages, property aggregators, and enterprise real-estate syndicates with deterministic listing quotas, AI matching intelligence, and unified multi-agent governance.
                  </p>

                  {/* 3. BILLING TOGGLE */}
                  <div className="billing-toggle-wrapper">
                    <div className="billing-toggle-pill" role="group" aria-label="Billing frequency selection">
                      <button
                        type="button"
                        className={`toggle-option ${billingCycle === "monthly" ? "active" : ""}`}
                        id="toggle-billing-monthly"
                        onClick={() => {
                          setUserToggledCycle(true);
                          setBillingCycle("monthly");
                        }}
                      >
                        Monthly Billing
                      </button>
                      <button
                        type="button"
                        className={`toggle-option ${billingCycle === "yearly" ? "active" : ""}`}
                        id="toggle-billing-yearly"
                        onClick={() => {
                          setUserToggledCycle(true);
                          setBillingCycle("yearly");
                        }}
                      >
                        <span>Annual Billing</span>
                        <span className="annual-save-badge">2 Months Free</span>
                      </button>
                    </div>
                  </div>
                </section>

                {/* 2. THREE PRICING CARDS */}
                <section className="pricing-cards-section">
                  <div className="pricing-cards-grid">
                    {plans.map((plan) => {
                      const tierKey = getPlanTierKey(plan);
                      const tierConfig = PLAN_TIER_CONFIG[tierKey] || PLAN_TIER_CONFIG.starter;
                      const canonicalName = tierConfig.canonicalName || getCanonicalPlanName(plan);
                      const isCurrentPlan = subscription?.plan_id === plan.id;
                      const isCurrentCycle = Number(plan.price_monthly) === 0 || (subscription?.billing_cycle || "monthly") === billingCycle;
                      const isCurrentActive = isCurrentPlan && isCurrentCycle;
                      const isPopular = tierKey === "pro" || canonicalName === "Professional Agency" || Boolean(plan.is_popular);
                      const isEnterprise = tierKey === "enterprise" || canonicalName === "Enterprise Elite";

                      return (
                        <div
                          key={plan.id}
                          className={`luxury-plan-card tier-${tierKey} ${isPopular ? "highlighted-popular" : ""} ${isEnterprise ? "enterprise-card" : ""} ${isCurrentActive ? "is-current-plan" : ""}`}
                        >
                          {isPopular && (
                            <div className="card-popular-pill">
                              <span>⭐ Recommended for Agencies</span>
                            </div>
                          )}

                          <div className="card-header-block">
                            <div className="card-tier-kicker">{tierConfig.badgeLabel}</div>
                            <div className="card-title-row">
                              <h3 className="plan-name-heading">{canonicalName}</h3>
                              {isCurrentActive && (
                                <span className="current-active-tag">Active</span>
                              )}
                            </div>
                            <p className="plan-tagline-text">{plan.tagline}</p>
                          </div>

                          <div className="card-price-container">
                            <div className="price-display-row">
                              <span className="price-number">{getDisplayPrice(plan)}</span>
                              {Number(plan.price_monthly) > 0 && (
                                <span className="price-cadence">
                                  / {billingCycle === "yearly" ? "year" : "month"}
                                </span>
                              )}
                            </div>

                            {billingCycle === "yearly" && Number(plan.price_monthly) > 0 && (
                              <div className="yearly-savings-note">
                                <span>Includes 2 months free • Billed annually</span>
                              </div>
                            )}

                            {Number(plan.price_monthly) === 0 && (
                              <div className="yearly-savings-note">
                                <span>Free forever workspace for individual agents</span>
                              </div>
                            )}
                          </div>

                          {/* Task 3: Prominent Agent / Seat Allowance Badge */}
                          <div className={`plan-seat-allowance-bar tier-${tierKey}`}>
                            <div className="seat-allowance-icon" aria-hidden="true">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                              </svg>
                            </div>
                            <div className="seat-allowance-content">
                              <span className="seat-allowance-label">Agent Capacity</span>
                              <strong className="seat-allowance-val">{tierConfig.seatAllowance}</strong>
                            </div>
                          </div>

                          {/* Task 2: Plan Feature Highlights with Section & Inheritance */}
                          <div className="card-features-container">
                            {tierConfig.inheritedNote && (
                              <div className={`plan-inherited-banner tier-${tierKey}`}>
                                <span className="inherited-badge-icon">✦</span>
                                <span className="inherited-badge-text">{tierConfig.inheritedNote}</span>
                              </div>
                            )}

                            <div className="features-section-title">{tierConfig.sectionTitle}:</div>

                            <ul className={`plan-features-list tier-${tierKey}`}>
                              {(tierConfig.features || []).map((feat, idx) => (
                                <li key={idx} className="plan-feature-row">
                                  <span className="feature-check-icon">
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                      <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                  </span>
                                  <span className="feature-text">{feat}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Dynamic Action Buttons */}
                          <div className="card-action-container">
                            {isCurrentActive ? (
                              <button
                                type="button"
                                className="card-cta-btn btn-current-active"
                                disabled
                                id={`cta-current-${plan.id}`}
                              >
                                ✓ Current Active Plan
                              </button>
                            ) : isCurrentPlan && !isCurrentCycle ? (
                              <button
                                type="button"
                                className="card-cta-btn btn-purple-primary"
                                id={`cta-switch-${plan.id}`}
                                onClick={() => handleOpenCheckout(plan)}
                              >
                                Switch to {billingCycle === "yearly" ? "Annual" : "Monthly"} Billing
                              </button>
                            ) : (
                              <button
                                type="button"
                                className={`card-cta-btn ${isPopular ? "btn-purple-primary" : "btn-purple-outline"}`}
                                id={`cta-plan-${plan.id}`}
                                onClick={() => handleOpenCheckout(plan)}
                              >
                                {Number(plan.price_monthly) === 0
                                  ? "Downgrade to Starter"
                                  : isEnterprise
                                  ? `Upgrade to ${canonicalName}`
                                  : `Upgrade to ${canonicalName}`}
                              </button>
                            )}

                            {isCurrentActive && Number(plan.price_monthly) > 0 && Boolean(subscription?.auto_renew) && (
                              <button
                                type="button"
                                onClick={handleCancelAutoRenew}
                                className="cancel-autorenew-btn"
                                id="btn-cancel-autorenew"
                              >
                                Cancel Auto-Renew
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* 4. FEATURE COMPARISON MATRIX */}
                <section className="feature-comparison-section">
                  <div className="section-intro-header">
                    <span className="section-kicker">DETAILED MATRIX</span>
                    <h3 className="section-main-heading">Every Feature, Side by Side</h3>
                    <p className="section-sub-heading">
                      A complete architectural breakdown of capabilities across all subscription tiers.
                    </p>
                  </div>

                  <div className="comparison-table-wrapper" tabIndex="0" aria-label="Feature comparison table">
                    <table className="luxury-comparison-table">
                      <thead>
                        <tr>
                          <th className="th-feature">Feature / Capability</th>
                          <th className="th-tier">Starter</th>
                          <th className="th-tier th-popular">
                            <span>Professional Agency</span>
                            <span className="th-tag">Popular</span>
                          </th>
                          <th className="th-tier">Enterprise Elite</th>
                        </tr>
                      </thead>
                      <tbody>
                        {comparisonGroups.map((group, gIdx) => (
                          <React.Fragment key={gIdx}>
                            <tr className="table-group-header-row">
                              <td colSpan="4">
                                <span className="group-title-label">{group.group}</span>
                              </td>
                            </tr>
                            {group.features.map((feat, fIdx) => (
                              <tr key={fIdx} className="table-feature-row">
                                <td className="td-feature-name">{feat.name}</td>
                                <td className="td-val">
                                  {typeof feat.starter === "boolean" ? (
                                    feat.starter ? (
                                      <span className="check-icon-yes" title="Included">✓</span>
                                    ) : (
                                      <span className="check-icon-no" title="Not Included">—</span>
                                    )
                                  ) : (
                                    <span className="text-val-badge">{feat.starter}</span>
                                  )}
                                </td>
                                <td className="td-val td-popular-col">
                                  {typeof feat.pro === "boolean" ? (
                                    feat.pro ? (
                                      <span className="check-icon-yes" title="Included">✓</span>
                                    ) : (
                                      <span className="check-icon-no" title="Not Included">—</span>
                                    )
                                  ) : (
                                    <span className="text-val-badge pro-badge">{feat.pro}</span>
                                  )}
                                </td>
                                <td className="td-val">
                                  {typeof feat.enterprise === "boolean" ? (
                                    feat.enterprise ? (
                                      <span className="check-icon-yes" title="Included">✓</span>
                                    ) : (
                                      <span className="check-icon-no" title="Not Included">—</span>
                                    )
                                  ) : (
                                    <span className="text-val-badge enterprise-badge">{feat.enterprise}</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                {/* 11. ENTERPRISE CTA SECTION */}
                <section className="enterprise-banner-section">
                  <div className="enterprise-banner-card">
                    <div className="enterprise-content-column">
                      <div className="enterprise-pill">
                        <span>🏛️ MULTI-BRANCH CONGLOMERATES</span>
                      </div>
                      <h3 className="enterprise-banner-title">
                        Built for Ambitious Real-Estate Organizations
                      </h3>
                      <p className="enterprise-banner-desc">
                        Need tailored listing boundaries, dedicated multi-region DB clustering, customized legal escrow pipelines, or white-label mobile applications? Our enterprise engineering team crafts bespoke deployments.
                      </p>
                      <div className="enterprise-features-inline">
                        <span>✓ Custom API Webhooks</span>
                        <span>✓ Dedicated Account SLA</span>
                        <span>✓ 99.99% Uptime Guarantee</span>
                      </div>
                    </div>

                    <div className="enterprise-action-column">
                      <button
                        type="button"
                        className="enterprise-action-btn"
                        id="btn-explore-enterprise"
                        onClick={() => navigate("/enterprise")}
                      >
                        Explore Enterprise Portal →
                      </button>
                    </div>
                  </div>
                </section>

                {/* 12. FAQ ACCORDION SECTION */}
                <section className="faq-section" id="pricing-faq">
                  <div className="section-intro-header">
                    <span className="section-kicker">QUESTIONS & ANSWERS</span>
                    <h3 className="section-main-heading">Frequently Asked Questions</h3>
                    <p className="section-sub-heading">
                      Clear answers about billing cycles, listing quotas, simulated payments, and subscription management.
                    </p>
                  </div>

                  <div className="faq-accordion-list">
                    {faqItems.map((item, index) => {
                      const isOpen = openFaqIndex === index;
                      return (
                        <div key={index} className={`faq-item-card ${isOpen ? "open" : ""}`}>
                          <button
                            type="button"
                            className="faq-question-btn"
                            aria-expanded={isOpen}
                            onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                          >
                            <span className="faq-q-text">{item.q}</span>
                            <span className="faq-chevron-icon" aria-hidden="true">
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="m6 9 6 6 6-6" />
                              </svg>
                            </span>
                          </button>
                          {isOpen && (
                            <div className="faq-answer-block">
                              <p>{item.a}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* 13. FINAL CONVERSION CTA */}
                <section className="final-cta-section">
                  <div className="final-cta-card">
                    <div className="final-cta-text">
                      <h3>Build the Next Generation of Your Real-Estate Business</h3>
                      <p>
                        Activate deterministic agency pipelines, collaborative team seats, and architectural listing tools today.
                      </p>
                    </div>
                    <div className="final-cta-buttons">
                      <button
                        type="button"
                        className="final-cta-primary"
                        id="btn-final-cta-start"
                        onClick={() => {
                          const proPlan = plans.find((p) => p.slug === "pro" || p.name.includes("Pro"));
                          if (proPlan) handleOpenCheckout(proPlan);
                          else window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      >
                        Get Started with Pro Agency →
                      </button>
                      <Link to="/properties" className="final-cta-secondary" id="btn-final-cta-browse">
                        Browse Properties
                      </Link>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {/* ==============================================================
               TAB 2: INVOICES & BILLING HISTORY
               ============================================================== */}
            {activeTab === "invoices" && (
              <div className="invoices-card">
                <div className="invoices-header">
                  <div>
                    <h3>Tenant Billing History & Tax Receipts</h3>
                    <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", color: "#64748B" }}>
                      Itemized invoices generated automatically upon subscription activation with 18% GST compliance.
                    </p>
                  </div>
                  <span className="invoices-count-badge">
                    Total Invoices: {invoices.length}
                  </span>
                </div>

                {invoices.length === 0 ? (
                  <div className="empty-invoices-box">
                    <p>No billing invoices generated yet. Invoices appear automatically upon subscription activation.</p>
                  </div>
                ) : (
                  <div className="saas-table-wrap" tabIndex="0" aria-label="Billing history table">
                    <table className="invoices-table">
                      <thead>
                        <tr>
                          <th>Invoice #</th>
                          <th>Date</th>
                          <th>Plan / Description</th>
                          <th>Payment Method</th>
                          <th>Total Amount</th>
                          <th>Status</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoices.map((inv) => (
                          <tr key={inv.id}>
                            <td>
                              <strong>{inv.invoice_number}</strong>
                            </td>
                            <td>{new Date(inv.invoice_date).toLocaleDateString()}</td>
                            <td>{inv.billing_reason}</td>
                            <td>{inv.payment_method}</td>
                            <td>
                              <strong>{formatCurrency(inv.amount, true)}</strong>
                            </td>
                            <td>
                              <span className="status-badge-paid">Paid (Simulated)</span>
                            </td>
                            <td>
                              <button
                                type="button"
                                className="invoice-action-btn"
                                onClick={() => setActiveReceipt(inv)}
                              >
                                View Receipt
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ==============================================================
               TAB 3: TEAM & AGENT SEATS
               ============================================================== */}
            {activeTab === "team" && (
              <div className="team-seats-container">
                <div className="invite-member-card">
                  <h3>Invite Colleague to Organization Workspace</h3>
                  <p>
                    Agent seats count licensed agents only. Workspace owners and staff are not counted against the licensed agent quota.
                  </p>
                  <form onSubmit={handleInviteMember} className="team-invite-form">
                    <div className="form-group flex-2">
                      <label htmlFor="inviteEmailInput">Registered User Email</label>
                      <input
                        id="inviteEmailInput"
                        type="email"
                        required
                        placeholder="colleague@realestate.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                      />
                    </div>
                    <div className="form-group flex-1">
                      <label htmlFor="inviteRoleSelect">Role</label>
                      <select
                        id="inviteRoleSelect"
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value)}
                      >
                        <option value="agent">Licensed Agent</option>
                        <option value="user">Team Member / Staff</option>
                      </select>
                    </div>
                    <button
                      type="submit"
                      disabled={inviteLoading}
                      className="card-cta-btn primary-btn team-invite-btn"
                    >
                      {inviteLoading ? "Adding..." : "+ Add to Team"}
                    </button>
                  </form>
                </div>

                <div className="invoices-card">
                  <div className="invoices-header">
                    <h3>Active Workspace Members ({teamMembers.length})</h3>
                    <span className="invoices-count-badge">
                      Licensed Agent Seats: {agentsCount} / {maxAgents === -1 ? "∞ Unlimited" : maxAgents}
                    </span>
                  </div>
                  <div className="saas-table-wrap" tabIndex="0" aria-label="Team members table">
                    <table className="invoices-table">
                      <thead>
                        <tr>
                          <th>Member Name</th>
                          <th>Email</th>
                          <th>Role</th>
                          <th>Seat Allocation</th>
                          <th>Joined Date</th>
                          <th>Workspace Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teamMembers.map((m) => (
                          <tr key={m.membership_id}>
                            <td>
                              <strong>{m.name}</strong>
                            </td>
                            <td>{m.email}</td>
                            <td>
                              <span style={{ textTransform: "capitalize" }}>{m.role}</span>
                            </td>
                            <td>
                              {m.role === "agent" ? (
                                <span className="seat-badge-agent">Licensed Agent Seat</span>
                              ) : (
                                <span className="seat-badge-staff">Workspace Member</span>
                              )}
                            </td>
                            <td>{new Date(m.joined_at).toLocaleDateString()}</td>
                            <td>
                              <span className="status-badge-paid">
                                {m.is_primary ? "Primary Owner" : "Active Member"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ==============================================================
               TAB 4: SAAS SUPER ADMIN (ADMIN ONLY)
               ============================================================== */}
            {activeTab === "admin" && isAdmin && (
              <div>
                <div className="admin-kpis-grid">
                  <div className="admin-kpi-card">
                    <div className="kpi-label">Monthly Recurring Revenue (MRR)</div>
                    <div className="kpi-value">₹{(adminMetrics?.mrr || 0).toLocaleString()}</div>
                  </div>
                  <div className="admin-kpi-card">
                    <div className="kpi-label">Annual Recurring Revenue (ARR)</div>
                    <div className="kpi-value">₹{(adminMetrics?.arr || 0).toLocaleString()}</div>
                  </div>
                  <div className="admin-kpi-card">
                    <div className="kpi-label">Active Paid Subscribers</div>
                    <div className="kpi-value">{(adminMetrics?.activePaidSubscribers ?? adminMetrics?.activeSubscribers ?? 0)}</div>
                  </div>
                  <div className="admin-kpi-card">
                    <div className="kpi-label">Total Registered Tenants</div>
                    <div className="kpi-value">{adminMetrics?.totalTenants || 0}</div>
                  </div>
                </div>

                <div className="invoices-card">
                  <div className="invoices-header">
                    <h3>All Platform Tenant Workspaces ({adminTenants.length})</h3>
                  </div>
                  <div className="saas-table-wrap" tabIndex="0" aria-label="Tenant directory table">
                    <table className="invoices-table">
                      <thead>
                        <tr>
                          <th>Organization Name</th>
                          <th>Contact Email</th>
                          <th>Active Plan</th>
                          <th>Members</th>
                          <th>Properties</th>
                          <th>Created At</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adminTenants.map((t) => (
                          <tr key={t.organization_id}>
                            <td>
                              <strong>{t.organization_name}</strong>
                            </td>
                            <td>{t.primary_email || "N/A"}</td>
                            <td>
                              <span
                                className={`plan-tier-badge ${
                                  t.plan_slug === "enterprise"
                                    ? "enterprise"
                                    : t.plan_slug === "pro"
                                    ? "pro"
                                    : "starter"
                                }`}
                              >
                                {getCanonicalPlanName({ slug: t.plan_slug, name: t.plan_name }) || "No Plan"}
                              </span>
                            </td>
                            <td>{t.members_count || 0}</td>
                            <td>{t.properties_count || 0}</td>
                            <td>{new Date(t.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
           5. SIMULATED CHECKOUT MODAL
           ───────────────────────────────────────────────────────────── */}
        {selectedPlanForCheckout && (
          <div
            className="saas-modal-backdrop"
            role="dialog"
            aria-modal="true"
            aria-labelledby="checkout-modal-title"
            onClick={() => setSelectedPlanForCheckout(null)}
          >
            <div className="saas-modal-dialog" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div className="modal-title-wrap">
                  <span className="modal-badge-icon">💳</span>
                  <div>
                    <h3 id="checkout-modal-title">Upgrade to {getCanonicalPlanName(selectedPlanForCheckout)}</h3>
                    <p className="modal-subtitle">Instant multi-tenant activation with simulated billing</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => setSelectedPlanForCheckout(null)}
                  aria-label="Close checkout"
                >
                  ✕
                </button>
              </div>

              <div className="modal-body">
                {(() => {
                  const checkoutBasePrice = billingCycle === "yearly"
                    ? Number(selectedPlanForCheckout.price_yearly)
                    : Number(selectedPlanForCheckout.price_monthly);
                  const checkoutGstAmount = checkoutBasePrice > 0 ? Math.round(checkoutBasePrice * 0.18 * 100) / 100 : 0;
                  const checkoutTotalAmount = checkoutBasePrice + checkoutGstAmount;

                  return (
                    <div className="order-summary-box">
                      <div className="summary-row">
                        <span>Selected Plan</span>
                        <strong>{getCanonicalPlanName(selectedPlanForCheckout)}</strong>
                      </div>
                      <div className="summary-row">
                        <span>Billing Frequency</span>
                        <strong style={{ textTransform: "capitalize" }}>{billingCycle}</strong>
                      </div>
                      <div className="summary-row">
                        <span>Base Subscription Subtotal</span>
                        <span>{formatCurrency(checkoutBasePrice)}</span>
                      </div>
                      {checkoutBasePrice > 0 ? (
                        <div className="summary-row">
                          <span>GST / Statutory Tax (18%)</span>
                          <span>{formatCurrency(checkoutGstAmount, true)}</span>
                        </div>
                      ) : (
                        <div className="summary-row">
                          <span>GST / Statutory Tax (18%)</span>
                          <span>₹0 (Tax Exempt for Free Tier)</span>
                        </div>
                      )}
                      <div className="summary-row total">
                        <span>Total Due Now (INR)</span>
                        <span className="total-highlight">
                          {checkoutBasePrice === 0
                            ? "₹0 (Free Forever)"
                            : formatCurrency(checkoutTotalAmount, true)}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                <div className="payment-method-selector">
                  <label className="payment-method-label">
                    Select Simulated Payment Method
                  </label>
                  {[
                    { id: "Simulated Credit Card", label: "💳 Simulated Credit / Debit Card (Instant 3DS)" },
                    { id: "Simulated UPI", label: "📱 Simulated UPI (Instant VPA Authorization)" },
                    { id: "Corporate Wire Transfer", label: "🏛️ Corporate Wire / NetBanking" },
                  ].map((m) => (
                    <div
                      key={m.id}
                      className={`payment-method-option ${paymentMethod === m.id ? "selected" : ""}`}
                      onClick={() => setPaymentMethod(m.id)}
                    >
                      <input
                        type="radio"
                        id={`pay-${m.id}`}
                        name="payment_method_group"
                        checked={paymentMethod === m.id}
                        onChange={() => setPaymentMethod(m.id)}
                      />
                      <label htmlFor={`pay-${m.id}`} style={{ cursor: "pointer", flex: 1, margin: 0 }}>
                        {m.label}
                      </label>
                    </div>
                  ))}
                </div>

                <div className="simulated-note">
                  ℹ️ <strong>100% Simulated Gateway:</strong> No real payment credentials required. A formal tax receipt and subscription state will be activated instantly.
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="card-cta-btn btn-modal-cancel"
                  onClick={() => setSelectedPlanForCheckout(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={checkoutLoading}
                  className="card-cta-btn btn-modal-confirm"
                  id="btn-confirm-checkout"
                  onClick={handleConfirmCheckout}
                >
                  {checkoutLoading ? (
                    <span className="spinner-wrap">
                      <span className="btn-spinner" aria-hidden="true" />
                      <span>Activating...</span>
                    </span>
                  ) : (
                    "Confirm & Activate (Simulated)"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
           6. OFFICIAL TAX RECEIPT / INVOICE MODAL
           ───────────────────────────────────────────────────────────── */}
        {activeReceipt && (
          <div
            className="saas-modal-backdrop"
            role="dialog"
            aria-modal="true"
            aria-labelledby="receipt-modal-title"
            onClick={() => setActiveReceipt(null)}
          >
            <div className="saas-modal-dialog receipt-dialog" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div className="modal-title-wrap">
                  <span className="modal-badge-icon">📜</span>
                  <div>
                    <h3 id="receipt-modal-title">Official Tax Invoice & Receipt</h3>
                    <p className="modal-subtitle">GSTIN Compliant Architectural Cloud Services</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => setActiveReceipt(null)}
                  aria-label="Close receipt"
                >
                  ✕
                </button>
              </div>

              <div className="modal-body">
                <div className="receipt-paper invoice-print-root" id="printable-tax-receipt">
                  <div className="receipt-header">
                    <h2>REALESTATE ARCHITECTURAL PLATFORM</h2>
                    <p>Official Cloud Services • GSTIN: 24AAACE0123M1Z5</p>
                  </div>

                  <div className="receipt-meta">
                    <div>
                      <div className="meta-label">Billed To:</div>
                      <strong>{activeReceipt.organization_name || tenant?.name || "Workspace Tenant"}</strong>
                      <div className="meta-tax">GSTIN / Tax ID: {activeReceipt.organization_tax_id || "GSTIN-PENDING"}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div className="meta-label">Invoice Number:</div>
                      <strong>{activeReceipt.invoice_number}</strong>
                      <div className="meta-date">Date: {new Date(activeReceipt.invoice_date).toLocaleDateString()}</div>
                    </div>
                  </div>

                  <table className="receipt-table">
                    <thead>
                      <tr>
                        <th>Description</th>
                        <th>Tax (18%)</th>
                        <th>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>{activeReceipt.billing_reason}</td>
                        <td>{formatCurrency(activeReceipt.tax_amount || 0, true)}</td>
                        <td>{formatCurrency(activeReceipt.amount, true)}</td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="receipt-total-row">
                    <span>Total Paid:</span>
                    <span>{formatCurrency(activeReceipt.amount, true)} ({activeReceipt.payment_method})</span>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="card-cta-btn btn-modal-confirm"
                  style={{ width: "auto" }}
                  id="btn-print-receipt"
                  onClick={() => window.print()}
                >
                  🖨️ Print / Download Receipt
                </button>
                <button
                  type="button"
                  className="card-cta-btn btn-modal-cancel"
                  style={{ width: "auto" }}
                  onClick={() => setActiveReceipt(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
