import { useState, useEffect, useMemo, useCallback } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import "./AdminSidebar.css";

export default function AdminSidebar({ className = "" }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const getUser = () => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  };

  const user = getUser();
  const isAdmin = user?.role === "admin";

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/", { replace: true });
  };

  // ─────────────────────────────────────────────────────────────
  // 15 BUSINESS-ORIENTED ENTERPRISE SUITE CATEGORIES
  // ─────────────────────────────────────────────────────────────
  const enterpriseCategories = useMemo(
    () => [
      {
        id: "prop_intelligence",
        label: "Property Intelligence",
        icon: "🧠",
        children: [
          { id: "adv_search", label: "Advanced Property Search", path: "/properties", isDefaultSub: true },
          { id: "smart_filters", label: "Smart Filters", path: "/properties", query: { filter: "active" } },
          { id: "prop_analytics", label: "Property Analytics", path: "/properties", query: { tab: "analytics" } },
          { id: "prop_insights", label: "Property Insights", path: "/properties", query: { tab: "insights" } },
          { id: "prop_recommendations", label: "Property Recommendations", path: "/properties", query: { tab: "recommendations" } },
        ],
      },
      {
        id: "prop_management",
        label: "Property Management",
        icon: "🏢",
        children: [
          { id: "inventory", label: "Property Inventory", path: "/properties", query: { view: "inventory" } },
          { id: "studio_3d", label: "3D Studio View", path: "/properties", query: { view: "3d" } },
          { id: "doc_vault", label: "Document Vault", path: "/properties", query: { action: "vault" } },
          { id: "operations", label: "Property Operations", path: "/properties", query: { action: "operations" } },
          { id: "saved_props", label: "Saved Properties", path: "/saved-properties" },
        ],
      },
      {
        id: "leads_crm",
        label: "Leads & CRM",
        icon: "📋",
        children: [
          { id: "crm_kanban", label: "Lead Pipeline", path: "/enterprise", tab: "crm", isDefaultSub: true },
          { id: "crm_table", label: "Lead Management", path: "/enterprise", tab: "crm", query: { view: "table" } },
          { id: "crm_assignment", label: "Lead Assignment", path: "/enterprise", tab: "crm", query: { view: "assignment" } },
          { id: "crm_followups", label: "Follow-ups & Tasks", path: "/enterprise", tab: "crm", query: { view: "followups" } },
          { id: "crm_activity", label: "Lead Activity Stream", path: "/enterprise", tab: "crm", query: { view: "activity" } },
        ],
      },
      {
        id: "agent_mgmt",
        label: "Agent Management",
        icon: "👔",
        children: [
          { id: "agent_directory", label: "Agent Directory", path: "/agents" },
          { id: "broker_leaderboard", label: "Performance Leaderboard", path: "/enterprise", tab: "broker", sub: "leaderboard", isDefaultSub: true },
          { id: "broker_commissions", label: "Commission Split", path: "/enterprise", tab: "broker", sub: "commissions" },
          { id: "broker_allocation", label: "Desk & Licensing Allocation", path: "/enterprise", tab: "broker", sub: "allocation" },
        ],
      },
      {
        id: "sales_deals",
        label: "Sales & Deals",
        icon: "🤝",
        children: [
          { id: "deals_pipeline", label: "Deal Pipeline", path: "/enterprise", tab: "deals", sub: "pipeline", isDefaultSub: true },
          { id: "deals_milestones", label: "Escrow Milestones", path: "/enterprise", tab: "deals", sub: "milestones" },
          { id: "deals_offers", label: "Offers & Contracts", path: "/enterprise", tab: "deals", sub: "offers" },
          { id: "deals_closing", label: "Closing Checklist", path: "/enterprise", tab: "deals", sub: "closing" },
        ],
      },
      {
        id: "finance_acct",
        label: "Finance & Accounting",
        icon: "💰",
        children: [
          { id: "fin_ledger", label: "General Ledger", path: "/enterprise", tab: "finance", sub: "ledger", isDefaultSub: true },
          { id: "fin_pnl", label: "Cash Flow & P&L", path: "/enterprise", tab: "finance", sub: "pnl" },
          { id: "fin_invoices", label: "Invoicing & Tax Schedules", path: "/enterprise", tab: "finance", sub: "invoices" },
        ],
      },
      {
        id: "marketing_hub",
        label: "Marketing",
        icon: "📢",
        children: [
          { id: "mkt_campaigns", label: "Campaign Hub", path: "/enterprise", tab: "marketing", sub: "campaigns", isDefaultSub: true },
          { id: "mkt_landing", label: "Landing Page Builder", path: "/enterprise", tab: "marketing", sub: "landing" },
          { id: "mkt_social", label: "Social & Ad Channels", path: "/enterprise", tab: "marketing", sub: "social" },
          { id: "mkt_brochures", label: "Brochure Generator", path: "/enterprise", tab: "marketing", sub: "brochures" },
        ],
      },
      {
        id: "communications_hub",
        label: "Communications",
        icon: "💬",
        children: [
          { id: "comm_chat", label: "Live Chat & Messaging", path: "/enterprise", tab: "communications", sub: "chat", isDefaultSub: true },
          { id: "comm_tours", label: "Virtual Tour Requests", path: "/enterprise", tab: "communications", sub: "tours" },
          { id: "comm_notifs", label: "Automated Notifications", path: "/enterprise", tab: "communications", sub: "notifications" },
        ],
      },
      {
        id: "ai_smart_search",
        label: "AI & Smart Search",
        icon: "⚡",
        children: [
          { id: "ai_nl_search", label: "Natural Language Query", path: "/enterprise", tab: "aimaps", sub: "nl_search", isDefaultSub: true },
          { id: "ai_buyer_match", label: "AI Buyer-Property Match", path: "/enterprise", tab: "aimaps", sub: "buyer_match" },
        ],
      },
      {
        id: "maps_geo",
        label: "Maps & Geo",
        icon: "🗺️",
        children: [
          { id: "geo_property_map", label: "Geo-Spatial Property Map", path: "/enterprise", tab: "aimaps", sub: "geo_map", isDefaultSub: true },
          { id: "geo_density", label: "City Density Heatmap", path: "/enterprise", tab: "aimaps", sub: "geo_map", query: { view: "density" } },
        ],
      },
      {
        id: "analytics_bi",
        label: "Analytics & BI",
        icon: "📊",
        children: [
          { id: "bi_overview", label: "Executive BI Dashboard", path: "/enterprise", tab: "executive", sub: "bi", isDefaultSub: true },
          { id: "bi_velocity", label: "Revenue Velocity", path: "/enterprise", tab: "executive", sub: "bi", query: { metric: "velocity" } },
          { id: "bi_funnels", label: "Conversion Funnels", path: "/enterprise", tab: "executive", sub: "bi", query: { metric: "funnels" } },
        ],
      },
      {
        id: "security_rbac",
        label: "Security & RBAC",
        icon: "🛡️",
        children: [
          { id: "sec_roles", label: "User Permissions & Roles", path: "/enterprise", tab: "executive", sub: "rbac", isDefaultSub: true },
          { id: "sec_audit", label: "Security Audit Logs", path: "/enterprise", tab: "executive", sub: "audit" },
          { id: "sec_branches", label: "Branch Access Control", path: "/enterprise", tab: "executive", sub: "rbac", query: { view: "branches" } },
        ],
      },
      {
        id: "legal_compliance",
        label: "Legal & Compliance",
        icon: "⚖️",
        children: [
          { id: "legal_templates", label: "Document Templates", path: "/enterprise", tab: "governance", sub: "agreements", isDefaultSub: true },
          { id: "legal_contracts", label: "Digital Contracts & Signatures", path: "/enterprise", tab: "governance", sub: "agreements", query: { view: "signed" } },
          { id: "legal_disputes", label: "Dispute Tracking", path: "/enterprise", tab: "governance", sub: "agreements", query: { view: "disputes" } },
        ],
      },
      {
        id: "integrations_api",
        label: "Integrations & API",
        icon: "🔌",
        children: [
          { id: "api_keys", label: "Developer API Keys", path: "/enterprise", tab: "governance", sub: "apikeys", isDefaultSub: true },
          { id: "api_webhooks", label: "Webhooks & Endpoints", path: "/enterprise", tab: "governance", sub: "apikeys", query: { view: "webhooks" } },
        ],
      },
      {
        id: "organization_suite",
        label: "Organization",
        icon: "🏛️",
        children: [
          { id: "org_profile", label: "Organization Profile", path: "/enterprise", tab: "governance", sub: "organization", isDefaultSub: true },
          { id: "org_governance", label: "Branch & Entity Governance", path: "/enterprise", tab: "governance", sub: "organization", query: { view: "governance" } },
        ],
      },
    ],
    []
  );

  // ─────────────────────────────────────────────────────────────
  // ROUTE-AWARE ACTIVE STATE EVALUATION
  // ─────────────────────────────────────────────────────────────
  const isPrimaryActive = (path) => {
    if (path === "/properties") {
      return location.pathname === "/properties" && !searchParams.has("tab") && !searchParams.has("action") && !searchParams.has("sub") && !searchParams.has("filter");
    }
    return location.pathname === path;
  };

  const isChildActive = useCallback(
    (child) => {
      // 1. Enterprise Portal Matching
      if (child.path === "/enterprise") {
        if (location.pathname !== "/enterprise") return false;
        const currentTab = searchParams.get("tab") || "crm";
        if (child.tab && currentTab !== child.tab) return false;

        const currentSub = searchParams.get("sub");
        if (child.sub) {
          if (currentSub) {
            return currentSub === child.sub;
          }
          return !!child.isDefaultSub;
        } else if (currentSub) {
          return false;
        }

        if (child.query) {
          for (const [k, v] of Object.entries(child.query)) {
            if (searchParams.get(k) !== v) return false;
          }
          return true;
        } else if (child.isDefaultSub && !searchParams.get("view")) {
          return true;
        }
        return false;
      }

      // 2. Direct routes (/properties, /saved-properties, /agents, /users)
      if (location.pathname === child.path) {
        if (child.query) {
          for (const [k, v] of Object.entries(child.query)) {
            if (searchParams.get(k) !== v) return false;
          }
          return true;
        }
        if (child.isDefaultSub && searchParams.toString() === "") {
          return true;
        }
        return false;
      }

      return false;
    },
    [location.pathname, searchParams]
  );

  const isCategoryActive = useCallback(
    (category) => {
      return category.children.some((child) => isChildActive(child));
    },
    [isChildActive]
  );

  // ─────────────────────────────────────────────────────────────
  // EXPAND / COLLAPSE STATE
  // ─────────────────────────────────────────────────────────────
  const [expandedCategories, setExpandedCategories] = useState({});

  // Auto-expand any category containing the currently active route
  useEffect(() => {
    enterpriseCategories.forEach((cat) => {
      if (isCategoryActive(cat)) {
        setExpandedCategories((prev) => ({ ...prev, [cat.id]: true }));
      }
    });
  }, [location.pathname, searchParams, enterpriseCategories, isCategoryActive]);

  const toggleCategory = (categoryId) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  const handleNavigateChild = (child) => {
    let url = child.path;
    const params = new URLSearchParams();

    if (child.tab) {
      params.set("tab", child.tab);
    }
    if (child.sub) {
      params.set("sub", child.sub);
    }
    if (child.query) {
      for (const [k, v] of Object.entries(child.query)) {
        params.set(k, v);
      }
    }

    const qs = params.toString();
    if (qs) {
      url += `?${qs}`;
    }

    navigate(url);
  };

  return (
    <aside className={`admin-sidebar-root ${className}`}>
      {/* Brand Header */}
      <div className="admin-sidebar-brand" onClick={() => navigate("/dashboard")} role="button" tabIndex={0}>
        <div className="admin-brand-icon">🏢</div>
        <div className="admin-brand-info">
          <h2>RealEstate</h2>
          <span>{isAdmin ? "Admin Studio" : "Agent Studio"}</span>
        </div>
      </div>

      {/* Main Navigation Scroll Area */}
      <div className="admin-sidebar-scrollable">
        {/* Primary Navigation Items */}
        <div className="admin-nav-group primary-nav-group">
          <button
            type="button"
            className={`admin-nav-item ${isPrimaryActive("/dashboard") ? "active" : ""}`}
            onClick={() => navigate("/dashboard")}
          >
            <span className="nav-icon">📊</span>
            <span className="nav-label">Dashboard</span>
          </button>

          {isAdmin && (
            <>
              <button
                type="button"
                className={`admin-nav-item ${isPrimaryActive("/users") ? "active" : ""}`}
                onClick={() => navigate("/users")}
              >
                <span className="nav-icon">👥</span>
                <span className="nav-label">Users</span>
              </button>

              <button
                type="button"
                className={`admin-nav-item ${isPrimaryActive("/agents") ? "active" : ""}`}
                onClick={() => navigate("/agents")}
              >
                <span className="nav-icon">🤝</span>
                <span className="nav-label">Agents</span>
              </button>
            </>
          )}

          <button
            type="button"
            className={`admin-nav-item ${isPrimaryActive("/properties") ? "active" : ""}`}
            onClick={() => navigate("/properties")}
          >
            <span className="nav-icon">🏠</span>
            <span className="nav-label">Properties</span>
          </button>
        </div>

        {/* Subtle Separator */}
        <div className="admin-nav-divider" />

        {/* Enterprise Suite Section (Neutral header, NEVER permanently highlighted) */}
        <div className="enterprise-suite-section">
          <div className="enterprise-section-header">
            <span className="enterprise-section-icon">🚀</span>
            <span className="enterprise-section-title">Enterprise Suite</span>
          </div>

          {/* 15 Expandable Categories */}
          <div className="enterprise-categories-list">
            {enterpriseCategories.map((category) => {
              const isExpanded = !!expandedCategories[category.id];
              const containsActive = isCategoryActive(category);

              return (
                <div
                  key={category.id}
                  className={`enterprise-category-group ${isExpanded ? "expanded" : ""} ${
                    containsActive ? "contains-active" : ""
                  }`}
                >
                  {/* Category Header (Accordion trigger) */}
                  <button
                    type="button"
                    className="category-header-btn"
                    onClick={() => toggleCategory(category.id)}
                    aria-expanded={isExpanded}
                  >
                    <span className="cat-icon">{category.icon}</span>
                    <span className="cat-label">{category.label}</span>
                    <span className="cat-chevron" aria-hidden="true">
                      {isExpanded ? "˅" : "›"}
                    </span>
                  </button>

                  {/* Submenu Children */}
                  {isExpanded && (
                    <div className="category-submenu">
                      {category.children.map((child) => {
                        const active = isChildActive(child);
                        return (
                          <button
                            key={child.id}
                            type="button"
                            className={`submenu-child-item ${active ? "active" : ""}`}
                            onClick={() => handleNavigateChild(child)}
                          >
                            <span className="child-indicator" />
                            <span className="child-label">{child.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sidebar Footer / Logout */}
      <div className="admin-sidebar-footer">
        <button type="button" className="admin-logout-btn" onClick={handleLogout} title="Sign Out">
          <span className="logout-icon">🚪</span>
          <span className="logout-label">Logout</span>
        </button>
      </div>
    </aside>
  );
}
