import { useState, useEffect, useCallback } from "react";
import api from "../../../api/axios";

const getActivityIcon = (type) => {
  switch (type) {
    case "Status_Change":
      return "🔄";
    case "Call":
      return "📞";
    case "Email":
      return "✉️";
    case "Meeting":
      return "🤝";
    case "Task":
      return "✅";
    case "Note":
      return "📝";
    default:
      return "📋";
  }
};

const formatActivityType = (type) => {
  if (!type) return "";
  return String(type).replace(/_/g, " ");
};

export default function CRMModule() {
  const [leads, setLeads] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Filters & View
  const [viewMode, setViewMode] = useState("kanban"); // 'kanban' | 'table'
  const [stageFilter, setStageFilter] = useState("all");
  const [search, setSearch] = useState("");

  // Create Lead Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newLead, setNewLead] = useState({
    name: "",
    email: "",
    phone: "",
    budget_min: "",
    budget_max: "",
    preferred_type: "Apartment",
    preferred_city: "Surat",
    timeline: "Immediate",
    source: "Website",
    priority: "Medium",
    notes: ""
  });

  // Selected Lead Drawer for Activities & Follow-ups
  const [selectedLead, setSelectedLead] = useState(null);
  const [activities, setActivities] = useState([]);
  const [followUps, setFollowUps] = useState([]);
  const [newActivity, setNewActivity] = useState({ activity_type: "Call", summary: "", details: "" });
  const [newFollowUp, setNewFollowUp] = useState({ scheduled_at: "", reminder_type: "Call", agenda: "" });

  const stages = ["New", "Contacted", "Qualified", "Proposal", "Negotiation", "Won", "Lost"];

  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const params = {};
      if (stageFilter !== "all") params.stage = stageFilter;
      if (search) params.search = search;
      const res = await api.get("/crm/leads", { params });
      if (res.data?.success) {
        setLeads(res.data.leads || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load CRM leads.");
    } finally {
      setLoading(false);
    }
  }, [stageFilter, search]);

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await api.get("/crm/leads/analytics");
      if (res.data?.success) {
        setAnalytics(res.data.summary);
      }
    } catch (err) {
      console.error("Failed to load CRM analytics:", err);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
    fetchAnalytics();
  }, [fetchLeads, fetchAnalytics]);

  const handleCreateLead = async (e) => {
    e.preventDefault();
    try {
      setError("");
      const payload = {
        ...newLead,
        budget_min: newLead.budget_min ? Number(newLead.budget_min) : null,
        budget_max: newLead.budget_max ? Number(newLead.budget_max) : null,
      };
      const res = await api.post("/crm/leads", payload);
      if (res.data?.success) {
        const displayScore = res.data.leadScore !== undefined ? res.data.leadScore : res.data.score;
        setSuccessMsg(`Lead #${res.data.leadId} created with Score: ${displayScore || 50}/100!`);
        setShowCreateModal(false);
        setNewLead({
          name: "",
          email: "",
          phone: "",
          budget_min: "",
          budget_max: "",
          preferred_type: "Apartment",
          preferred_city: "Surat",
          timeline: "Immediate",
          source: "Website",
          priority: "Medium",
          notes: ""
        });
        fetchLeads();
        fetchAnalytics();
        setTimeout(() => setSuccessMsg(""), 4000);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create lead.");
    }
  };

  const handleStageChange = async (leadId, newStage) => {
    try {
      const res = await api.put(`/crm/leads/${leadId}/status`, { status: newStage });
      if (res.data?.success) {
        setLeads((prev) =>
          prev.map((l) => (l.id === leadId ? { ...l, pipeline_stage: newStage } : l))
        );
        fetchAnalytics();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update lead stage.");
    }
  };

  const openLeadDrawer = async (lead) => {
    setSelectedLead(lead);
    try {
      const actRes = await api.get(`/crm/leads/${lead.id}/activities`);
      if (actRes.data?.success) setActivities(actRes.data.activities || []);
      const fupRes = await api.get(`/crm/leads/${lead.id}/follow-ups`);
      if (fupRes.data?.success) setFollowUps(fupRes.data.followUps || []);
    } catch (err) {
      console.error("Failed to load lead details:", err);
    }
  };

  const handleAddActivity = async (e) => {
    e.preventDefault();
    if (!selectedLead) return;
    try {
      const res = await api.post(`/crm/leads/${selectedLead.id}/activities`, newActivity);
      if (res.data?.success) {
        setActivities((prev) => [
          {
            id: res.data.activityId,
            ...newActivity,
            created_at: new Date().toISOString(),
            logged_by_name: "You"
          },
          ...prev
        ]);
        setNewActivity({ activity_type: "Call", summary: "", details: "" });
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to log activity.");
    }
  };

  const handleAddFollowUp = async (e) => {
    e.preventDefault();
    if (!selectedLead) return;
    try {
      const res = await api.post(`/crm/leads/${selectedLead.id}/follow-ups`, newFollowUp);
      if (res.data?.success) {
        setFollowUps((prev) => [
          {
            id: res.data.followUpId,
            ...newFollowUp,
            status: "Pending"
          },
          ...prev
        ]);
        setNewFollowUp({ scheduled_at: "", reminder_type: "Call", agenda: "" });
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to schedule follow-up.");
    }
  };

  return (
    <div className="enterprise-module-container">
      {/* Module Header & Analytics Bar */}
      <div className="module-header-row">
        <div>
          <h2>📋 CRM & Enterprise Lead Management</h2>
          <p className="subtitle">AI-assisted lead scoring, visual kanban pipeline, omni-channel activity logs & automated follow-ups.</p>
        </div>
        <div className="module-header-actions">
          <button type="button" className="btn-secondary" onClick={() => setViewMode(viewMode === "kanban" ? "table" : "kanban")}>
            {viewMode === "kanban" ? "📊 Table View" : "🗂️ Kanban View"}
          </button>
          <button type="button" className="btn-primary" onClick={() => setShowCreateModal(true)}>
            + Capture New Lead
          </button>
        </div>
      </div>

      {error && <div className="ent-alert ent-alert-danger">{error}</div>}
      {successMsg && <div className="ent-alert ent-alert-success">{successMsg}</div>}

      {/* Analytics KPI Row */}
      {analytics && (
        <div className="ent-kpi-grid">
          <div className="ent-kpi-card">
            <span className="ent-kpi-title">Total Active Leads</span>
            <span className="ent-kpi-val">{analytics.totalLeads}</span>
            <span className="ent-kpi-sub">Across all pipeline stages</span>
          </div>
          <div className="ent-kpi-card">
            <span className="ent-kpi-title">Conversion Rate</span>
            <span className="ent-kpi-val">{analytics.conversionRate}%</span>
            <span className="ent-kpi-sub">Won vs Total Captured</span>
          </div>
          <div className="ent-kpi-card">
            <span className="ent-kpi-title">Pipeline Value</span>
            <span className="ent-kpi-val">₹{Number(analytics.pipelineEstimatedValue || 0).toLocaleString("en-IN")}</span>
            <span className="ent-kpi-sub">Aggregated buyer budgets</span>
          </div>
          <div className="ent-kpi-card">
            <span className="ent-kpi-title">Pending Follow-ups</span>
            <span className="ent-kpi-val">{analytics.pendingFollowUps}</span>
            <span className="ent-kpi-sub">Scheduled reminders</span>
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="ent-toolbar">
        <div className="ent-search-box">
          <span>🔍</span>
          <input
            type="text"
            placeholder="Search leads by name, email, phone or city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="ent-filter-group">
          <label>Stage:</label>
          <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}>
            <option value="all">All Stages</option>
            {stages.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <button type="button" className="btn-refresh" onClick={fetchLeads}>↻</button>
      </div>

      {/* Main View: Kanban or Table */}
      {loading ? (
        <div className="ent-loading-state">Loading CRM Leads...</div>
      ) : viewMode === "kanban" ? (
        <div className="ent-kanban-board">
          {stages.map((stage) => {
            const stageLeads = leads.filter((l) => (l.pipeline_stage || "New") === stage);
            return (
              <div key={stage} className="ent-kanban-column">
                <div className="ent-kanban-header">
                  <span className="stage-name">{stage}</span>
                  <span className="stage-count">{stageLeads.length}</span>
                </div>
                <div className="ent-kanban-cards">
                  {stageLeads.map((lead) => (
                    <div key={lead.id} className="ent-lead-card" onClick={() => openLeadDrawer(lead)}>
                      <div className="card-top">
                        <strong>{lead.name}</strong>
                        <span className={`badge-score ${lead.lead_score >= 70 ? 'score-high' : lead.lead_score >= 40 ? 'score-med' : 'score-low'}`}>
                          ⚡ {lead.lead_score || 50}
                        </span>
                      </div>
                      <div className="card-info">
                        <span className="lead-pref">🏠 {lead.preferred_type || "Any"} • {lead.preferred_city || "All"}</span>
                        {lead.budget_max && (
                          <span className="lead-budget">💰 ₹{Number(lead.budget_max).toLocaleString("en-IN")}</span>
                        )}
                      </div>
                      <div className="card-footer">
                        <span className="lead-time">📅 {lead.timeline || "Flexible"}</span>
                        <select
                          className="stage-select-mini"
                          value={lead.pipeline_stage || "New"}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => handleStageChange(lead.id, e.target.value)}
                        >
                          {stages.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                  {stageLeads.length === 0 && (
                    <div className="ent-kanban-empty">No leads in {stage}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="ent-table-container">
          <table className="ent-table">
            <thead>
              <tr>
                <th>Lead ID</th>
                <th>Name & Contact</th>
                <th>Score</th>
                <th>Stage</th>
                <th>Budget Range</th>
                <th>Preference</th>
                <th>Source</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id}>
                  <td>#{l.id}</td>
                  <td>
                    <strong>{l.name}</strong>
                    <div className="sub-text">{l.phone} • {l.email}</div>
                  </td>
                  <td>
                    <span className={`badge-score ${l.lead_score >= 70 ? 'score-high' : l.lead_score >= 40 ? 'score-med' : 'score-low'}`}>
                      {l.lead_score || 50}/100
                    </span>
                  </td>
                  <td>
                    <select
                      className="stage-select"
                      value={l.pipeline_stage || "New"}
                      onChange={(e) => handleStageChange(l.id, e.target.value)}
                    >
                      {stages.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td>₹{Number(l.budget_min || 0).toLocaleString("en-IN")} - ₹{Number(l.budget_max || 0).toLocaleString("en-IN")}</td>
                  <td>{l.preferred_type} ({l.preferred_city})</td>
                  <td><span className="source-tag">{l.source}</span></td>
                  <td>
                    <button type="button" className="btn-sm" onClick={() => openLeadDrawer(l)}>
                      Activities & Follow-ups
                    </button>
                  </td>
                </tr>
              ))}
              {leads.length === 0 && (
                <tr>
                  <td colSpan="8" className="empty-row">No leads found matching current criteria.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Lead Details & Activities Drawer Modal */}
      {selectedLead && (
        <div className="ent-modal-backdrop" onClick={() => setSelectedLead(null)}>
          <div className="ent-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div>
                <h3>{selectedLead.name}</h3>
                <p className="drawer-sub">#{selectedLead.id} • {selectedLead.email} • {selectedLead.phone}</p>
              </div>
              <button type="button" className="drawer-close" onClick={() => setSelectedLead(null)}>✕</button>
            </div>

            <div className="drawer-body">
              {/* Lead Profile Stats */}
              <div className="drawer-stat-card">
                <div><strong>AI Lead Score:</strong> {selectedLead.lead_score}/100</div>
                <div><strong>Timeline:</strong> {selectedLead.timeline}</div>
                <div><strong>Source:</strong> {selectedLead.source}</div>
                <div><strong>Priority:</strong> {selectedLead.priority}</div>
              </div>

              {/* Log Activity Form */}
              <div className="drawer-section">
                <h4>➕ Log Interaction / Activity</h4>
                <form onSubmit={handleAddActivity} className="drawer-form">
                  <div className="form-row">
                    <select
                      value={newActivity.activity_type}
                      onChange={(e) => setNewActivity({ ...newActivity, activity_type: e.target.value })}
                    >
                      <option value="Call">📞 Call</option>
                      <option value="Email">✉️ Email</option>
                      <option value="Meeting">🤝 Meeting</option>
                      <option value="Site_Visit">🏠 Site Visit</option>
                      <option value="Note">📝 Note</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Summary (e.g., Discussed 3 BHK budget)"
                      value={newActivity.summary}
                      required
                      onChange={(e) => setNewActivity({ ...newActivity, summary: e.target.value })}
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Details / Conversation notes..."
                    value={newActivity.details}
                    onChange={(e) => setNewActivity({ ...newActivity, details: e.target.value })}
                  />
                  <button type="submit" className="btn-primary-sm">+ Log Activity</button>
                </form>
              </div>

              {/* Activities Timeline */}
              <div className="drawer-section">
                <h4>📜 Activity Timeline</h4>
                <div className="timeline-list">
                  {activities.map((act) => (
                    <div key={act.id} className="timeline-item">
                      <span className="timeline-badge" title={formatActivityType(act.activity_type)}>
                        {getActivityIcon(act.activity_type)}
                      </span>
                      <div className="timeline-content">
                        <div className="timeline-header-row">
                          <strong>{act.summary}</strong>
                          <span className="timeline-type-tag">{formatActivityType(act.activity_type)}</span>
                        </div>
                        {act.details && <p>{act.details}</p>}
                        <span className="timeline-meta">{new Date(act.created_at).toLocaleString("en-IN")}</span>
                      </div>
                    </div>
                  ))}
                  {activities.length === 0 && <p className="empty-sub">No activities logged yet.</p>}
                </div>
              </div>

              {/* Follow-up Reminders */}
              <div className="drawer-section">
                <h4>⏰ Schedule Follow-up Reminder</h4>
                <form onSubmit={handleAddFollowUp} className="drawer-form">
                  <div className="form-row">
                    <input
                      type="datetime-local"
                      value={newFollowUp.scheduled_at}
                      required
                      onChange={(e) => setNewFollowUp({ ...newFollowUp, scheduled_at: e.target.value })}
                    />
                    <select
                      value={newFollowUp.reminder_type}
                      onChange={(e) => setNewFollowUp({ ...newFollowUp, reminder_type: e.target.value })}
                    >
                      <option value="Call">Call</option>
                      <option value="Email">Email</option>
                      <option value="Meeting">Meeting</option>
                      <option value="Task">Task / Follow-up</option>
                    </select>
                  </div>
                  <input
                    type="text"
                    placeholder="Agenda / Purpose of reminder..."
                    value={newFollowUp.agenda}
                    required
                    onChange={(e) => setNewFollowUp({ ...newFollowUp, agenda: e.target.value })}
                  />
                  <button type="submit" className="btn-primary-sm">+ Schedule Reminder</button>
                </form>
                <div className="followup-list">
                  {followUps.map((fup) => (
                    <div key={fup.id} className="followup-item">
                      <span>🔔 {fup.reminder_type}: {fup.agenda}</span>
                      <span className="fup-time">{new Date(fup.scheduled_at).toLocaleString("en-IN")}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Capture Lead Modal */}
      {showCreateModal && (
        <div className="ent-modal-backdrop" onClick={() => setShowCreateModal(false)}>
          <div className="ent-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📋 Capture Enterprise Lead</h3>
              <button type="button" className="drawer-close" onClick={() => setShowCreateModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateLead} className="modal-body-form">
              <div className="form-grid-2">
                <div>
                  <label>Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newLead.name}
                    onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
                    placeholder="e.g. Ramesh Shah"
                  />
                </div>
                <div>
                  <label>Email Address *</label>
                  <input
                    type="email"
                    required
                    value={newLead.email}
                    onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                    placeholder="e.g. ramesh@example.com"
                  />
                </div>
                <div>
                  <label>Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={newLead.phone}
                    onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                  />
                </div>
                <div>
                  <label>Lead Source</label>
                  <select
                    value={newLead.source}
                    onChange={(e) => setNewLead({ ...newLead, source: e.target.value })}
                  >
                    <option value="Website">Website Form</option>
                    <option value="Referral">Direct Referral</option>
                    <option value="WalkIn">Walk-In Client</option>
                    <option value="Campaign">Marketing Campaign</option>
                    <option value="Agent">Agent Sourced</option>
                  </select>
                </div>
                <div>
                  <label>Budget Min (₹)</label>
                  <input
                    type="number"
                    value={newLead.budget_min}
                    onChange={(e) => setNewLead({ ...newLead, budget_min: e.target.value })}
                    placeholder="5000000"
                  />
                </div>
                <div>
                  <label>Budget Max (₹)</label>
                  <input
                    type="number"
                    value={newLead.budget_max}
                    onChange={(e) => setNewLead({ ...newLead, budget_max: e.target.value })}
                    placeholder="10000000"
                  />
                </div>
                <div>
                  <label>Property Type</label>
                  <select
                    value={newLead.preferred_type}
                    onChange={(e) => setNewLead({ ...newLead, preferred_type: e.target.value })}
                  >
                    <option value="Apartment">Apartment</option>
                    <option value="Villa">Villa / Bungalow</option>
                    <option value="Commercial">Commercial / Office</option>
                    <option value="Plot">Land / Plot</option>
                  </select>
                </div>
                <div>
                  <label>Preferred City</label>
                  <input
                    type="text"
                    value={newLead.preferred_city}
                    onChange={(e) => setNewLead({ ...newLead, preferred_city: e.target.value })}
                    placeholder="Surat, Mumbai, etc."
                  />
                </div>
                <div>
                  <label>Purchase Timeline</label>
                  <select
                    value={newLead.timeline}
                    onChange={(e) => setNewLead({ ...newLead, timeline: e.target.value })}
                  >
                    <option value="Immediate">Immediate (Within 30 Days)</option>
                    <option value="1_to_3_months">1 - 3 Months</option>
                    <option value="3_to_6_months">3 - 6 Months</option>
                    <option value="Exploring">Just Exploring</option>
                  </select>
                </div>
                <div>
                  <label>Priority</label>
                  <select
                    value={newLead.priority}
                    onChange={(e) => setNewLead({ ...newLead, priority: e.target.value })}
                  >
                    <option value="High">High Priority</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>
              <div>
                <label>Buyer Requirements / Notes</label>
                <textarea
                  rows="3"
                  value={newLead.notes}
                  onChange={(e) => setNewLead({ ...newLead, notes: e.target.value })}
                  placeholder="Specify preferences: high floor, park view, 2 parking slots, etc."
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Create Lead & Score</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
