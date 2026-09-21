import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../../../api/axios";

export default function AnalyticsSecurityModule() {
  const [searchParams, setSearchParams] = useSearchParams();
  const subParam = searchParams.get("sub");
  const [activeTab, setActiveTab] = useState(subParam || "bi"); // 'bi' | 'rbac' | 'audit'

  useEffect(() => {
    const sub = searchParams.get("sub");
    if (sub && sub !== activeTab) {
      setActiveTab(sub);
    }
  }, [searchParams, activeTab]);

  const handleTabChange = (key) => {
    setActiveTab(key);
    const newParams = new URLSearchParams(searchParams);
    newParams.set("tab", "executive");
    newParams.set("sub", key);
    setSearchParams(newParams);
  };
  const [executiveBI, setExecutiveBI] = useState(null);
  const [roles, setRoles] = useState([]);
  const [branches, setBranches] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchAnalyticsAndSecurity = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [biRes, rbacRes, logsRes] = await Promise.allSettled([
        api.get("/analytics/executive"),
        api.get("/security/roles"),
        api.get("/security/audit-logs")
      ]);

      if (biRes.status === "fulfilled" && biRes.value.data?.success) {
        setExecutiveBI(biRes.value.data);
      }
      if (rbacRes.status === "fulfilled" && rbacRes.value.data?.success) {
        setRoles(rbacRes.value.data.roles || []);
        setBranches(rbacRes.value.data.branches || []);
      }
      if (logsRes.status === "fulfilled" && logsRes.value.data?.success) {
        setAuditLogs(logsRes.value.data.logs || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load executive analytics & security.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalyticsAndSecurity();
  }, [fetchAnalyticsAndSecurity]);

  return (
    <div className="enterprise-module-container">
      <div className="module-header-row">
        <div>
          <h2>📊 Executive BI & Enterprise Security Governance</h2>
          <p className="subtitle">C-Suite portfolio metrics, quarterly projections, granular Role-Based Access Control & immutable security audit trail.</p>
        </div>
      </div>

      {error && <div className="ent-alert ent-alert-danger">{error}</div>}

      <div className="ent-subtabs">
        <button
          type="button"
          className={`ent-subtab ${activeTab === "bi" ? "active" : ""}`}
          onClick={() => handleTabChange("bi")}
        >
          📈 C-Suite Executive BI Dashboard
        </button>
        <button
          type="button"
          className={`ent-subtab ${activeTab === "rbac" ? "active" : ""}`}
          onClick={() => handleTabChange("rbac")}
        >
          🛡️ Roles, Permissions & Branches ({roles.length})
        </button>
        <button
          type="button"
          className={`ent-subtab ${activeTab === "audit" ? "active" : ""}`}
          onClick={() => handleTabChange("audit")}
        >
          🔒 Security Audit Trail ({auditLogs.length})
        </button>
      </div>

      {loading ? (
        <div className="ent-loading-state">Loading Executive & Governance Records...</div>
      ) : (
        <>
          {/* TAB 1: EXECUTIVE BI DASHBOARD */}
          {activeTab === "bi" && executiveBI && (
            <div className="tab-content-area">
              <div className="ent-kpi-grid">
                <div className="ent-kpi-card">
                  <span className="ent-kpi-title">Total Portfolio Valuation</span>
                  <span className="ent-kpi-val" style={{ color: "#b89047" }}>
                    ₹{Number(executiveBI.metrics?.portfolioValue || 0).toLocaleString("en-IN")}
                  </span>
                  <span className="ent-kpi-sub">Across {executiveBI.metrics?.totalProperties || 0} assets</span>
                </div>
                <div className="ent-kpi-card">
                  <span className="ent-kpi-title">Active Deal Pipeline</span>
                  <span className="ent-kpi-val">
                    ₹{Number(executiveBI.metrics?.activeDealVolume || 0).toLocaleString("en-IN")}
                  </span>
                  <span className="ent-kpi-sub">{executiveBI.metrics?.openDealsCount || 0} deals currently in escrow/negotiation</span>
                </div>
                <div className="ent-kpi-card">
                  <span className="ent-kpi-title">Average Days on Market</span>
                  <span className="ent-kpi-val">{executiveBI.metrics?.avgDaysOnMarket || 28} Days</span>
                  <span className="ent-kpi-sub">Listing velocity benchmark</span>
                </div>
                <div className="ent-kpi-card">
                  <span className="ent-kpi-title">Projected Q4 Commission</span>
                  <span className="ent-kpi-val" style={{ color: "#10b981" }}>
                    ₹{Number(executiveBI.projections?.projectedQuarterlyRevenue || 0).toLocaleString("en-IN")}
                  </span>
                  <span className="ent-kpi-sub">Based on current pipeline run-rate</span>
                </div>
              </div>

              {/* City Breakdown Grid */}
              <div className="ent-card" style={{ marginTop: "1.5rem" }}>
                <h3>🏙️ Geographic Asset & Capital Distribution</h3>
                <div className="city-dist-grid" style={{ marginTop: "1rem" }}>
                  {(executiveBI.cityBreakdown || []).map((c) => (
                    <div key={c.city} className="city-dist-card">
                      <div className="city-name">📍 {c.city}</div>
                      <div className="city-val">₹{Number(c.totalValue).toLocaleString("en-IN")}</div>
                      <span className="sub-text">{c.propertyCount} Properties listed</span>
                    </div>
                  ))}
                  {(executiveBI.cityBreakdown || []).length === 0 && (
                    <div className="empty-sub">No geographic data recorded.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: RBAC PERMISSION MATRIX & BRANCHES */}
          {activeTab === "rbac" && (
            <div className="tab-content-area">
              <div className="ent-card">
                <h3>🏢 Enterprise Multi-Branch Hierarchy</h3>
                <div className="branch-grid" style={{ marginTop: "1rem" }}>
                  {branches.map((b) => (
                    <div key={b.id} className="branch-card">
                      <strong>{b.name}</strong>
                      <p className="sub-text">{b.city}, {b.state}</p>
                      <div className="branch-code">Branch Code: <code>{b.code}</code></div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="ent-card" style={{ marginTop: "1.5rem" }}>
                <h3>🛡️ Enterprise Role & Privilege Matrix</h3>
                <div className="ent-table-container" style={{ marginTop: "1rem" }}>
                  <table className="ent-table">
                    <thead>
                      <tr>
                        <th>Role Name</th>
                        <th>Hierarchy Level</th>
                        <th>Assigned Capabilities & Permissions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {roles.map((r) => (
                        <tr key={r.id}>
                          <td><strong>{r.name}</strong></td>
                          <td><span className="badge-pill">Tier {r.level || 1}</span></td>
                          <td>
                            <div className="permissions-tags">
                              {(r.permissions || ["view_properties", "manage_deals"]).map((p) => (
                                <span key={p} className="perm-tag">✓ {p}</span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: IMMUTABLE AUDIT TRAIL */}
          {activeTab === "audit" && (
            <div className="tab-content-area">
              <div className="ent-table-container">
                <table className="ent-table">
                  <thead>
                    <tr>
                      <th>Event ID</th>
                      <th>User / Actor</th>
                      <th>Action</th>
                      <th>Target Entity</th>
                      <th>IP Address</th>
                      <th>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log.id}>
                        <td><code>#{log.id}</code></td>
                        <td><strong>{log.user_name || "System"}</strong> ({log.user_role || "Admin"})</td>
                        <td><span className="badge-pill">{log.action}</span></td>
                        <td>{log.entity_type} #{log.entity_id}</td>
                        <td><code>{log.ip_address || "127.0.0.1"}</code></td>
                        <td>{new Date(log.created_at).toLocaleString("en-IN")}</td>
                      </tr>
                    ))}
                    {auditLogs.length === 0 && (
                      <tr>
                        <td colSpan="6" className="empty-row">No security audit logs recorded.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
