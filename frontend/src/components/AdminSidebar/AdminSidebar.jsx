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
  // ENTERPRISE SUITE CATEGORIES (VERIFIED IMPLEMENTED FEATURES)
  // ─────────────────────────────────────────────────────────────
  const enterpriseCategories = useMemo(
    () => [
      {
        id: "leads_crm",
        label: "Leads & CRM",
        icon: "📋",
        children: [
          { id: "crm_kanban", label: "Lead Pipeline", path: "/enterprise", tab: "crm", query: { view: "kanban" }, isDefaultSub: true },
          { id: "crm_table", label: "Lead Management", path: "/enterprise", tab: "crm", query: { view: "table" } },
        ],
      },
      {
        id: "agent_mgmt",
        label: "Agent Management",
        icon: "👔",
        children: [
          { id: "broker_kpi", label: "KPIs & Performance", path: "/enterprise", tab: "broker", sub: "overview", isDefaultSub: true },
          { id: "broker_commissions", label: "Commission Ledger", path: "/enterprise", tab: "broker", sub: "commissions" },
          { id: "broker_payouts", label: "Agent Payouts", path: "/enterprise", tab: "broker", sub: "payouts" },
          { id: "broker_quotas", label: "Sales Quotas", path: "/enterprise", tab: "broker", sub: "quotas" },
          { id: "broker_leaderboard", label: "Performance Leaderboard", path: "/enterprise", tab: "broker", sub: "leaderboard" },
          { id: "broker_territories", label: "Territory Assignments", path: "/enterprise", tab: "broker", sub: "territories" },
        ],
      },
      {
        id: "sales_deals",
        label: "Sales & Deals",
        icon: "🤝",
        children: [
          { id: "deals_pipeline", label: "Deal Pipeline & Escrow", path: "/enterprise", tab: "deals", isDefaultSub: true },
        ],
      },
      {
        id: "finance_acct",
        label: "Finance & Accounting",
        icon: "💰",
        children: [
          { id: "fin_pnl", label: "Profit & Loss Statement", path: "/enterprise", tab: "finance", sub: "pnl", isDefaultSub: true },
          { id: "fin_accounts", label: "Chart of Accounts", path: "/enterprise", tab: "finance", sub: "accounts" },
          { id: "fin_invoices", label: "Milestone Invoices", path: "/enterprise", tab: "finance", sub: "invoices" },
          { id: "fin_ledger", label: "General Ledger", path: "/enterprise", tab: "finance", sub: "ledger" },
          { id: "fin_expenses", label: "Operating Expenses", path: "/enterprise", tab: "finance", sub: "expenses" },
        ],
      },
      {
        id: "marketing_hub",
        label: "Marketing",
        icon: "📢",
        children: [
          { id: "mkt_campaigns", label: "Campaign Hub", path: "/enterprise", tab: "marketing", sub: "campaigns", isDefaultSub: true },
          { id: "mkt_landing", label: "Dynamic Landing Pages", path: "/enterprise", tab: "marketing", sub: "landing_pages" },
          { id: "mkt_automations", label: "Lead Automations", path: "/enterprise", tab: "marketing", sub: "automations" },
        ],
      },
      {
        id: "communications_hub",
        label: "Communications",
        icon: "💬",
        children: [
          { id: "comm_threads", label: "Live Messaging & Threads", path: "/enterprise", tab: "communications", sub: "threads", isDefaultSub: true },
          { id: "comm_appts", label: "Virtual Tour Appointments", path: "/enterprise", tab: "communications", sub: "appointments" },
          { id: "comm_notifs", label: "Centralized Notifications", path: "/enterprise", tab: "communications", sub: "notifications" },
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
          { id: "geo_property_map", label: "Geospatial Property Map", path: "/enterprise", tab: "aimaps", sub: "geo_map", isDefaultSub: true },
        ],
      },
      {
        id: "analytics_bi",
        label: "Analytics & BI",
        icon: "📊",
        children: [
          { id: "bi_overview", label: "Executive BI Dashboard", path: "/enterprise", tab: "executive", sub: "bi", isDefaultSub: true },
        ],
      },
      {
        id: "security_rbac",
        label: "Security & RBAC",
        icon: "🛡️",
        children: [
          { id: "sec_roles", label: "Roles & Permissions", path: "/enterprise", tab: "executive", sub: "rbac", isDefaultSub: true },
          { id: "sec_audit", label: "Security Audit Logs", path: "/enterprise", tab: "executive", sub: "audit" },
        ],
      },
      {
        id: "legal_compliance",
        label: "Legal & Compliance",
        icon: "⚖️",
        children: [
          { id: "legal_contracts", label: "Legal Contracts & E-Signs", path: "/enterprise", tab: "governance", sub: "agreements", isDefaultSub: true },
        ],
      },
      {
        id: "integrations_api",
        label: "Integrations & API",
        icon: "🔌",
        children: [
          { id: "api_keys", label: "Developer API Keys", path: "/enterprise", tab: "governance", sub: "apikeys", isDefaultSub: true },
        ],
      },
      {
        id: "organization_suite",
        label: "Organization",
        icon: "🏛️",
        children: [
          { id: "org_profile", label: "Organization Profile", path: "/enterprise", tab: "governance", sub: "organization", isDefaultSub: true },
        ],
      },
    ],
    []
  );

  // ─────────────────────────────────────────────────────────────
  // ROUTE-AWARE ACTIVE STATE EVALUATION
  // ─────────────────────────────────────────────────────────────
  const isPrimaryActive = (path) => {
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
            if (currentSub !== child.sub) return false;
          } else if (!child.isDefaultSub) {
            return false;
          }
        } else if (currentSub) {
          return false;
        }

        if (child.query) {
          for (const [k, v] of Object.entries(child.query)) {
            const val = searchParams.get(k);
            if (val) {
              if (val !== v) return false;
            } else {
              if (!child.isDefaultSub) return false;
            }
          }
          return true;
        }

        if (searchParams.get("view") && !child.query) {
          return false;
        }

        if (child.isDefaultSub) {
          return true;
        }

        return !child.sub && !child.query;
      }

      // 2. Direct routes
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

          <button
            type="button"
            className={`admin-nav-item ${isPrimaryActive("/subscription") ? "active" : ""}`}
            onClick={() => navigate("/subscription")}
          >
            <span className="nav-icon">💎</span>
            <span className="nav-label">Plans & Billing</span>
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

          {/* Enterprise Categories */}
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
