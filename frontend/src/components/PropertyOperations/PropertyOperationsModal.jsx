import { useState, useEffect, useCallback } from "react";
import api from "../../api/axios";
import "./PropertyOperations.css";

function PropertyOperationsModal({ isOpen, property, onClose, onPropertyUpdated }) {
  const [activeTab, setActiveTab] = useState("verification");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Tab 1: Verification State
  const [verification, setVerification] = useState(null);
  const [verificationHistory, setVerificationHistory] = useState([]);
  const [newStatus, setNewStatus] = useState("Pending");
  const [verifNotes, setVerifNotes] = useState("");

  // Tab 2: Checklist State
  const [checklist, setChecklist] = useState([]);
  const [checklistMeta, setChecklistMeta] = useState({ totalItems: 0, completedItems: 0, progressPercentage: 0 });

  // Tab 3: Inspections State
  const [inspections, setInspections] = useState([]);
  const [inspectorName, setInspectorName] = useState("");
  const [inspectionType, setInspectionType] = useState("Routine");
  const [scheduledDate, setScheduledDate] = useState("");
  const [conditionRating, setConditionRating] = useState("Good");
  const [inspectionFindings, setInspectionFindings] = useState("");
  const [showInspectionForm, setShowInspectionForm] = useState(false);

  // Tab 4: Maintenance State
  const [maintenance, setMaintenance] = useState([]);
  const [maintTitle, setMaintTitle] = useState("");
  const [maintCategory, setMaintCategory] = useState("General");
  const [maintPriority, setMaintPriority] = useState("Medium");
  const [maintCost, setMaintCost] = useState("");
  const [maintAssigned, setMaintAssigned] = useState("");
  const [maintDesc, setMaintDesc] = useState("");
  const [showMaintForm, setShowMaintForm] = useState(false);

  // Tab 5: Lifecycle State
  const [currentState, setCurrentState] = useState(property?.status || "Available");
  const [lifecycleHistory, setLifecycleHistory] = useState([]);
  const [toState, setToState] = useState("Available");
  const [allowedTransitions, setAllowedTransitions] = useState([]);
  const [stateNotes, setStateNotes] = useState("");

  // Tab 6: Audit Logs State
  const [auditLogs, setAuditLogs] = useState([]);

  const propertyId = property?.id;

  // Fetch data per tab
  const fetchTabData = useCallback(async () => {
    if (!propertyId || !isOpen) return;
    setLoading(true);
    setError("");

    try {
      if (activeTab === "verification") {
        const res = await api.get(`/properties/${propertyId}/verification`);
        if (res.data?.success) {
          setVerification(res.data.verification);
          setVerificationHistory(res.data.history || []);
          setNewStatus(res.data.verification?.status || "Pending");
          setVerifNotes(res.data.verification?.notes || "");
        }
      } else if (activeTab === "checklist") {
        const res = await api.get(`/properties/${propertyId}/checklist`);
        if (res.data?.success) {
          setChecklist(res.data.items || []);
          setChecklistMeta({
            totalItems: res.data.totalItems,
            completedItems: res.data.completedItems,
            progressPercentage: res.data.progressPercentage,
          });
        }
      } else if (activeTab === "inspections") {
        const res = await api.get(`/properties/${propertyId}/inspections`);
        if (res.data?.success) {
          setInspections(res.data.inspections || []);
        }
      } else if (activeTab === "maintenance") {
        const res = await api.get(`/properties/${propertyId}/maintenance`);
        if (res.data?.success) {
          setMaintenance(res.data.maintenance || []);
        }
      } else if (activeTab === "lifecycle") {
        const res = await api.get(`/properties/${propertyId}/lifecycle`);
        if (res.data?.success) {
          setCurrentState(res.data.currentState);
          setLifecycleHistory(res.data.transitions || []);
          const allowed = res.data.allowedTransitions || [];
          setAllowedTransitions(allowed);
          if (allowed.length > 0) {
            setToState(allowed[0]);
          }
        }
      } else if (activeTab === "audit") {
        const res = await api.get(`/properties/${propertyId}/audit-logs`);
        if (res.data?.success) {
          setAuditLogs(res.data.logs || []);
        }
      }
    } catch (err) {
      console.error("Operations Hub Fetch Error:", err);
      if (err.response?.status === 403) {
        setError("Access Restricted: Only Administrators and assigned Listing Agent can access operations.");
      } else {
        setError(err.response?.data?.message || "Failed to load operational data.");
      }
    } finally {
      setLoading(false);
    }
  }, [propertyId, isOpen, activeTab]);

  useEffect(() => {
    fetchTabData();
  }, [fetchTabData]);

  // Handlers
  const handleUpdateVerification = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");
      const res = await api.put(`/properties/${propertyId}/verification`, {
        status: newStatus,
        notes: verifNotes,
      });
      if (res.data?.success) {
        setSuccessMsg(res.data.message || "Verification status updated.");
        setVerification(res.data.verification);
        setVerificationHistory(res.data.history || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update verification.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleChecklist = async (itemKey, currentStatus) => {
    try {
      setError("");
      const res = await api.put(`/properties/${propertyId}/checklist/${itemKey}`, {
        is_completed: !currentStatus,
      });
      if (res.data?.success) {
        setChecklist(res.data.items || []);
        setChecklistMeta({
          totalItems: res.data.totalItems,
          completedItems: res.data.completedItems,
          progressPercentage: res.data.progressPercentage,
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to toggle checklist item.");
    }
  };

  const handleScheduleInspection = async (e) => {
    e.preventDefault();
    if (!inspectorName || !scheduledDate) {
      setError("Please specify inspector name and scheduled date.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const res = await api.post(`/properties/${propertyId}/inspections`, {
        inspector_name: inspectorName,
        inspection_type: inspectionType,
        scheduled_date: scheduledDate,
        condition_rating: conditionRating,
        findings: inspectionFindings,
      });
      if (res.data?.success) {
        setSuccessMsg("Inspection scheduled.");
        setShowInspectionForm(false);
        setInspectorName("");
        setScheduledDate("");
        setInspectionFindings("");
        fetchTabData();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to schedule inspection.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMaintenance = async (e) => {
    e.preventDefault();
    if (!maintTitle) {
      setError("Maintenance ticket title is required.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const res = await api.post(`/properties/${propertyId}/maintenance`, {
        title: maintTitle,
        category: maintCategory,
        priority: maintPriority,
        estimated_cost: maintCost,
        assigned_to: maintAssigned,
        description: maintDesc,
      });
      if (res.data?.success) {
        setSuccessMsg("Maintenance ticket created.");
        setShowMaintForm(false);
        setMaintTitle("");
        setMaintCost("");
        setMaintAssigned("");
        setMaintDesc("");
        fetchTabData();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create maintenance ticket.");
    } finally {
      setLoading(false);
    }
  };

  const handleLifecycleTransition = async (e) => {
    e.preventDefault();
    if (toState === currentState) {
      setError(`Property is already in state '${toState}'.`);
      return;
    }

    try {
      setLoading(true);
      setError("");
      const res = await api.post(`/properties/${propertyId}/lifecycle`, {
        to_state: toState,
        notes: stateNotes,
      });
      if (res.data?.success) {
        setSuccessMsg(res.data.message);
        setCurrentState(res.data.currentState);
        setLifecycleHistory(res.data.transitions || []);
        const allowed = res.data.allowedTransitions || [];
        setAllowedTransitions(allowed);
        if (allowed.length > 0) {
          setToState(allowed[0]);
        }
        setStateNotes("");
        if (onPropertyUpdated) onPropertyUpdated();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to transition property state.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !property) return null;

  return (
    <div className="ops-modal-overlay" onClick={onClose}>
      <div className="ops-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="ops-modal-header">
          <div>
            <div className="ops-header-tags">
              <span className="ops-id-tag">Property #{property.id}</span>
              <span className="ops-badge-secure">⚙️ Operations Hub</span>
            </div>
            <h2 className="ops-modal-title">{property.title}</h2>
            <p className="ops-modal-subtitle">
              {property.city ? `📍 ${property.city}` : ""} • Operational Management & Compliance
            </p>
          </div>
          <button type="button" className="ops-close-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="ops-nav-tabs">
          <button
            type="button"
            className={`ops-tab-btn ${activeTab === "verification" ? "active" : ""}`}
            onClick={() => setActiveTab("verification")}
          >
            🛡️ Verification
          </button>
          <button
            type="button"
            className={`ops-tab-btn ${activeTab === "checklist" ? "active" : ""}`}
            onClick={() => setActiveTab("checklist")}
          >
            ✅ Checklist
          </button>
          <button
            type="button"
            className={`ops-tab-btn ${activeTab === "inspections" ? "active" : ""}`}
            onClick={() => setActiveTab("inspections")}
          >
            🔍 Inspections
          </button>
          <button
            type="button"
            className={`ops-tab-btn ${activeTab === "maintenance" ? "active" : ""}`}
            onClick={() => setActiveTab("maintenance")}
          >
            🔧 Maintenance
          </button>
          <button
            type="button"
            className={`ops-tab-btn ${activeTab === "lifecycle" ? "active" : ""}`}
            onClick={() => setActiveTab("lifecycle")}
          >
            🔄 Lifecycle
          </button>
          <button
            type="button"
            className={`ops-tab-btn ${activeTab === "audit" ? "active" : ""}`}
            onClick={() => setActiveTab("audit")}
          >
            📜 Audit Trail
          </button>
        </div>

        {/* Body Content */}
        <div className="ops-modal-body">
          {error && <div className="ops-alert ops-alert-error">⚠️ {error}</div>}
          {successMsg && <div className="ops-alert ops-alert-success">✅ {successMsg}</div>}

          {/* TAB 1: VERIFICATION */}
          {activeTab === "verification" && (
            <div>
              <div className="ops-verif-card">
                <div className="ops-verif-header">
                  <div>
                    <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700 }}>Ownership Verification Status</h3>
                    <span style={{ fontSize: "12px", color: "#64748b" }}>
                      Legal validation and title deed approval
                    </span>
                  </div>
                  <span
                    className={`ops-status-badge ops-status-${(verification?.status || "pending").toLowerCase()}`}
                  >
                    {verification?.status || "Pending"}
                  </span>
                </div>

                <form onSubmit={handleUpdateVerification}>
                  <div className="ops-form-grid">
                    <div className="ops-form-group">
                      <label className="ops-label">Update Status</label>
                      <select
                        className="ops-select"
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value)}
                        disabled={loading}
                      >
                        <option value="Pending">Pending (Under Review)</option>
                        <option value="Verified">Verified (Title Clear)</option>
                        <option value="Rejected">Rejected (Disputed/Incomplete)</option>
                      </select>
                    </div>

                    <div className="ops-form-group">
                      <label className="ops-label">Verified By</label>
                      <input
                        type="text"
                        className="ops-input"
                        value={verification?.verified_by_name || "Unverified"}
                        disabled
                      />
                    </div>

                    <div className="ops-form-group full-width">
                      <label className="ops-label">Verification Notes & Findings</label>
                      <textarea
                        className="ops-textarea"
                        rows="2"
                        placeholder="Add deed references, registry numbers, or inspection notes..."
                        value={verifNotes}
                        onChange={(e) => setVerifNotes(e.target.value)}
                        disabled={loading}
                      ></textarea>
                    </div>
                  </div>

                  <button type="submit" className="ops-btn-primary" disabled={loading}>
                    {loading ? "Updating..." : "Save Verification Decision"}
                  </button>
                </form>
              </div>

              {/* Verification History */}
              <h4 style={{ margin: "20px 0 10px 0", fontSize: "14px", fontWeight: 700 }}>
                Verification Audit History
              </h4>
              {verificationHistory.length === 0 ? (
                <div className="ops-empty">No status changes recorded yet.</div>
              ) : (
                <div className="ops-timeline">
                  {verificationHistory.map((item) => (
                    <div key={item.id} className="ops-timeline-item">
                      <div className="ops-timeline-dot"></div>
                      <div className="ops-timeline-header">
                        <span className="ops-timeline-action">Status changed to: {item.status}</span>
                        <span className="ops-timeline-time">
                          {new Date(item.created_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="ops-timeline-meta">
                        By {item.verified_by_name || "User"} ({item.verified_by_role})
                        {item.notes && <p style={{ margin: "4px 0 0 0", color: "#64748b" }}>"{item.notes}"</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CHECKLIST */}
          {activeTab === "checklist" && (
            <div>
              <div className="ops-progress-bar-wrap">
                <div className="ops-progress-meta">
                  <span>Due Diligence Progress</span>
                  <span>
                    {checklistMeta.completedItems} / {checklistMeta.totalItems} completed ({checklistMeta.progressPercentage}%)
                  </span>
                </div>
                <div className="ops-progress-track">
                  <div className="ops-progress-fill" style={{ width: `${checklistMeta.progressPercentage}%` }}></div>
                </div>
              </div>

              <div className="ops-checklist-list">
                {checklist.map((item) => (
                  <div
                    key={item.id}
                    className={`ops-checklist-item ${item.is_completed ? "completed" : ""}`}
                  >
                    <label className="ops-checkbox-wrap">
                      <input
                        type="checkbox"
                        className="ops-checkbox"
                        checked={Boolean(item.is_completed)}
                        onChange={() => handleToggleChecklist(item.item_key, item.is_completed)}
                      />
                      <div>
                        <span className="ops-checklist-label">{item.item_label}</span>
                        {item.is_completed && item.completed_by_name && (
                          <div className="ops-checklist-meta">
                            Verified by {item.completed_by_name} on {new Date(item.completed_at).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: INSPECTIONS */}
          {activeTab === "inspections" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700 }}>Inspection Schedule</h3>
                <button
                  type="button"
                  className="ops-btn-primary"
                  onClick={() => setShowInspectionForm(!showInspectionForm)}
                >
                  {showInspectionForm ? "Cancel" : "+ Schedule Inspection"}
                </button>
              </div>

              {showInspectionForm && (
                <div className="ops-verif-card">
                  <form onSubmit={handleScheduleInspection}>
                    <div className="ops-form-grid">
                      <div className="ops-form-group">
                        <label className="ops-label">Inspector Name *</label>
                        <input
                          type="text"
                          className="ops-input"
                          placeholder="e.g. Suresh Kumar"
                          value={inspectorName}
                          onChange={(e) => setInspectorName(e.target.value)}
                          required
                        />
                      </div>
                      <div className="ops-form-group">
                        <label className="ops-label">Inspection Type</label>
                        <select
                          className="ops-select"
                          value={inspectionType}
                          onChange={(e) => setInspectionType(e.target.value)}
                        >
                          <option value="Routine">Routine Site Visit</option>
                          <option value="Pre-Purchase">Pre-Purchase Due Diligence</option>
                          <option value="Structural">Structural & Safety</option>
                          <option value="Move-In">Move-In / Move-Out Inspection</option>
                        </select>
                      </div>
                      <div className="ops-form-group">
                        <label className="ops-label">Scheduled Date & Time *</label>
                        <input
                          type="datetime-local"
                          className="ops-input"
                          value={scheduledDate}
                          onChange={(e) => setScheduledDate(e.target.value)}
                          required
                        />
                      </div>
                      <div className="ops-form-group">
                        <label className="ops-label">Initial Condition Rating</label>
                        <select
                          className="ops-select"
                          value={conditionRating}
                          onChange={(e) => setConditionRating(e.target.value)}
                        >
                          <option value="Excellent">Excellent</option>
                          <option value="Good">Good</option>
                          <option value="Fair">Fair</option>
                          <option value="Poor">Poor</option>
                        </select>
                      </div>
                      <div className="ops-form-group full-width">
                        <label className="ops-label">Findings & Notes</label>
                        <textarea
                          className="ops-textarea"
                          rows="2"
                          placeholder="Initial checklist observations..."
                          value={inspectionFindings}
                          onChange={(e) => setInspectionFindings(e.target.value)}
                        ></textarea>
                      </div>
                    </div>
                    <button type="submit" className="ops-btn-primary" disabled={loading}>
                      Schedule Inspection
                    </button>
                  </form>
                </div>
              )}

              {inspections.length === 0 ? (
                <div className="ops-empty">No inspections scheduled for this property.</div>
              ) : (
                <table className="ops-table">
                  <thead>
                    <tr>
                      <th>Inspector</th>
                      <th>Type</th>
                      <th>Scheduled</th>
                      <th>Status</th>
                      <th>Condition</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inspections.map((insp) => (
                      <tr key={insp.id}>
                        <td><strong>{insp.inspector_name}</strong></td>
                        <td>{insp.inspection_type}</td>
                        <td>{new Date(insp.scheduled_date).toLocaleString()}</td>
                        <td>
                          <span className="ops-pill ops-pill-low">{insp.status}</span>
                        </td>
                        <td>{insp.condition_rating || "Pending"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* TAB 4: MAINTENANCE */}
          {activeTab === "maintenance" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700 }}>Maintenance & Work Orders</h3>
                <button
                  type="button"
                  className="ops-btn-primary"
                  onClick={() => setShowMaintForm(!showMaintForm)}
                >
                  {showMaintForm ? "Cancel" : "+ Create Ticket"}
                </button>
              </div>

              {showMaintForm && (
                <div className="ops-verif-card">
                  <form onSubmit={handleCreateMaintenance}>
                    <div className="ops-form-grid">
                      <div className="ops-form-group full-width">
                        <label className="ops-label">Ticket Title *</label>
                        <input
                          type="text"
                          className="ops-input"
                          placeholder="e.g. Master Bedroom HVAC Servicing"
                          value={maintTitle}
                          onChange={(e) => setMaintTitle(e.target.value)}
                          required
                        />
                      </div>
                      <div className="ops-form-group">
                        <label className="ops-label">Category</label>
                        <select
                          className="ops-select"
                          value={maintCategory}
                          onChange={(e) => setMaintCategory(e.target.value)}
                        >
                          <option value="General">General Repairs</option>
                          <option value="Plumbing">Plumbing</option>
                          <option value="Electrical">Electrical & Power</option>
                          <option value="HVAC">HVAC / Air Conditioning</option>
                          <option value="Painting">Painting & Carpentry</option>
                        </select>
                      </div>
                      <div className="ops-form-group">
                        <label className="ops-label">Priority</label>
                        <select
                          className="ops-select"
                          value={maintPriority}
                          onChange={(e) => setMaintPriority(e.target.value)}
                        >
                          <option value="Low">Low</option>
                          <option value="Medium">Medium</option>
                          <option value="High">High</option>
                          <option value="Urgent">Urgent</option>
                        </select>
                      </div>
                      <div className="ops-form-group">
                        <label className="ops-label">Estimated Cost (₹)</label>
                        <input
                          type="number"
                          className="ops-input"
                          placeholder="e.g. 5000"
                          value={maintCost}
                          onChange={(e) => setMaintCost(e.target.value)}
                        />
                      </div>
                      <div className="ops-form-group">
                        <label className="ops-label">Assigned Contractor</label>
                        <input
                          type="text"
                          className="ops-input"
                          placeholder="e.g. UrbanFix Team"
                          value={maintAssigned}
                          onChange={(e) => setMaintAssigned(e.target.value)}
                        />
                      </div>
                      <div className="ops-form-group full-width">
                        <label className="ops-label">Description</label>
                        <textarea
                          className="ops-textarea"
                          rows="2"
                          placeholder="Scope of work..."
                          value={maintDesc}
                          onChange={(e) => setMaintDesc(e.target.value)}
                        ></textarea>
                      </div>
                    </div>
                    <button type="submit" className="ops-btn-primary" disabled={loading}>
                      Create Maintenance Ticket
                    </button>
                  </form>
                </div>
              )}

              {maintenance.length === 0 ? (
                <div className="ops-empty">No maintenance requests logged.</div>
              ) : (
                <table className="ops-table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Category</th>
                      <th>Priority</th>
                      <th>Est. Cost</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {maintenance.map((m) => (
                      <tr key={m.id}>
                        <td><strong>{m.title}</strong></td>
                        <td>{m.category}</td>
                        <td>
                          <span className={`ops-pill ops-pill-${m.priority.toLowerCase()}`}>
                            {m.priority}
                          </span>
                        </td>
                        <td>₹{Number(m.estimated_cost).toLocaleString("en-IN")}</td>
                        <td>
                          <span className="ops-pill ops-pill-low">{m.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* TAB 5: LIFECYCLE */}
          {activeTab === "lifecycle" && (
            <div>
              <div className="ops-verif-card">
                <div className="ops-verif-header">
                  <div>
                    <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700 }}>Current Property Status</h3>
                    <span style={{ fontSize: "12px", color: "#64748b" }}>Live listing state machine</span>
                  </div>
                  <span className="ops-status-badge ops-status-verified">
                    {currentState}
                  </span>
                </div>

                <form onSubmit={handleLifecycleTransition}>
                  <div className="ops-form-grid">
                    <div className="ops-form-group">
                      <label className="ops-label">Transition To New State</label>
                      <select
                        className="ops-select"
                        value={toState}
                        onChange={(e) => setToState(e.target.value)}
                        disabled={allowedTransitions.length === 0}
                      >
                        {allowedTransitions.length > 0 ? (
                          allowedTransitions.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))
                        ) : (
                          <option value="">No transitions available</option>
                        )}
                      </select>
                      {allowedTransitions.length > 0 && (
                        <span style={{ fontSize: "11px", color: "#64748b", marginTop: "4px", display: "block" }}>
                          Allowed next: {allowedTransitions.join(" • ")}
                        </span>
                      )}
                    </div>
                    <div className="ops-form-group">
                      <label className="ops-label">Transition Reason / Notes</label>
                      <input
                        type="text"
                        className="ops-input"
                        placeholder="e.g. Agreement executed with buyer"
                        value={stateNotes}
                        onChange={(e) => setStateNotes(e.target.value)}
                      />
                    </div>
                  </div>
                  <button type="submit" className="ops-btn-primary" disabled={loading || toState === currentState}>
                    {loading ? "Updating..." : `Transition Status to '${toState}'`}
                  </button>
                </form>
              </div>

              <h4 style={{ margin: "20px 0 10px 0", fontSize: "14px", fontWeight: 700 }}>
                Lifecycle History & Audit
              </h4>
              {lifecycleHistory.length === 0 ? (
                <div className="ops-empty">No prior lifecycle transitions recorded.</div>
              ) : (
                <div className="ops-timeline">
                  {lifecycleHistory.map((lt) => (
                    <div key={lt.id} className="ops-timeline-item">
                      <div className="ops-timeline-dot"></div>
                      <div className="ops-timeline-header">
                        <span className="ops-timeline-action">
                          {lt.from_state || "Created"} → <strong>{lt.to_state}</strong>
                        </span>
                        <span className="ops-timeline-time">
                          {new Date(lt.created_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="ops-timeline-meta">
                        Updated by {lt.changed_by_name} ({lt.changed_by_role})
                        {lt.notes && <p style={{ margin: "4px 0 0 0", color: "#64748b" }}>"{lt.notes}"</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: AUDIT TRAIL */}
          {activeTab === "audit" && (
            <div>
              <div style={{ marginBottom: "14px" }}>
                <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700 }}>Immutable Activity Trail</h3>
                <span style={{ fontSize: "12px", color: "#64748b" }}>
                  Append-only record of all operational actions and document updates
                </span>
              </div>

              {auditLogs.length === 0 ? (
                <div className="ops-empty">No activity records logged for this property.</div>
              ) : (
                <div className="ops-timeline">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="ops-timeline-item">
                      <div className="ops-timeline-dot"></div>
                      <div className="ops-timeline-header">
                        <span className="ops-timeline-action">{log.action}</span>
                        <span className="ops-timeline-time">
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="ops-timeline-meta">
                        <strong>{log.user_name}</strong> ({log.user_role}) • Entity: {log.entity}
                        {log.details && (
                          <pre className="ops-details-code">
                            {typeof log.details === "object" ? JSON.stringify(log.details, null, 2) : log.details}
                          </pre>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PropertyOperationsModal;
