import { useCallback, useEffect, useState } from "react";
import api from "../api/axios";
import DashboardBackLink from "../components/DashboardBackLink";
import "./Agents.css";

function Agents() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Add Agent Modal & Form States
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");
  const [feedbackSuccess, setFeedbackSuccess] = useState("");

  const fetchAgents = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/admin/agents");

      if (response.data.success) {
        setAgents(response.data.agents || []);
      } else {
        setAgents([]);
        setError(
          response.data?.message || "Failed to load agents.",
        );
      }
    } catch (err) {
      console.error("Agents Error:", err);

      setError(
        err.response?.data?.message || "Failed to load agents.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  // Handle ESC key to dismiss modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && showAddModal && !submitting) {
        setShowAddModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showAddModal, submitting]);

  const openModal = () => {
    setFormData({ name: "", email: "", phone: "", password: "" });
    setFormErrors({});
    setModalError("");
    setShowAddModal(true);
  };

  const closeModal = () => {
    if (submitting) return;
    setShowAddModal(false);
    setFormErrors({});
    setModalError("");
  };

  const validate = () => {
    const errors = {};
    if (!formData.name.trim()) {
      errors.name = "Full Name is required.";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      errors.email = "Email is required.";
    } else if (!emailRegex.test(formData.email.trim())) {
      errors.email = "Please enter a valid email address.";
    }

    const phoneRegex = /^[+]?[\d\s\-()]{7,25}$/;
    const digits = formData.phone.replace(/\D/g, "");
    if (!formData.phone.trim()) {
      errors.phone = "Phone number is required.";
    } else if (!phoneRegex.test(formData.phone.trim()) || digits.length < 7 || digits.length > 15) {
      errors.phone = "Please enter a valid phone number (7-15 digits).";
    }

    if (!formData.password) {
      errors.password = "Password is required.";
    } else if (formData.password.length < 6) {
      errors.password = "Password must be at least 6 characters long.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setModalError("");
    setFeedbackSuccess("");

    if (!validate()) {
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post("/admin/agents", {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        password: formData.password,
      });

      if (res.data.success) {
        setFeedbackSuccess(`Agent "${formData.name.trim()}" added successfully.`);
        closeModal();
        await fetchAgents();
      } else {
        setModalError(res.data.message || "Failed to create agent.");
      }
    } catch (err) {
      console.error("Create Agent Error:", err);
      setModalError(err.response?.data?.message || "Failed to create agent.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && agents.length === 0) {
    return (
      <div className="page-container">
        <div className="page-header">
          <div>
            <span className="agents-label">ADMIN MANAGEMENT</span>
            <h1>Agents</h1>
            <p>Loading agents...</p>
          </div>

          <div className="agents-header-actions">
            <DashboardBackLink />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <span className="agents-label">ADMIN MANAGEMENT</span>
          <h1>Agents</h1>
          <p>Manage all registered agents</p>
        </div>

        <div className="agents-header-actions">
          <DashboardBackLink />
          <button
            type="button"
            className="agents-add-btn"
            id="btn-add-agent"
            onClick={openModal}
          >
            + Add Agent
          </button>
          <button
            type="button"
            className="agents-refresh-btn"
            id="btn-refresh-agents"
            onClick={fetchAgents}
            disabled={loading}
          >
            {loading ? "↻ Loading..." : "↻ Refresh"}
          </button>
        </div>
      </div>

      {feedbackSuccess && (
        <div className="success-banner" role="status" id="agent-success-banner">
          <span className="success-icon">✓</span>
          <span>{feedbackSuccess}</span>
          <button
            type="button"
            className="success-close-btn"
            onClick={() => setFeedbackSuccess("")}
            aria-label="Dismiss alert"
          >
            ×
          </button>
        </div>
      )}

      {error && <div className="error-box">{error}</div>}

      {!error && agents.length === 0 && (
        <div className="empty-state">
          <h3>No Agents Found</h3>
          <p>Currently there are no registered agents.</p>
        </div>
      )}

      {agents.length > 0 && (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Role</th>
                <th>Created</th>
              </tr>
            </thead>

            <tbody>
              {agents.map((agent) => (
                <tr key={agent.agent_id || agent.id}>
                  <td>{agent.agent_id || agent.id}</td>
                  <td>{agent.name || "-"}</td>
                  <td>{agent.email || "-"}</td>
                  <td>{agent.phone || "-"}</td>
                  <td>
                    <span className="role-badge agent">
                      {agent.role || "agent"}
                    </span>
                  </td>
                  <td>
                    {agent.created_at
                      ? new Date(
                          agent.created_at,
                        ).toLocaleDateString()
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Agent Modal */}
      {showAddModal && (
        <div
          className="agent-modal-overlay"
          onClick={closeModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-add-agent-title"
        >
          <div
            className="agent-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="agent-modal-header">
              <div>
                <h3 id="modal-add-agent-title">+ Add New Agent</h3>
                <p>Register a licensed agent account with direct portal access.</p>
              </div>
              <button
                type="button"
                className="agent-modal-close-btn"
                onClick={closeModal}
                disabled={submitting}
                aria-label="Close dialog"
              >
                ×
              </button>
            </div>

            {modalError && (
              <div className="modal-error-box" role="alert" id="agent-modal-error">
                <span className="error-icon">⚠️</span>
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="agent-modal-form">
              <div className="form-group">
                <label htmlFor="agent-name">
                  Full Name <span className="req">*</span>
                </label>
                <input
                  id="agent-name"
                  type="text"
                  placeholder="e.g. Alexander Wright"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    if (formErrors.name) setFormErrors({ ...formErrors, name: null });
                  }}
                  className={formErrors.name ? "input-error" : ""}
                  disabled={submitting}
                  autoFocus
                />
                {formErrors.name && (
                  <span className="field-error-msg">{formErrors.name}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="agent-email">
                  Email Address <span className="req">*</span>
                </label>
                <input
                  id="agent-email"
                  type="email"
                  placeholder="e.g. alexander@brokerage.com"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    if (formErrors.email) setFormErrors({ ...formErrors, email: null });
                  }}
                  className={formErrors.email ? "input-error" : ""}
                  disabled={submitting}
                />
                {formErrors.email && (
                  <span className="field-error-msg">{formErrors.email}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="agent-phone">
                  Phone Number <span className="req">*</span>
                </label>
                <input
                  id="agent-phone"
                  type="tel"
                  placeholder="e.g. +91 98765 43210"
                  value={formData.phone}
                  onChange={(e) => {
                    setFormData({ ...formData, phone: e.target.value });
                    if (formErrors.phone) setFormErrors({ ...formErrors, phone: null });
                  }}
                  className={formErrors.phone ? "input-error" : ""}
                  disabled={submitting}
                />
                {formErrors.phone && (
                  <span className="field-error-msg">{formErrors.phone}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="agent-password">
                  Password <span className="req">*</span>
                </label>
                <input
                  id="agent-password"
                  type="password"
                  placeholder="Min. 6 characters"
                  value={formData.password}
                  onChange={(e) => {
                    setFormData({ ...formData, password: e.target.value });
                    if (formErrors.password) setFormErrors({ ...formErrors, password: null });
                  }}
                  className={formErrors.password ? "input-error" : ""}
                  disabled={submitting}
                />
                {formErrors.password && (
                  <span className="field-error-msg">{formErrors.password}</span>
                )}
              </div>

              <div className="agent-modal-actions">
                <button
                  type="button"
                  className="agent-modal-cancel-btn"
                  onClick={closeModal}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="btn-submit-agent"
                  className="agent-modal-submit-btn"
                  disabled={submitting}
                >
                  {submitting ? "Creating Agent..." : "Create Agent"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Agents;