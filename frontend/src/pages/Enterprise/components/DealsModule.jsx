import { useState, useEffect, useCallback } from "react";
import api from "../../../api/axios";

export default function DealsModule() {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Deal detail / drawer state
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [offers, setOffers] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [newOffer, setNewOffer] = useState({
    offered_by_name: "",
    offered_by_role: "Buyer",
    offer_amount: "",
    terms: ""
  });

  // Create Deal Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [properties, setProperties] = useState([]);
  const [newDeal, setNewDeal] = useState({
    property_id: "",
    buyer_name: "",
    buyer_email: "",
    buyer_phone: "",
    deal_title: "",
    agreed_price: "",
    token_amount: "",
    notes: ""
  });

  const dealStages = [
    { value: "Prospect", label: "Prospect" },
    { value: "Offer_Made", label: "Offer Made" },
    { value: "Negotiation", label: "Negotiation" },
    { value: "Token_Received", label: "Token Received" },
    { value: "Agreement_Signed", label: "Agreement Signed" },
    { value: "Closed", label: "Closed" },
    { value: "Cancelled", label: "Cancelled" }
  ];

  const fetchDeals = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await api.get("/deals/deals");
      if (res.data?.success) {
        setDeals(res.data.deals || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load deals.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPropertiesForDeal = useCallback(async () => {
    try {
      const res = await api.get("/properties");
      if (res.data?.success) {
        setProperties(res.data.properties || []);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchDeals();
    fetchPropertiesForDeal();
  }, [fetchDeals, fetchPropertiesForDeal]);

  const handleCreateDeal = async (e) => {
    e.preventDefault();
    try {
      setError("");
      const payload = {
        ...newDeal,
        property_id: Number(newDeal.property_id),
        agreed_price: Number(newDeal.agreed_price),
        token_amount: newDeal.token_amount ? Number(newDeal.token_amount) : 0
      };
      const res = await api.post("/deals/deals", payload);
      if (res.data?.success) {
        setSuccessMsg(`Deal #${res.data.dealId} successfully created with 3-Stage Milestone schedule!`);
        setShowCreateModal(false);
        setNewDeal({
          property_id: "",
          buyer_name: "",
          buyer_email: "",
          buyer_phone: "",
          deal_title: "",
          agreed_price: "",
          token_amount: "",
          notes: ""
        });
        fetchDeals();
        setTimeout(() => setSuccessMsg(""), 4000);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create deal.");
    }
  };

  const handleStageChange = async (dealId, stage) => {
    try {
      const res = await api.put(`/deals/deals/${dealId}/stage`, { stage });
      if (res.data?.success) {
        setDeals((prev) =>
          prev.map((d) => (d.id === dealId ? { ...d, stage } : d))
        );
        if (selectedDeal && selectedDeal.id === dealId) {
          setSelectedDeal((prev) => ({ ...prev, stage }));
        }
        setSuccessMsg(`Deal #${dealId} moved to ${stage}`);
        setTimeout(() => setSuccessMsg(""), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update deal stage.");
    }
  };

  const openDealDrawer = async (deal) => {
    setSelectedDeal(deal);
    try {
      const [offRes, msRes] = await Promise.all([
        api.get(`/deals/deals/${deal.id}/offers`),
        api.get(`/deals/deals/${deal.id}/milestones`)
      ]);
      if (offRes.data?.success) setOffers(offRes.data.offers || []);
      if (msRes.data?.success) setMilestones(msRes.data.milestones || []);
    } catch (err) {
      console.error("Failed to load deal details:", err);
    }
  };

  const handleAddOffer = async (e) => {
    e.preventDefault();
    if (!selectedDeal) return;
    try {
      const payload = {
        ...newOffer,
        offer_amount: Number(newOffer.offer_amount)
      };
      const res = await api.post(`/deals/deals/${selectedDeal.id}/offers`, payload);
      if (res.data?.success) {
        setOffers((prev) => [
          {
            id: res.data.offerId,
            ...payload,
            status: "Pending",
            created_at: new Date().toISOString()
          },
          ...prev
        ]);
        setNewOffer({
          offered_by_name: "",
          offered_by_role: "Buyer",
          offer_amount: "",
          terms: ""
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit offer.");
    }
  };

  const handleUpdateMilestoneStatus = async (milestoneId, paymentStatus) => {
    try {
      const res = await api.put(`/deals/milestones/${milestoneId}/status`, { payment_status: paymentStatus });
      if (res.data?.success) {
        setMilestones((prev) =>
          prev.map((m) => (m.id === milestoneId ? { ...m, payment_status: paymentStatus } : m))
        );
        setSuccessMsg("Milestone payment status updated.");
        setTimeout(() => setSuccessMsg(""), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update milestone.");
    }
  };

  return (
    <div className="enterprise-module-container">
      <div className="module-header-row">
        <div>
          <h2>🤝 Sales & Deal Management Hub</h2>
          <p className="subtitle">Lifecycle deal tracker, offer & counter-offer negotiations, 3-stage milestone escrow schedules & closing checklists.</p>
        </div>
        <div className="module-header-actions">
          <button type="button" className="btn-primary" onClick={() => setShowCreateModal(true)}>
            + Initiate New Deal
          </button>
        </div>
      </div>

      {error && <div className="ent-alert ent-alert-danger">{error}</div>}
      {successMsg && <div className="ent-alert ent-alert-success">{successMsg}</div>}

      {/* Deals Table */}
      {loading ? (
        <div className="ent-loading-state">Loading Sales Deals & Pipeline...</div>
      ) : (
        <div className="ent-table-container">
          <table className="ent-table">
            <thead>
              <tr>
                <th>Deal ID</th>
                <th>Title & Property</th>
                <th>Buyer</th>
                <th>Agreed Value</th>
                <th>Stage Workflow</th>
                <th>Closing Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {deals.map((deal) => (
                <tr key={deal.id}>
                  <td>#{deal.id}</td>
                  <td>
                    <strong>{deal.deal_title || `Deal #${deal.id}`}</strong>
                    <div className="sub-text">Property #{deal.property_id}: {deal.property_title || "Residential Asset"}</div>
                  </td>
                  <td>
                    <strong>{deal.buyer_name}</strong>
                    <div className="sub-text">{deal.buyer_phone}</div>
                  </td>
                  <td>
                    <strong style={{ color: "#2563eb" }}>₹{Number(deal.agreed_price || 0).toLocaleString("en-IN")}</strong>
                    {deal.token_amount && (
                      <div className="sub-text">Token: ₹{Number(deal.token_amount).toLocaleString("en-IN")}</div>
                    )}
                  </td>
                  <td>
                    <select
                      className={`stage-select stage-badge-${(deal.stage || 'Prospect').toLowerCase().replace(/\s+/g, '-')}`}
                      value={deal.stage || "Prospect"}
                      onChange={(e) => handleStageChange(deal.id, e.target.value)}
                    >
                      {dealStages.map((st) => (
                        <option key={st.value} value={st.value}>{st.label}</option>
                      ))}
                    </select>
                  </td>
                  <td>{deal.actual_closing_date ? new Date(deal.actual_closing_date).toLocaleDateString("en-IN") : "In Progress"}</td>
                  <td>
                    <button type="button" className="btn-sm btn-primary-sm" onClick={() => openDealDrawer(deal)}>
                      Offers & Milestones ➔
                    </button>
                  </td>
                </tr>
              ))}
              {deals.length === 0 && (
                <tr>
                  <td colSpan="7" className="empty-row">No active deals found. Initiate a new deal to begin.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Deal Drawer for Offers, Milestones, and Checklist */}
      {selectedDeal && (
        <div className="ent-modal-backdrop" onClick={() => setSelectedDeal(null)}>
          <div className="ent-drawer ent-drawer-large" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div className="drawer-header-info">
                <h3>{selectedDeal.deal_title || `Deal #${selectedDeal.id}`}</h3>
                <p className="drawer-sub">
                  Property #{selectedDeal.property_id} • Buyer: {selectedDeal.buyer_name} • Agreed: ₹{Number(selectedDeal.agreed_price || 0).toLocaleString("en-IN")}
                </p>
              </div>
              <button type="button" className="drawer-close" onClick={() => setSelectedDeal(null)}>✕</button>
            </div>

            <div className="drawer-body">
              {/* 3-Stage Milestone Payment Schedule */}
              <div className="drawer-section">
                <h4>💳 3-Stage Milestone Payment Schedule</h4>
                <div className="milestone-grid">
                  {milestones.map((ms, idx) => (
                    <div key={ms.id} className="milestone-card">
                      <div className="ms-num">Stage {idx + 1}</div>
                      <strong>{ms.milestone_name}</strong>
                      <div className="ms-amount">₹{Number(ms.amount || 0).toLocaleString("en-IN")}</div>
                      <div className="ms-pct">{ms.percentage}% of Agreed Price</div>
                      <div className="ms-status-row">
                        <select
                          className="status-select-sm"
                          value={ms.payment_status || "Pending"}
                          onChange={(e) => handleUpdateMilestoneStatus(ms.id, e.target.value)}
                        >
                          <option value="Pending">⏳ Pending</option>
                          <option value="Invoiced">📄 Invoiced</option>
                          <option value="Paid">✔ Paid</option>
                          <option value="Overdue">⚠️ Overdue</option>
                        </select>
                      </div>
                    </div>
                  ))}
                  {milestones.length === 0 && <p className="empty-sub">No milestones generated yet.</p>}
                </div>
              </div>

              {/* Offer & Counter-Offer Negotiation Ledger */}
              <div className="drawer-section">
                <h4>📜 Negotiation Ledger & Formal Offers</h4>
                <form onSubmit={handleAddOffer} className="drawer-form">
                  <div className="form-grid-3">
                    <input
                      type="text"
                      placeholder="Offered By Name (e.g. Buyer / Seller)"
                      value={newOffer.offered_by_name}
                      required
                      onChange={(e) => setNewOffer({ ...newOffer, offered_by_name: e.target.value })}
                    />
                    <select
                      value={newOffer.offered_by_role}
                      onChange={(e) => setNewOffer({ ...newOffer, offered_by_role: e.target.value })}
                    >
                      <option value="Buyer">Buyer Offer</option>
                      <option value="Seller">Seller Counter-Offer</option>
                    </select>
                    <input
                      type="number"
                      placeholder="Offer Amount (₹)"
                      value={newOffer.offer_amount}
                      required
                      onChange={(e) => setNewOffer({ ...newOffer, offer_amount: e.target.value })}
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Contingencies / Terms (e.g. 60-day closure, token deposit)"
                    value={newOffer.terms}
                    onChange={(e) => setNewOffer({ ...newOffer, terms: e.target.value })}
                  />
                  <button type="submit" className="btn-primary-sm">+ Record Formal Offer</button>
                </form>

                <div className="offers-table-box" style={{ marginTop: "1rem" }}>
                  <table className="ent-table ent-table-sm">
                    <thead>
                      <tr>
                        <th>Party</th>
                        <th>Amount</th>
                        <th>Terms</th>
                        <th>Status</th>
                        <th>Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {offers.map((off) => (
                        <tr key={off.id}>
                          <td><strong>{off.offered_by_name}</strong> ({off.offered_by_role})</td>
                          <td>₹{Number(off.offer_amount).toLocaleString("en-IN")}</td>
                          <td>{off.terms || "Standard sale terms"}</td>
                          <td><span className="badge-pill">{off.status}</span></td>
                          <td>{new Date(off.created_at).toLocaleDateString("en-IN")}</td>
                        </tr>
                      ))}
                      {offers.length === 0 && (
                        <tr>
                          <td colSpan="5" className="empty-row">No formal offers recorded yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Initiate New Deal */}
      {showCreateModal && (
        <div className="ent-modal-backdrop" onClick={() => setShowCreateModal(false)}>
          <div className="ent-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🤝 Initiate New Sales Deal</h3>
              <button type="button" className="drawer-close" onClick={() => setShowCreateModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateDeal} className="modal-body-form">
              <div className="form-grid-2">
                <div>
                  <label>Select Listed Property *</label>
                  <select
                    required
                    value={newDeal.property_id}
                    onChange={(e) => {
                      const pId = e.target.value;
                      const selProp = properties.find((p) => p.id === Number(pId));
                      setNewDeal({
                        ...newDeal,
                        property_id: pId,
                        deal_title: selProp ? `Sale: ${selProp.title}` : "",
                        agreed_price: selProp ? selProp.price : ""
                      });
                    }}
                  >
                    <option value="">-- Choose Property --</option>
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>
                        #{p.id} - {p.title} (₹{Number(p.price).toLocaleString("en-IN")})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label>Deal Title *</label>
                  <input
                    type="text"
                    required
                    value={newDeal.deal_title}
                    onChange={(e) => setNewDeal({ ...newDeal, deal_title: e.target.value })}
                    placeholder="e.g. Sale of 3 BHK Luxury Apartment"
                  />
                </div>

                <div>
                  <label>Buyer Name *</label>
                  <input
                    type="text"
                    required
                    value={newDeal.buyer_name}
                    onChange={(e) => setNewDeal({ ...newDeal, buyer_name: e.target.value })}
                    placeholder="e.g. Rajesh Singhania"
                  />
                </div>

                <div>
                  <label>Buyer Phone *</label>
                  <input
                    type="text"
                    required
                    value={newDeal.buyer_phone}
                    onChange={(e) => setNewDeal({ ...newDeal, buyer_phone: e.target.value })}
                    placeholder="+91 98250 11223"
                  />
                </div>

                <div>
                  <label>Agreed Sale Price (₹) *</label>
                  <input
                    type="number"
                    required
                    value={newDeal.agreed_price}
                    onChange={(e) => setNewDeal({ ...newDeal, agreed_price: e.target.value })}
                    placeholder="7500000"
                  />
                </div>

                <div>
                  <label>Token / Earnest Deposit (₹)</label>
                  <input
                    type="number"
                    value={newDeal.token_amount}
                    onChange={(e) => setNewDeal({ ...newDeal, token_amount: e.target.value })}
                    placeholder="500000"
                  />
                </div>
              </div>

              <div>
                <label>Deal Contingencies & Notes</label>
                <textarea
                  rows="3"
                  value={newDeal.notes}
                  onChange={(e) => setNewDeal({ ...newDeal, notes: e.target.value })}
                  placeholder="Subject to title search clearance, 10% token deposit received."
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Create Deal & Schedule Milestones</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
