import { useState, useEffect, useCallback } from "react";
import api from "../../../api/axios";

export default function BrokerModule() {
  const [agents, setAgents] = useState([]);
  const [selectedAgentId, setSelectedAgentId] = useState(1);
  const [performance, setPerformance] = useState(null);
  const [commissions, setCommissions] = useState([]);
  const [quotas, setQuotas] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [territories, setTerritories] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Sub-tabs in Broker Module
  const [brokerTab, setBrokerTab] = useState("overview"); // 'overview' | 'commissions' | 'quotas' | 'leaderboard' | 'territories' | 'payouts'

  // New Commission Payout update
  const [processingCommissionId, setProcessingCommissionId] = useState(null);

  // Agent Payout Modal
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [newPayout, setNewPayout] = useState({
    agent_id: "",
    amount: "",
    payment_method: "Bank Transfer",
    transaction_ref: "",
    notes: "",
    payout_date: new Date().toISOString().split("T")[0]
  });

  const fetchAgentsList = useCallback(async () => {
    try {
      const res = await api.get("/agents");
      if (res.data?.success) {
        const list = res.data.agents || [];
        setAgents(list);
        if (list.length > 0 && !selectedAgentId) {
          setSelectedAgentId(list[0].id);
        }
      }
    } catch {
      // Fallback
    }
  }, [selectedAgentId]);

  const fetchBrokerData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [perfRes, commRes, quotaRes, leadRes, terrRes, payRes] = await Promise.allSettled([
        api.get(`/broker/performance?agentId=${selectedAgentId}`),
        api.get(`/broker/commissions?agentId=${selectedAgentId}`),
        api.get("/broker/quotas"),
        api.get("/broker/leaderboard"),
        api.get("/broker/territories"),
        api.get("/broker/payouts"),
      ]);

      if (perfRes.status === "fulfilled" && perfRes.value.data?.success) {
        setPerformance(perfRes.value.data.performance);
      }
      if (commRes.status === "fulfilled" && commRes.value.data?.success) {
        setCommissions(commRes.value.data.commissions || []);
      }
      if (quotaRes.status === "fulfilled" && quotaRes.value.data?.success) {
        setQuotas(quotaRes.value.data.quotas || []);
      }
      if (leadRes.status === "fulfilled" && leadRes.value.data?.success) {
        setLeaderboard(leadRes.value.data.leaderboard || []);
      }
      if (terrRes.status === "fulfilled" && terrRes.value.data?.success) {
        setTerritories(terrRes.value.data.territories || []);
      }
      if (payRes.status === "fulfilled" && payRes.value.data?.success) {
        setPayouts(payRes.value.data.payouts || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load broker data.");
    } finally {
      setLoading(false);
    }
  }, [selectedAgentId]);

  useEffect(() => {
    fetchAgentsList();
  }, [fetchAgentsList]);

  useEffect(() => {
    fetchBrokerData();
  }, [fetchBrokerData]);

  const handleUpdateCommissionStatus = async (commissionId, status) => {
    try {
      setProcessingCommissionId(commissionId);
      const res = await api.put(`/broker/commissions/${commissionId}/status`, { status });
      if (res.data?.success) {
        setCommissions((prev) =>
          prev.map((c) => (c.id === commissionId ? { ...c, status } : c))
        );
        setSuccessMsg(`Commission #${commissionId} marked as ${status}`);
        setTimeout(() => setSuccessMsg(""), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update commission status.");
    } finally {
      setProcessingCommissionId(null);
    }
  };

  const handleRecordPayout = async (e) => {
    e.preventDefault();
    try {
      const amt = Number(newPayout.amount);
      if (amt <= 0) {
        setError("Payout amount must be greater than zero.");
        return;
      }
      const targetAgentId = newPayout.agent_id || selectedAgentId;
      if (!targetAgentId) {
        setError("Please select an agent to receive the payout.");
        return;
      }
      const payload = {
        agent_id: Number(targetAgentId),
        amount: amt,
        payment_method: newPayout.payment_method,
        transaction_ref: newPayout.transaction_ref || `PAY-${Date.now()}`,
        payout_date: newPayout.payout_date || new Date().toISOString().split("T")[0],
        notes: newPayout.notes
      };
      const res = await api.post("/broker/payouts", payload);
      if (res.data?.success) {
        setSuccessMsg(`Payout of ₹${amt.toLocaleString("en-IN")} disbursed successfully! (Ref: ${res.data.transactionRef})`);
        setShowPayoutModal(false);
        setNewPayout({
          agent_id: selectedAgentId || "",
          amount: "",
          payment_method: "Bank Transfer",
          transaction_ref: "",
          notes: "",
          payout_date: new Date().toISOString().split("T")[0]
        });
        fetchBrokerData();
        setTimeout(() => setSuccessMsg(""), 3500);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to record agent payout.");
    }
  };

  return (
    <div className="enterprise-module-container">
      <div className="module-header-row">
        <div>
          <h2>👔 Broker & Agent Performance Hub</h2>
          <p className="subtitle">Individual KPIs, multi-agent leaderboard, commission splits, quota fulfillment & territory assignments.</p>
        </div>
        <div className="module-header-actions">
          <button type="button" className="btn-primary" onClick={() => setShowPayoutModal(true)}>
            + Disburse Agent Payout
          </button>
          <label className="agent-select-label">Agent Focus:</label>
          <select
            className="agent-select-dropdown"
            value={selectedAgentId}
            onChange={(e) => setSelectedAgentId(Number(e.target.value))}
          >
            {agents.map((ag) => (
              <option key={ag.id} value={ag.id}>{ag.name} ({ag.email})</option>
            ))}
            {agents.length === 0 && <option value={1}>Administrator / Lead Broker</option>}
          </select>
        </div>
      </div>

      {error && <div className="ent-alert ent-alert-danger">{error}</div>}
      {successMsg && <div className="ent-alert ent-alert-success">{successMsg}</div>}

      {/* Sub-nav tabs */}
      <div className="ent-subtabs">
        <button
          type="button"
          className={`ent-subtab ${brokerTab === "overview" ? "active" : ""}`}
          onClick={() => setBrokerTab("overview")}
        >
          📊 KPIs & Performance
        </button>
        <button
          type="button"
          className={`ent-subtab ${brokerTab === "commissions" ? "active" : ""}`}
          onClick={() => setBrokerTab("commissions")}
        >
          💰 Commission Ledger ({commissions.length})
        </button>
        <button
          type="button"
          className={`ent-subtab ${brokerTab === "payouts" ? "active" : ""}`}
          onClick={() => setBrokerTab("payouts")}
        >
          💳 Agent Payouts ({payouts.length})
        </button>
        <button
          type="button"
          className={`ent-subtab ${brokerTab === "quotas" ? "active" : ""}`}
          onClick={() => setBrokerTab("quotas")}
        >
          🎯 Sales Quotas
        </button>
        <button
          type="button"
          className={`ent-subtab ${brokerTab === "leaderboard" ? "active" : ""}`}
          onClick={() => setBrokerTab("leaderboard")}
        >
          🏆 Live Leaderboard
        </button>
        <button
          type="button"
          className={`ent-subtab ${brokerTab === "territories" ? "active" : ""}`}
          onClick={() => setBrokerTab("territories")}
        >
          🗺️ Territories ({territories.length})
        </button>
      </div>

      {loading ? (
        <div className="ent-loading-state">Loading Agent & Broker Performance Data...</div>
      ) : (
        <>
          {/* TAB 1: OVERVIEW & PERFORMANCE */}
          {brokerTab === "overview" && performance && (
            <div className="tab-content-area">
              <div className="ent-kpi-grid">
                <div className="ent-kpi-card">
                  <span className="ent-kpi-title">Active Property Listings</span>
                  <span className="ent-kpi-val">{performance.activeListings || 0}</span>
                  <span className="ent-kpi-sub">Currently under management</span>
                </div>
                <div className="ent-kpi-card">
                  <span className="ent-kpi-title">Closed Deals (YTD)</span>
                  <span className="ent-kpi-val">{performance.dealsClosed || 0}</span>
                  <span className="ent-kpi-sub">Finalized sales transactions</span>
                </div>
                <div className="ent-kpi-card">
                  <span className="ent-kpi-title">Total Sales Volume</span>
                  <span className="ent-kpi-val">₹{Number(performance.totalSalesVolume || 0).toLocaleString("en-IN")}</span>
                  <span className="ent-kpi-sub">Gross closed transaction value</span>
                </div>
                <div className="ent-kpi-card">
                  <span className="ent-kpi-title">Net Commission Earned</span>
                  <span className="ent-kpi-val">₹{Number(performance.totalCommissionEarned || 0).toLocaleString("en-IN")}</span>
                  <span className="ent-kpi-sub">Approved / Paid agent earnings</span>
                </div>
              </div>

              <div className="ent-card" style={{ marginTop: "1.5rem" }}>
                <h3>📈 Closure Velocity & Lead Metrics</h3>
                <div className="velocity-grid">
                  <div className="velocity-metric">
                    <strong>{performance.assignedLeads || 0}</strong>
                    <span>Total Leads Assigned</span>
                  </div>
                  <div className="velocity-metric">
                    <strong>{performance.avgDaysToClose || 32} Days</strong>
                    <span>Average Days to Close Deal</span>
                  </div>
                  <div className="velocity-metric">
                    <strong>{performance.leadConversionRate || "18.5%"}</strong>
                    <span>Lead-to-Close Conversion</span>
                  </div>
                  <div className="velocity-metric">
                    <strong>4.9 / 5.0 ⭐</strong>
                    <span>Client Satisfaction Score</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: COMMISSIONS */}
          {brokerTab === "commissions" && (
            <div className="tab-content-area">
              <div className="ent-table-container">
                <table className="ent-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Deal Title / Property</th>
                      <th>Gross Deal Value</th>
                      <th>Split %</th>
                      <th>Net Commission</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {commissions.map((comm) => (
                      <tr key={comm.id}>
                        <td>#{comm.id}</td>
                        <td>
                          <strong>{comm.deal_title || `Deal #${comm.deal_id}`}</strong>
                          <div className="sub-text">{comm.property_title || "Standard Property Sale"}</div>
                        </td>
                        <td>₹{Number(comm.deal_amount || 0).toLocaleString("en-IN")}</td>
                        <td><span className="badge-pill">{comm.split_percentage}%</span></td>
                        <td><strong style={{ color: "#10b981" }}>₹{Number(comm.commission_amount || 0).toLocaleString("en-IN")}</strong></td>
                        <td>
                          <span className={`badge-status status-${(comm.status || 'Pending').toLowerCase()}`}>
                            {comm.status}
                          </span>
                        </td>
                        <td>
                          {comm.status !== "Paid" && (
                            <div className="action-button-group">
                              {comm.status === "Pending" && (
                                <button
                                  type="button"
                                  className="btn-sm btn-outline-success"
                                  disabled={processingCommissionId === comm.id}
                                  onClick={() => handleUpdateCommissionStatus(comm.id, "Approved")}
                                >
                                  Approve
                                </button>
                              )}
                              <button
                                type="button"
                                className="btn-sm btn-primary-sm"
                                disabled={processingCommissionId === comm.id}
                                onClick={() => handleUpdateCommissionStatus(comm.id, "Paid")}
                              >
                                Mark Paid
                              </button>
                            </div>
                          )}
                          {comm.status === "Paid" && <span className="text-muted">Settled ✔</span>}
                        </td>
                      </tr>
                    ))}
                    {commissions.length === 0 && (
                      <tr>
                        <td colSpan="7" className="empty-row">No commission ledger records found for this agent.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: QUOTAS */}
          {brokerTab === "quotas" && (
            <div className="tab-content-area">
              <div className="quota-card-grid">
                {quotas.map((q) => {
                  const target = Number(q.target_amount || 1);
                  const achieved = Number(q.achieved_amount || 0);
                  const pct = Math.min(Math.round((achieved / target) * 100), 100);
                  return (
                    <div key={q.id} className="quota-card">
                      <div className="quota-header">
                        <strong>{q.agent_name || `Agent #${q.agent_id}`}</strong>
                        <span className="badge-pill">{q.quota_period || "Monthly"}</span>
                      </div>
                      <div className="quota-amounts">
                        <div>
                          <span>Achieved:</span>
                          <strong>₹{achieved.toLocaleString("en-IN")}</strong>
                        </div>
                        <div>
                          <span>Target:</span>
                          <span>₹{target.toLocaleString("en-IN")}</span>
                        </div>
                      </div>
                      <div className="progress-bar-container">
                        <div className="progress-bar-fill" style={{ width: `${pct}%`, background: pct >= 100 ? "#10b981" : "#3b82f6" }} />
                      </div>
                      <div className="quota-footer">
                        <span>{pct}% Fulfilled</span>
                        <span>{pct >= 100 ? "🎉 Target Exceeded!" : `₹${(target - achieved).toLocaleString("en-IN")} remaining`}</span>
                      </div>
                    </div>
                  );
                })}
                {quotas.length === 0 && <div className="empty-state-box">No active quotas assigned.</div>}
              </div>
            </div>
          )}

          {/* TAB 4: LEADERBOARD */}
          {brokerTab === "leaderboard" && (
            <div className="tab-content-area">
              <div className="leaderboard-container">
                {leaderboard.map((item, idx) => (
                  <div key={item.agent_id || idx} className={`leaderboard-item rank-${idx + 1}`}>
                    <div className="rank-badge">
                      {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}
                    </div>
                    <div className="agent-details">
                      <strong>{item.agent_name}</strong>
                      <span className="sub-text">{item.role || "Senior Sales Consultant"}</span>
                    </div>
                    <div className="deals-badge">
                      <span>{item.deals_closed || 0} Deals</span>
                    </div>
                    <div className="volume-badge">
                      <strong>₹{Number(item.total_volume || 0).toLocaleString("en-IN")}</strong>
                      <span className="sub-text">Total Volume</span>
                    </div>
                  </div>
                ))}
                {leaderboard.length === 0 && <div className="empty-state-box">No leaderboard rankings available yet.</div>}
              </div>
            </div>
          )}

          {/* TAB 5: TERRITORIES */}
          {brokerTab === "territories" && (
            <div className="tab-content-area">
              <div className="territory-grid">
                {territories.map((terr) => (
                  <div key={terr.id} className="territory-card">
                    <h4>📍 {terr.zone_name || terr.territory_name || "Regional Zone"}</h4>
                    <p className="sub-text">{terr.city} • {terr.is_exclusive ? "Exclusive Zone" : "Shared Market"}</p>
                    <div className="assigned-agent-info">
                      <span>Assigned Agent:</span>
                      <strong>{terr.agent_name || terr.assigned_agent_name || terr.agency_name || "Lead Broker"}</strong>
                    </div>
                  </div>
                ))}
                {territories.length === 0 && (
                  <div className="empty-state-box">No geographical territories allocated yet.</div>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: AGENT PAYOUTS */}
          {brokerTab === "payouts" && (
            <div className="tab-content-area">
              <div className="ent-table-container">
                <table className="ent-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Agent Name</th>
                      <th>Disbursed Amount</th>
                      <th>Payment Method</th>
                      <th>Transaction Ref</th>
                      <th>Payout Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payouts.map((p) => (
                      <tr key={p.id}>
                        <td>#{p.id}</td>
                        <td>
                          <strong>{p.agent_name || `Agent #${p.agent_id}`}</strong>
                          <div className="sub-text">{p.agency_name || p.agent_email || "Estate Elite Agent"}</div>
                        </td>
                        <td>
                          <strong style={{ color: "#10b981" }}>
                            ₹{Number(p.amount || 0).toLocaleString("en-IN")}
                          </strong>
                        </td>
                        <td>
                          <span className="badge-pill">{p.payment_method || "Bank Transfer"}</span>
                        </td>
                        <td><code>{p.transaction_ref || "-"}</code></td>
                        <td>{new Date(p.payout_date).toLocaleDateString("en-IN")}</td>
                        <td>
                          <span className="badge-status status-active">
                            {p.status || "Processed"}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {payouts.length === 0 && (
                      <tr>
                        <td colSpan="7" className="empty-row">
                          No agent payout disbursements recorded yet. Click "+ Disburse Agent Payout" to issue funds.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal: Disburse Agent Payout */}
      {showPayoutModal && (
        <div className="ent-modal-backdrop" onClick={() => setShowPayoutModal(false)}>
          <div className="ent-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>💳 Disburse Agent Commission Payout</h3>
              <button type="button" className="drawer-close" onClick={() => setShowPayoutModal(false)}>✕</button>
            </div>
            <form onSubmit={handleRecordPayout} className="modal-body-form">
              <div className="form-grid-2">
                <div>
                  <label>Recipient Agent *</label>
                  <select
                    required
                    value={newPayout.agent_id || selectedAgentId}
                    onChange={(e) => setNewPayout({ ...newPayout, agent_id: Number(e.target.value) })}
                  >
                    <option value="">-- Select Agent --</option>
                    {agents.map((ag) => (
                      <option key={ag.id} value={ag.id}>
                        {ag.name} ({ag.email})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label>Disbursement Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newPayout.amount}
                    onChange={(e) => setNewPayout({ ...newPayout, amount: e.target.value })}
                    placeholder="e.g. 75000"
                  />
                </div>
                <div>
                  <label>Payment Method *</label>
                  <select
                    value={newPayout.payment_method}
                    onChange={(e) => setNewPayout({ ...newPayout, payment_method: e.target.value })}
                  >
                    <option value="Bank Transfer">NEFT / RTGS Bank Transfer</option>
                    <option value="UPI">UPI Direct</option>
                    <option value="Cheque">Corporate Cheque</option>
                  </select>
                </div>
                <div>
                  <label>Payout Date *</label>
                  <input
                    type="date"
                    required
                    value={newPayout.payout_date}
                    onChange={(e) => setNewPayout({ ...newPayout, payout_date: e.target.value })}
                  />
                </div>
                <div>
                  <label>Transaction Reference #</label>
                  <input
                    type="text"
                    value={newPayout.transaction_ref}
                    onChange={(e) => setNewPayout({ ...newPayout, transaction_ref: e.target.value })}
                    placeholder="Bank UTR or Cheque Number"
                  />
                </div>
                <div>
                  <label>Internal Audit Memo</label>
                  <input
                    type="text"
                    value={newPayout.notes}
                    onChange={(e) => setNewPayout({ ...newPayout, notes: e.target.value })}
                    placeholder="Commission settlement for Deal #..."
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowPayoutModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Disburse Payout</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
