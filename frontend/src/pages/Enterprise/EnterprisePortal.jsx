import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "crm";

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
    if (!u) {
      navigate("/", { replace: true });
    }
  }, [navigate]);

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
            <div className="ent-user-pill">
              <div className="user-initial">{(user?.name || "U").charAt(0).toUpperCase()}</div>
              <div className="user-info-text">
                <span className="user-name">{user?.name || "Enterprise User"}</span>
                <span className="user-role">
                  {isAdmin ? "Administrator" : user?.role === "agent" ? "Agent" : "Demo User"}
                </span>
              </div>
            </div>
          </div>
        </header>

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
