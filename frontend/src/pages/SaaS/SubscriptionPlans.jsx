import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import AdminSidebar from "../../components/AdminSidebar/AdminSidebar";
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
  const [selectedPlanForCheckout, setSelectedPlanForCheckout] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("Simulated Credit Card");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState(null);

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
  // DATA FETCHING
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
        } else {
          console.error("Sub Fetch Error:", err);
        }
      }
    } catch (err) {
      console.error("SaaS Data Fetch Error:", err);
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
      console.error("Invoices Fetch Error:", err);
    }
  }, []);

  const fetchTeamMembers = useCallback(async () => {
    try {
      const res = await api.get("/saas/team");
      if (res.data?.success) {
        setTeamMembers(res.data.members || []);
      }
    } catch (err) {
      console.error("Team Fetch Error:", err);
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
      console.error("Admin SaaS Fetch Error:", err);
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
      console.error("Onboarding Submit Error:", err);
      setError(err.response?.data?.message || "Failed to create organization workspace.");
    } finally {
      setOnboardingSubmitting(false);
    }
  };

  const handleOpenCheckout = (plan) => {
    setSelectedPlanForCheckout(plan);
  };

  const handleConfirmCheckout = async () => {
    if (!selectedPlanForCheckout) return;
    setCheckoutLoading(true);
    setError("");
    try {
      const res = await api.post("/saas/subscription/subscribe", {
        planId: selectedPlanForCheckout.id,
        billingCycle,
        paymentMethod,
      });

      if (res.data?.success) {
        setSuccessMsg(`Subscription successfully upgraded to ${selectedPlanForCheckout.name}!`);
        setSelectedPlanForCheckout(null);
        await fetchSaaSData();
        await fetchInvoices();
      }
    } catch (err) {
      console.error("Checkout Error:", err);
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
      console.error("Cancel Sub Error:", err);
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
      console.error("Invite Error:", err);
      setError(err.response?.data?.message || "Failed to invite member.");
    } finally {
      setInviteLoading(false);
    }
  };

  // Helper for pricing display
  const getDisplayPrice = (plan) => {
    if (plan.price_monthly === "0.00" || Number(plan.price_monthly) === 0) return "Free";
    if (billingCycle === "yearly") {
      const annual = Number(plan.price_yearly);
      return `₹${annual.toLocaleString()}`;
    }
    return `₹${Number(plan.price_monthly).toLocaleString()}`;
  };

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
          <div className="error-box" style={{ margin: "1rem 0" }}>
            <span>⚠️ {error}</span>
            <button type="button" onClick={() => setError("")}>×</button>
          </div>
        )}

        {successMsg && (
          <div
            style={{
              background: "#ECFDF5",
              color: "#065F46",
              border: "1px solid #A7F3D0",
              padding: "0.85rem 1.25rem",
              borderRadius: "8px",
              margin: "1rem 0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontWeight: 600,
            }}
          >
            <span>✓ {successMsg}</span>
            <button
              type="button"
              onClick={() => setSuccessMsg("")}
              style={{ background: "none", border: "none", color: "#065F46", fontSize: "1.2rem", cursor: "pointer" }}
            >
              ×
            </button>
          </div>
        )}

        {loading ? (
          <div style={{ padding: "4rem", textAlign: "center", color: "#64748B" }}>
            <p>Loading multi-tenant SaaS workspace...</p>
          </div>
        ) : needsOnboarding ? (
          /* ─────────────────────────────────────────────────────────────
             ONBOARDING VIEW (When User Has No Organization Membership)
             ───────────────────────────────────────────────────────────── */
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

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
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
          /* ─────────────────────────────────────────────────────────────
             ACTIVE TENANT SAAS WORKSPACE
             ───────────────────────────────────────────────────────────── */
          <div className="saas-page-root">
            {/* Top Tenant Context Card */}
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
                  <div style={{ fontSize: "0.75rem", color: "#94A3B8", textTransform: "uppercase", marginBottom: "0.2rem" }}>
                    Active Subscription
                  </div>
                  <span
                    className={`plan-tier-badge ${
                      subscription?.plan_slug === "enterprise"
                        ? "enterprise"
                        : subscription?.plan_slug === "pro"
                        ? "pro"
                        : "starter"
                    }`}
                  >
                    {subscription?.plan_name || "Free Starter"}
                  </span>
                </div>

                {subscription?.current_period_end && (
                  <div style={{ borderLeft: "1px solid rgba(255,255,255,0.15)", paddingLeft: "0.85rem" }}>
                    <div style={{ fontSize: "0.72rem", color: "#94A3B8" }}>Next Renewal</div>
                    <strong style={{ fontSize: "0.88rem", color: "#FFFFFF" }}>
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
                    {usage?.propertiesCount || 0} /{" "}
                    {usage?.maxProperties === -1 ? "∞ Unlimited" : usage?.maxProperties || 5}
                  </span>
                </div>
                <div className="meter-progress-track">
                  <div
                    className={`meter-progress-bar ${
                      (usage?.propertiesPercentage || 0) >= 90
                        ? "danger"
                        : (usage?.propertiesPercentage || 0) >= 70
                        ? "warning"
                        : ""
                    }`}
                    style={{ width: `${usage?.propertiesPercentage || 0}%` }}
                  />
                </div>
                <div className="meter-subtext">
                  <span>{usage?.propertiesPercentage || 0}% Capacity Consumed</span>
                  {usage?.maxProperties !== -1 && (
                    <span>{Math.max(0, (usage?.maxProperties || 5) - (usage?.propertiesCount || 0))} Listings Remaining</span>
                  )}
                </div>
              </div>

              {/* Agent Seats Quota */}
              <div className="usage-meter-card">
                <div className="meter-header">
                  <span className="meter-title">👔 Organization Agent Seats</span>
                  <span className="meter-stat">
                    {usage?.agentsCount || 0} /{" "}
                    {usage?.maxAgents === -1 ? "∞ Unlimited" : usage?.maxAgents || 1}
                  </span>
                </div>
                <div className="meter-progress-track">
                  <div
                    className={`meter-progress-bar ${
                      (usage?.agentsPercentage || 0) >= 90
                        ? "danger"
                        : (usage?.agentsPercentage || 0) >= 70
                        ? "warning"
                        : ""
                    }`}
                    style={{ width: `${usage?.agentsPercentage || 0}%` }}
                  />
                </div>
                <div className="meter-subtext">
                  <span>{usage?.agentsPercentage || 0}% Seats Occupied</span>
                  <span>{usage?.totalMembers || 0} Total Workspace Members</span>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="saas-nav-tabs">
              <button
                type="button"
                className={`saas-tab-btn ${activeTab === "plans" ? "active" : ""}`}
                onClick={() => setActiveTab("plans")}
              >
                💎 Subscription Plans
              </button>
              <button
                type="button"
                className={`saas-tab-btn ${activeTab === "invoices" ? "active" : ""}`}
                onClick={() => setActiveTab("invoices")}
              >
                📜 Billing & Invoices
              </button>
              <button
                type="button"
                className={`saas-tab-btn ${activeTab === "team" ? "active" : ""}`}
                onClick={() => setActiveTab("team")}
              >
                👥 Team & Agent Seats
              </button>

              {isAdmin && (
                <button
                  type="button"
                  className={`saas-tab-btn ${activeTab === "admin" ? "active" : ""}`}
                  onClick={() => setActiveTab("admin")}
                >
                  📊 SaaS Super Admin
                </button>
              )}
            </div>

            {/* TAB 1: PRICING MATRIX & SUBSCRIPTION PLANS */}
            {activeTab === "plans" && (
              <div>
                <div className="pricing-header-wrap">
                  <h2>Architectural SaaS Tiers</h2>
                  <p>
                    Scale your brokerage operations with deterministic listing quotas, AI matching intelligence, and team governance.
                  </p>

                  <div className="billing-cycle-toggle">
                    <button
                      type="button"
                      className={`cycle-btn ${billingCycle === "monthly" ? "active" : ""}`}
                      onClick={() => setBillingCycle("monthly")}
                    >
                      Monthly Billing
                    </button>
                    <button
                      type="button"
                      className={`cycle-btn ${billingCycle === "yearly" ? "active" : ""}`}
                      onClick={() => setBillingCycle("yearly")}
                    >
                      Annual Billing
                      <span className="save-badge">Save ~17% (2 Mo Free)</span>
                    </button>
                  </div>
                </div>

                <div className="pricing-cards-grid">
                  {plans.map((plan) => {
                    const isCurrent = subscription?.plan_id === plan.id;
                    const isPopular = Boolean(plan.is_popular);

                    return (
                      <div
                        key={plan.id}
                        className={`pricing-card ${isPopular ? "popular" : ""}`}
                      >
                        {isPopular && <div className="popular-ribbon">Most Popular</div>}

                        <div className="card-top">
                          <div className="card-title-row">
                            <h3>{plan.name}</h3>
                          </div>
                          <p className="card-tagline">{plan.tagline}</p>

                          <div className="card-price-block">
                            <span className="card-currency">₹</span>
                            <span className="card-price">{getDisplayPrice(plan)}</span>
                            {Number(plan.price_monthly) > 0 && (
                              <span className="card-period">
                                / {billingCycle === "yearly" ? "year" : "month"}
                              </span>
                            )}
                          </div>

                          <ul className="card-features-list">
                            {(plan.features || []).map((feat, idx) => (
                              <li key={idx} className="feature-item">
                                <span className="feature-check">✓</span>
                                <span>{feat}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          {isCurrent ? (
                            <button type="button" className="card-cta-btn active-btn" disabled>
                              ✓ Current Active Plan
                            </button>
                          ) : (
                            <button
                              type="button"
                              className={`card-cta-btn ${isPopular ? "primary-btn" : "outline-btn"}`}
                              onClick={() => handleOpenCheckout(plan)}
                            >
                              {Number(plan.price_monthly) === 0 ? "Downgrade to Starter" : `Upgrade to ${plan.name}`}
                            </button>
                          )}

                          {isCurrent && Number(plan.price_monthly) > 0 && subscription?.auto_renew && (
                            <div style={{ textAlign: "center", marginTop: "0.75rem" }}>
                              <button
                                type="button"
                                onClick={handleCancelAutoRenew}
                                style={{ background: "none", border: "none", color: "#EF4444", fontSize: "0.78rem", cursor: "pointer", textDecoration: "underline" }}
                              >
                                Cancel Auto-Renew
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 2: INVOICES & BILLING HISTORY */}
            {activeTab === "invoices" && (
              <div className="invoices-card">
                <div className="invoices-header">
                  <h3>Tenant Billing History & Tax Receipts</h3>
                  <span style={{ fontSize: "0.85rem", color: "#64748B" }}>
                    Total Invoices: {invoices.length}
                  </span>
                </div>

                {invoices.length === 0 ? (
                  <div style={{ padding: "3rem", textAlign: "center", color: "#64748B" }}>
                    <p>No billing invoices generated yet. Invoices appear automatically upon subscription activation.</p>
                  </div>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table className="invoices-table">
                      <thead>
                        <tr>
                          <th>Invoice #</th>
                          <th>Date</th>
                          <th>Description</th>
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
                              <strong>₹{Number(inv.amount).toLocaleString()}</strong>
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

            {/* TAB 3: TEAM & AGENT SEATS */}
            {activeTab === "team" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "14px", padding: "1.5rem" }}>
                  <h3 style={{ margin: "0 0 1rem 0", color: "#071A33" }}>Invite Colleague to Organization Workspace</h3>
                  <form onSubmit={handleInviteMember} style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "flex-end" }}>
                    <div style={{ flex: 2, minWidth: "260px" }} className="form-group">
                      <label>Registered User Email</label>
                      <input
                        type="email"
                        required
                        placeholder="colleague@realestate.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: "160px" }} className="form-group">
                      <label>Role</label>
                      <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
                        <option value="agent">Licensed Agent</option>
                        <option value="user">Team Member / Staff</option>
                      </select>
                    </div>
                    <button
                      type="submit"
                      disabled={inviteLoading}
                      className="card-cta-btn primary-btn"
                      style={{ height: "42px", padding: "0 1.5rem", width: "auto" }}
                    >
                      {inviteLoading ? "Adding..." : "+ Add to Team"}
                    </button>
                  </form>
                </div>

                <div className="invoices-card">
                  <div className="invoices-header">
                    <h3>Active Organization Members ({teamMembers.length})</h3>
                  </div>
                  <table className="invoices-table">
                    <thead>
                      <tr>
                        <th>Member Name</th>
                        <th>Email</th>
                        <th>Role</th>
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
            )}

            {/* TAB 4: SAAS SUPER ADMIN (ADMIN ONLY) */}
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
                    <div className="kpi-value">{adminMetrics?.activeSubscribers || 0}</div>
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
                  <div style={{ overflowX: "auto" }}>
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
                                {t.plan_name || "No Plan"}
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
           SIMULATED CHECKOUT MODAL
           ───────────────────────────────────────────────────────────── */}
        {selectedPlanForCheckout && (
          <div className="saas-modal-backdrop" onClick={() => setSelectedPlanForCheckout(null)}>
            <div className="saas-modal-dialog" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Upgrade to {selectedPlanForCheckout.name}</h3>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => setSelectedPlanForCheckout(null)}
                >
                  ×
                </button>
              </div>

              <div className="modal-body">
                <div className="order-summary-box">
                  <div className="summary-row">
                    <span>Selected Plan</span>
                    <strong>{selectedPlanForCheckout.name}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Billing Cycle</span>
                    <strong style={{ textTransform: "capitalize" }}>{billingCycle}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Subtotal</span>
                    <span>{getDisplayPrice(selectedPlanForCheckout)}</span>
                  </div>
                  {Number(selectedPlanForCheckout.price_monthly) > 0 && (
                    <div className="summary-row">
                      <span>GST / VAT (18%)</span>
                      <span>
                        ₹
                        {(
                          (billingCycle === "yearly"
                            ? Number(selectedPlanForCheckout.price_yearly)
                            : Number(selectedPlanForCheckout.price_monthly)) * 0.18
                        ).toLocaleString()}
                      </span>
                    </div>
                  )}
                  <div className="summary-row total">
                    <span>Total Due Now</span>
                    <span>
                      {Number(selectedPlanForCheckout.price_monthly) === 0
                        ? "₹0 (Free)"
                        : `₹${(
                            (billingCycle === "yearly"
                              ? Number(selectedPlanForCheckout.price_yearly)
                              : Number(selectedPlanForCheckout.price_monthly)) * 1.18
                          ).toLocaleString()}`}
                    </span>
                  </div>
                </div>

                <div className="payment-method-selector">
                  <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "#334155" }}>
                    Simulated Payment Method
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
                        checked={paymentMethod === m.id}
                        onChange={() => setPaymentMethod(m.id)}
                      />
                      <span>{m.label}</span>
                    </div>
                  ))}
                </div>

                <div className="simulated-note">
                  ℹ️ 100% Simulated Gateway: Zero real payment credentials required. Formal tax invoice and subscription will be generated immediately.
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="card-cta-btn outline-btn"
                  style={{ width: "auto" }}
                  onClick={() => setSelectedPlanForCheckout(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={checkoutLoading}
                  className="card-cta-btn primary-btn"
                  style={{ width: "auto", minWidth: "160px" }}
                  onClick={handleConfirmCheckout}
                >
                  {checkoutLoading ? "Processing..." : "Confirm & Activate (Simulated)"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
           OFFICIAL TAX RECEIPT MODAL
           ───────────────────────────────────────────────────────────── */}
        {activeReceipt && (
          <div className="saas-modal-backdrop" onClick={() => setActiveReceipt(null)}>
            <div className="saas-modal-dialog" style={{ maxWidth: "580px" }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Official Tax Receipt</h3>
                <button type="button" className="modal-close-btn" onClick={() => setActiveReceipt(null)}>
                  ×
                </button>
              </div>

              <div className="modal-body">
                <div className="receipt-paper">
                  <div className="receipt-header">
                    <h2>REALESTATE SAAS PLATFORM</h2>
                    <p style={{ margin: 0, fontSize: "0.82rem", color: "#64748B" }}>
                      Official Architectural Cloud Services • GSTIN: 24AAACE0123M1Z5
                    </p>
                  </div>

                  <div className="receipt-meta">
                    <div>
                      <div style={{ color: "#64748B" }}>Billed To:</div>
                      <strong>{activeReceipt.organization_name}</strong>
                      <div>Tax ID: {activeReceipt.organization_tax_id || "GSTIN-PENDING"}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ color: "#64748B" }}>Invoice Number:</div>
                      <strong>{activeReceipt.invoice_number}</strong>
                      <div>Date: {new Date(activeReceipt.invoice_date).toLocaleDateString()}</div>
                    </div>
                  </div>

                  <table className="receipt-table">
                    <thead>
                      <tr>
                        <th>Description</th>
                        <th>Tax</th>
                        <th>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>{activeReceipt.billing_reason}</td>
                        <td>₹{Number(activeReceipt.tax_amount || 0).toLocaleString()}</td>
                        <td>₹{Number(activeReceipt.amount).toLocaleString()}</td>
                      </tr>
                    </tbody>
                  </table>

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.95rem", fontWeight: 800 }}>
                    <span>Total Paid:</span>
                    <span>₹{Number(activeReceipt.amount).toLocaleString()} ({activeReceipt.payment_method})</span>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="card-cta-btn primary-btn"
                  style={{ width: "auto" }}
                  onClick={() => window.print()}
                >
                  🖨️ Print / Download Receipt
                </button>
                <button
                  type="button"
                  className="card-cta-btn outline-btn"
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
