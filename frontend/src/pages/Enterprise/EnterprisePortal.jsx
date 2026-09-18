import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import CRMModule from "./components/CRMModule";
import BrokerModule from "./components/BrokerModule";
import DealsModule from "./components/DealsModule";
import FinanceModule from "./components/FinanceModule";
import MarketingModule from "./components/MarketingModule";
import CommunicationsModule from "./components/CommunicationsModule";
import AIMapsModule from "./components/AIMapsModule";
import AnalyticsSecurityModule from "./components/AnalyticsSecurityModule";
import LegalGovernanceModule from "./components/LegalGovernanceModule";
import "./EnterprisePortal.css";

export default function EnterprisePortal() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "crm";
  const [activeTab, setActiveTab] = useState(initialTab);

  const getUser = () => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  };

  const user = getUser();
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    const u = getUser();
    if (!u || u.role === "user") {
      navigate("/properties", { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [searchParams, activeTab]);

  const navTabsRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkNavScroll = useCallback(() => {
    if (navTabsRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = navTabsRef.current;
      setCanScrollLeft(scrollLeft > 4);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
    }
  }, []);

  useEffect(() => {
    checkNavScroll();
    window.addEventListener("resize", checkNavScroll);
    return () => window.removeEventListener("resize", checkNavScroll);
  }, [checkNavScroll]);

  // Ensure active tab is visible when changed without breaking left edge for first tab
  useEffect(() => {
    if (navTabsRef.current) {
      if (activeTab === "crm") {
        navTabsRef.current.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        const activeBtn = navTabsRef.current.querySelector(`.ent-tab-button.active`);
        if (activeBtn) {
          activeBtn.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
        }
      }
      setTimeout(checkNavScroll, 250);
    }
  }, [activeTab, checkNavScroll]);

  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    setSearchParams({ tab: tabKey });
  };

  const scrollNav = (direction) => {
    if (navTabsRef.current) {
      const scrollAmount = direction === "left" ? -280 : 280;
      navTabsRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
      setTimeout(checkNavScroll, 300);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/", { replace: true });
  };

  const navigationItems = [
    { key: "crm", label: "CRM & Leads", icon: "📋", badge: "P3" },
    { key: "broker", label: "Broker & Agents", icon: "👔", badge: "P4" },
    { key: "deals", label: "Sales & Deals", icon: "🤝", badge: "P5" },
    { key: "finance", label: "Finance & Ledger", icon: "💰", badge: "P6" },
    { key: "marketing", label: "Marketing Hub", icon: "📢", badge: "P7" },
    { key: "communications", label: "Chat & Tours", icon: "💬", badge: "P8" },
    { key: "aimaps", label: "AI & Geo-Maps", icon: "🧠", badge: "P9-10" },
    { key: "executive", label: "Executive BI & RBAC", icon: "📊", badge: "P11-12" },
    { key: "governance", label: "Legal & Governance", icon: "⚖️", badge: "P13-15" }
  ];

  return (
    <div className="enterprise-portal-root">
      {/* Top Enterprise Header Bar */}
      <header className="enterprise-header">
        <div className="ent-brand-section">
          <div className="ent-logo-icon">🏢</div>
          <div>
            <div className="ent-brand-title">
              <h1>EstateElite Enterprise</h1>
              <span className="ent-badge-suite">STAGE 1 SUITE</span>
            </div>
            <p className="ent-brand-subtitle">Commercial-Grade Real Estate Management Platform</p>
          </div>
        </div>

        <div className="ent-header-actions">
          <Link to="/dashboard" className="ent-nav-link">
            📊 Classic Dashboard
          </Link>
          <Link to="/properties" className="ent-nav-link">
            🏠 Properties
          </Link>
          <Link to="/saved-properties" className="ent-nav-link">
            ❤️ Saved
          </Link>

          <div className="ent-user-pill">
            <div className="user-initial">{(user?.name || "U").charAt(0).toUpperCase()}</div>
            <div className="user-info-text">
              <span className="user-name">{user?.name || "Enterprise User"}</span>
              <span className="user-role">{isAdmin ? "Administrator" : "Agent"}</span>
            </div>
          </div>

          <button type="button" className="ent-logout-btn" onClick={handleLogout} title="Sign Out">
            🚪 Logout
          </button>
        </div>
      </header>

      {/* Main Suite Navigation Bar */}
      <nav className="enterprise-nav-tabs" aria-label="Enterprise Navigation">
        {canScrollLeft && (
          <button
            type="button"
            className="ent-nav-scroll-btn scroll-left"
            onClick={() => scrollNav("left")}
            aria-label="Scroll navigation left"
            title="Scroll left"
          >
            ‹
          </button>
        )}
        <div
          className="nav-tabs-scrollable"
          ref={navTabsRef}
          onScroll={checkNavScroll}
        >
          {navigationItems.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`ent-tab-button ${activeTab === item.key ? "active" : ""}`}
              onClick={() => handleTabChange(item.key)}
            >
              <span className="tab-icon">{item.icon}</span>
              <span className="tab-label">{item.label}</span>
              <span className="tab-badge">{item.badge}</span>
            </button>
          ))}
        </div>
        {canScrollRight && (
          <button
            type="button"
            className="ent-nav-scroll-btn scroll-right"
            onClick={() => scrollNav("right")}
            aria-label="Scroll navigation right"
            title="Scroll right"
          >
            ›
          </button>
        )}
      </nav>

      {/* Active Enterprise Module Display */}
      <main className="enterprise-main-body">
        {activeTab === "crm" && <CRMModule />}
        {activeTab === "broker" && <BrokerModule />}
        {activeTab === "deals" && <DealsModule />}
        {activeTab === "finance" && <FinanceModule />}
        {activeTab === "marketing" && <MarketingModule />}
        {activeTab === "communications" && <CommunicationsModule />}
        {activeTab === "aimaps" && <AIMapsModule />}
        {activeTab === "executive" && <AnalyticsSecurityModule />}
        {activeTab === "governance" && <LegalGovernanceModule />}
      </main>
    </div>
  );
}
