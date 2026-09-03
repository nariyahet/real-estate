import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import "./Inquiries.css";

function Inquiries() {
  const navigate = useNavigate();
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [updatingId, setUpdatingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Active modal or editing note state
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const getUser = () => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  };

  const user = getUser();
  const role = user?.role || "user";
  const isAdmin = role === "admin";
  const isAgent = role === "agent";

  const fetchInquiries = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const params = {};
      if (isAdmin && statusFilter !== "all") {
        params.status = statusFilter;
      }

      const response = await api.get("/inquiries", { params });

      if (response.data?.success) {
        setInquiries(response.data.inquiries || []);
      } else {
        setInquiries([]);
        setError(response.data?.message || "Failed to load inquiries.");
      }
    } catch (err) {
      console.error("Fetch Inquiries Error:", err);
      setInquiries([]);
      setError(
        err.response?.data?.message || "Failed to load inquiries. Please check your connection.",
      );
    } finally {
      setLoading(false);
    }
  }, [isAdmin, statusFilter]);

  useEffect(() => {
    fetchInquiries();
  }, [fetchInquiries]);

  const handleStatusChange = async (inquiryId, newStatus) => {
    try {
      setUpdatingId(inquiryId);
      setError("");

      const response = await api.put(`/inquiries/${inquiryId}/status`, {
        status: newStatus,
      });

      if (response.data?.success) {
        setInquiries((prev) =>
          prev.map((inq) =>
            inq.id === inquiryId ? { ...inq, status: newStatus } : inq,
          ),
        );
      } else {
        setError(response.data?.message || "Failed to update inquiry status.");
      }
    } catch (err) {
      console.error("Update Status Error:", err);
      setError(err.response?.data?.message || "Could not update status.");
    } finally {
      setUpdatingId(null);
    }
  };

  const openNoteEditor = (inquiry) => {
    setEditingNoteId(inquiry.id);
    setNoteText(inquiry.agent_notes || "");
  };

  const closeNoteEditor = () => {
    setEditingNoteId(null);
    setNoteText("");
  };

  const handleSaveNote = async (inquiryId) => {
    try {
      setSavingNote(true);
      setError("");

      const response = await api.put(`/inquiries/${inquiryId}/status`, {
        agent_notes: noteText.trim() || null,
      });

      if (response.data?.success) {
        setInquiries((prev) =>
          prev.map((inq) =>
            inq.id === inquiryId ? { ...inq, agent_notes: noteText.trim() || null } : inq,
          ),
        );
        closeNoteEditor();
      } else {
        setError(response.data?.message || "Failed to save note.");
      }
    } catch (err) {
      console.error("Save Note Error:", err);
      setError(err.response?.data?.message || "Could not save agent note.");
    } finally {
      setSavingNote(false);
    }
  };

  const handleDelete = async (inquiryId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this inquiry record?",
    );

    if (!confirmed) return;

    try {
      setDeletingId(inquiryId);
      setError("");

      const response = await api.delete(`/inquiries/${inquiryId}`);

      if (response.data?.success) {
        setInquiries((prev) => prev.filter((inq) => inq.id !== inquiryId));
      } else {
        setError(response.data?.message || "Failed to delete inquiry.");
      }
    } catch (err) {
      console.error("Delete Inquiry Error:", err);
      setError(err.response?.data?.message || "Could not delete inquiry.");
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "Pending":
        return "badge-pending";
      case "Contacted":
        return "badge-contacted";
      case "Resolved":
        return "badge-resolved";
      case "Closed":
        return "badge-closed";
      case "Cancelled":
        return "badge-cancelled";
      default:
        return "badge-pending";
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return "-";
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  const formatPrice = (price, listingType) => {
    const val = Number(price || 0);
    const formatted = val.toLocaleString("en-IN");
    return listingType === "Rent" ? `₹${formatted}/mo` : `₹${formatted}`;
  };

  const displayedInquiries =
    !isAdmin && statusFilter !== "all"
      ? inquiries.filter((inq) => inq.status === statusFilter)
      : inquiries;

  return (
    <div className="inquiries-page-container">
      {/* Page Header */}
      <div className="inquiries-page-header">
        <div>
          <button
            type="button"
            className="inquiries-back-nav"
            onClick={() => navigate("/dashboard")}
          >
            ← Back to Dashboard
          </button>

          <span className="inquiries-label">
            {isAdmin
              ? "ADMINISTRATION"
              : isAgent
              ? "AGENT INBOX"
              : "MY INQUIRIES"}
          </span>

          <h1>Property Inquiries</h1>

          <p>
            {isAdmin
              ? "Oversee and track all property inquiries across all agents and listings."
              : isAgent
              ? "Review prospective client inquiries and update response statuses."
              : "Track the real-time status of inquiries you've submitted for properties."}
          </p>
        </div>

        <div className="header-controls">
          <div className="filter-group">
            <label htmlFor="status-filter">Status:</label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="status-filter-select"
            >
              <option value="all">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Contacted">Contacted</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          <button
            type="button"
            className="refresh-btn"
            onClick={fetchInquiries}
            disabled={loading}
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="error-box">
          <span>{error}</span>
          <button type="button" className="error-close" onClick={() => setError("")}>
            ×
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="loading-state">
          <div className="loader"></div>
          <p>Loading inquiries...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && displayedInquiries.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">✉</div>
          <h3>No Inquiries Found</h3>
          <p>
            {isAdmin
              ? "No inquiries match your selected status filter."
              : isAgent
              ? "No client inquiries have been submitted for your listings yet."
              : "You have not submitted any property inquiries yet. Browse properties and send your first inquiry!"}
          </p>
          {!isAdmin && !isAgent && (
            <Link to="/properties" className="browse-properties-btn">
              Browse Available Properties →
            </Link>
          )}
        </div>
      )}

      {/* Inquiries Cards Grid */}
      {!loading && displayedInquiries.length > 0 && (
        <div className="inquiries-grid">
          {displayedInquiries.map((inquiry) => (
            <div key={inquiry.id} className="inquiry-card">
              {/* Card Header: Property Link & Status */}
              <div className="inquiry-card-header">
                <div className="inquiry-property-brief">
                  {inquiry.property_image ? (
                    <img
                      src={inquiry.property_image}
                      alt=""
                      className="inquiry-thumb"
                    />
                  ) : (
                    <div className="inquiry-thumb-placeholder">🏠</div>
                  )}

                  <div className="property-meta">
                    <Link
                      to={`/properties/${inquiry.property_id}`}
                      className="property-link-title"
                    >
                      {inquiry.property_title || `Property #${inquiry.property_id}`}
                    </Link>

                    <div className="property-sub">
                      <span>{inquiry.property_city || "Property Location"}</span>
                      {inquiry.property_price && (
                        <strong className="property-price-tag">
                          {formatPrice(inquiry.property_price, inquiry.listing_type)}
                        </strong>
                      )}
                    </div>
                  </div>
                </div>

                <div className="inquiry-header-right">
                  <span className="inquiry-date">{formatDate(inquiry.created_at)}</span>

                  {/* Status Dropdown for Agent & Admin, Read-only badge for User */}
                  {isAdmin || isAgent ? (
                    <select
                      className={`status-selector ${getStatusBadgeClass(inquiry.status)}`}
                      value={inquiry.status || "Pending"}
                      disabled={updatingId === inquiry.id}
                      onChange={(e) => handleStatusChange(inquiry.id, e.target.value)}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Contacted">Contacted</option>
                      <option value="Resolved">Resolved</option>
                      <option value="Closed">Closed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  ) : (
                    <span className={`status-pill ${getStatusBadgeClass(inquiry.status)}`}>
                      {inquiry.status}
                    </span>
                  )}
                </div>
              </div>

              {/* Inquirer & Agent Details */}
              <div className="inquiry-parties-grid">
                <div className="party-block">
                  <span className="party-title">CLIENT INFORMATION</span>
                  <div className="party-name">{inquiry.name}</div>
                  <div className="party-contact-links">
                    <a href={`mailto:${inquiry.email}`} className="contact-link">
                      ✉ {inquiry.email}
                    </a>
                    {inquiry.phone && (
                      <a href={`tel:${inquiry.phone}`} className="contact-link">
                        📞 {inquiry.phone}
                      </a>
                    )}
                  </div>
                </div>

                <div className="party-block">
                  <span className="party-title">ASSIGNED AGENT</span>
                  <div className="party-name">
                    {inquiry.agent_name || "Premier Realty Support"}
                  </div>
                  <div className="party-subtext">
                    {inquiry.agency_name || "Real Estate Management"}
                  </div>
                  {inquiry.agent_phone && (
                    <div className="party-contact-links">
                      <span className="contact-info">📞 {inquiry.agent_phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Inquiry Message */}
              <div className="inquiry-message-section">
                <span className="message-label">INQUIRY MESSAGE</span>
                <div className="message-content">"{inquiry.message}"</div>
              </div>

              {/* Agent Notes / Follow-up Section */}
              {inquiry.agent_notes && (
                <div className="agent-notes-section">
                  <div className="notes-header">
                    <span>📝 AGENT FOLLOW-UP NOTE</span>
                  </div>
                  <p className="notes-content">{inquiry.agent_notes}</p>
                </div>
              )}

              {/* Card Footer Actions */}
              <div className="inquiry-card-footer">
                <div className="footer-left">
                  <Link
                    to={`/properties/${inquiry.property_id}`}
                    className="view-property-btn"
                  >
                    View Property Details →
                  </Link>

                  {(isAdmin || isAgent) && (
                    <button
                      type="button"
                      className="edit-note-btn"
                      onClick={() => openNoteEditor(inquiry)}
                    >
                      {inquiry.agent_notes ? "✏ Edit Follow-up Note" : "+ Add Follow-up Note"}
                    </button>
                  )}
                </div>

                <div className="footer-right">
                  {(isAdmin || (!isAgent && inquiry.status === "Pending")) && (
                    <button
                      type="button"
                      className="delete-inquiry-btn"
                      disabled={deletingId === inquiry.id}
                      onClick={() => handleDelete(inquiry.id)}
                    >
                      {deletingId === inquiry.id ? "Deleting..." : "Delete"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Note Editor Modal */}
      {editingNoteId && (
        <div className="note-modal-overlay" onClick={closeNoteEditor}>
          <div
            className="note-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="note-modal-header">
              <h3>Agent Follow-up Note</h3>
              <button type="button" className="close-modal-btn" onClick={closeNoteEditor}>
                ×
              </button>
            </div>

            <p className="note-modal-desc">
              Record conversation highlights, viewing schedules, or follow-up details.
            </p>

            <textarea
              rows="5"
              className="note-textarea"
              placeholder="e.g., Called the client on 04/09. Scheduled property visit for Saturday 11 AM."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
            ></textarea>

            <div className="note-modal-actions">
              <button
                type="button"
                className="cancel-btn"
                onClick={closeNoteEditor}
                disabled={savingNote}
              >
                Cancel
              </button>

              <button
                type="button"
                className="save-note-btn"
                onClick={() => handleSaveNote(editingNoteId)}
                disabled={savingNote}
              >
                {savingNote ? "Saving..." : "Save Note"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Inquiries;
