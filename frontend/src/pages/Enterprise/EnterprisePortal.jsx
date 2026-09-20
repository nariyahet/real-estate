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
import AdminSidebar from "../../components/AdminSidebar/AdminSidebar";
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
  const isFirstRender = useRef(true);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);

  const checkNavScroll = useCallback(() => {
    if (navTabsRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = navTabsRef.current;
      const overflow = scrollWidth > clientWidth + 2;
      setHasOverflow(overflow);
      setCanScrollLeft(overflow && scrollLeft > 2);
      setCanScrollRight(overflow && scrollLeft + clientWidth < scrollWidth - 2);
    }
  }, []);

  const scrollToTab = useCallback((tabKey, isMount = false) => {
    const container = navTabsRef.current;
    if (!container) return;

    if (tabKey === "crm") {
      container.scrollTo({ left: 0, behavior: isMount ? "auto" : "smooth" });
      setTimeout(checkNavScroll, 100);
      return;
    }

    const allBtns = Array.from(container.querySelectorAll(".ent-tab-button"));
    const targetBtn = container.querySelector(`[data-tab-key="${tabKey}"]`);
    if (!targetBtn || allBtns.length === 0) return;

    const maxScroll = Math.max(0, container.scrollWidth - container.clientWidth);
    if (maxScroll <= 0) {
      container.scrollTo({ left: 0, behavior: "auto" });
      setTimeout(checkNavScroll, 100);
      return;
    }

    const tabStart = Math.max(0, targetBtn.offsetLeft - 4);
    const tabEnd = targetBtn.offsetLeft + targetBtn.offsetWidth;
    const currentLeft = container.scrollLeft;
    const currentRight = currentLeft + container.clientWidth;

    // If active tab is already fully visible inside visible window, do not scroll
    if (tabStart >= currentLeft - 2 && tabEnd <= currentRight + 2) {
      checkNavScroll();
      return;
    }

    // If active tab fits within container at scrollLeft = 0, stay at 0
    if (tabEnd <= container.clientWidth) {
      container.scrollTo({ left: 0, behavior: isMount ? "auto" : "smooth" });
      setTimeout(checkNavScroll, 100);
      return;
    }

    // Target tab needs scrolling: align to a tab boundary so left edge is never clipped
    let targetScroll = tabStart;
    if (tabStart >= currentLeft) {
      for (let i = 0; i < allBtns.length; i++) {
        const candStart = Math.max(0, allBtns[i].offsetLeft - 4);
        if (candStart + container.clientWidth >= tabEnd + 4 && candStart <= tabStart) {
          targetScroll = candStart;
          break;
        }
      }
    }

    const clamped = Math.max(0, Math.min(targetScroll, maxScroll));
    container.scrollTo({ left: clamped, behavior: isMount ? "auto" : "smooth" });
    setTimeout(checkNavScroll, 150);
  }, [checkNavScroll]);

  useEffect(() => {
    checkNavScroll();
    window.addEventListener("resize", checkNavScroll);
    return () => window.removeEventListener("resize", checkNavScroll);
  }, [checkNavScroll]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isFirstRender.current) {
        isFirstRender.current = false;
        if (activeTab === "crm") {
          if (navTabsRef.current) navTabsRef.current.scrollLeft = 0;
          checkNavScroll();
        } else {
          scrollToTab(activeTab, true);
        }
      } else {
        scrollToTab(activeTab, false);
      }
    }, 60);
    return () => clearTimeout(timer);
  }, [activeTab, scrollToTab, checkNavScroll]);

  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    setSearchParams({ tab: tabKey });
  };

  const scrollNav = (direction) => {
    const container = navTabsRef.current;
    if (!container) return;
    const maxScroll = Math.max(0, container.scrollWidth - container.clientWidth);
    const allBtns = Array.from(container.querySelectorAll(".ent-tab-button"));
    if (allBtns.length === 0) return;

    const currentLeft = container.scrollLeft;

    if (direction === "right") {
      let nextTab = null;
      for (const btn of allBtns) {
        const btnStart = Math.max(0, btn.offsetLeft - 4);
        if (btnStart > currentLeft + 8) {
          nextTab = btn;
          break;
        }
      }
      const target = nextTab ? Math.max(0, nextTab.offsetLeft - 4) : maxScroll;
      container.scrollTo({ left: Math.min(target, maxScroll), behavior: "smooth" });
    } else {
      let prevTab = null;
      for (let i = allBtns.length - 1; i >= 0; i--) {
        const btn = allBtns[i];
        const btnStart = Math.max(0, btn.offsetLeft - 4);
        if (btnStart < currentLeft - 8) {
          prevTab = btn;
          break;
        }
      }
      const target = prevTab ? Math.max(0, prevTab.offsetLeft - 4) : 0;
      container.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
    }
    setTimeout(checkNavScroll, 250);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/", { replace: true });
  };

  const navigationItems = [
    { key: "crm", label: "CRM & Leads", icon: "📋" },
    { key: "broker", label: "Broker & Agents", icon: "👔" },
    { key: "deals", label: "Sales & Deals", icon: "🤝" },
    { key: "finance", label: "Finance & Ledger", icon: "💰" },
    { key: "marketing", label: "Marketing Hub", icon: "📢" },
    { key: "communications", label: "Chat & Tours", icon: "💬" },
    { key: "aimaps", label: "AI & Geo-Maps", icon: "🧠" },
    { key: "executive", label: "Executive BI & RBAC", icon: "📊" },
    { key: "governance", label: "Legal & Governance", icon: "⚖️" }
  ];

  return (
    <div className="enterprise-portal-layout">
      {/* Enterprise Admin Studio Sidebar */}
      <AdminSidebar />

      <div className="enterprise-portal-root">
        {/* Top Enterprise Header Bar */}
        <header className="enterprise-header">
          <div className="ent-brand-section">
            <div className="ent-logo-icon">🏢</div>
            <div>
              <div className="ent-brand-title">
                <h1>EstateElite Enterprise</h1>
                <span className="ent-badge-suite">ENTERPRISE EDITION</span>
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
          <button
            type="button"
            className={`ent-nav-scroll-btn scroll-left ${hasOverflow && canScrollLeft ? "visible" : "hidden"}`}
            onClick={() => scrollNav("left")}
            disabled={!hasOverflow || !canScrollLeft}
            aria-label="Scroll navigation left"
            title="Scroll left"
          >
            ‹
          </button>
          <div
            className="nav-tabs-scrollable"
            ref={navTabsRef}
            onScroll={checkNavScroll}
          >
            {navigationItems.map((item) => (
              <button
                key={item.key}
                data-tab-key={item.key}
                type="button"
                className={`ent-tab-button ${activeTab === item.key ? "active" : ""}`}
                onClick={() => handleTabChange(item.key)}
              >
                <span className="tab-icon">{item.icon}</span>
                <span className="tab-label">{item.label}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            className={`ent-nav-scroll-btn scroll-right ${hasOverflow && canScrollRight ? "visible" : "hidden"}`}
            onClick={() => scrollNav("right")}
            disabled={!hasOverflow || !canScrollRight}
            aria-label="Scroll navigation right"
            title="Scroll right"
          >
            ›
          </button>
        </nav>

        {/* Active Enterprise Module Display */}
        <main className="enterprise-main-body">
          <div key={activeTab} className="enterprise-module-3d-wrapper">
            {activeTab === "crm" && <CRMModule />}
            {activeTab === "broker" && <BrokerModule />}
            {activeTab === "deals" && <DealsModule />}
            {activeTab === "finance" && <FinanceModule />}
            {activeTab === "marketing" && <MarketingModule />}
            {activeTab === "communications" && <CommunicationsModule />}
            {activeTab === "aimaps" && <AIMapsModule />}
            {activeTab === "executive" && <AnalyticsSecurityModule />}
            {activeTab === "governance" && <LegalGovernanceModule />}
          </div>
        </main>
      </div>
    </div>
  );
}
