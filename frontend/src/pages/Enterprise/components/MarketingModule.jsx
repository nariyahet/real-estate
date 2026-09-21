import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../../../api/axios";

export default function MarketingModule() {
  const [searchParams, setSearchParams] = useSearchParams();
  const subParam = searchParams.get("sub");
  const [marketingTab, setMarketingTab] = useState(subParam || "campaigns"); // 'campaigns' | 'landing_pages' | 'automations'

  useEffect(() => {
    const sub = searchParams.get("sub");
    if (sub && ["campaigns", "landing_pages", "automations"].includes(sub)) {
      setMarketingTab(sub);
    }
  }, [searchParams]);

  const handleTabChange = (key) => {
    setMarketingTab(key);
    const newParams = new URLSearchParams(searchParams);
    newParams.set("tab", "marketing");
    newParams.set("sub", key);
    setSearchParams(newParams);
  };
  const [campaigns, setCampaigns] = useState([]);
  const [landingPages, setLandingPages] = useState([]);
  const [automations, setAutomations] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Create Campaign Modal
  const [showCampModal, setShowCampModal] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    name: "",
    campaign_type: "Social",
    budget: "",
    target_leads: ""
  });

  // Create Landing Page Modal
  const [showLpModal, setShowLpModal] = useState(false);
  const [newLp, setNewLp] = useState({
    title: "",
    property_id: "",
    hero_tagline: "",
    custom_content: ""
  });

  // Create Automation Modal
  const [showAutoModal, setShowAutoModal] = useState(false);
  const [newAuto, setNewAuto] = useState({
    campaign_id: "",
    trigger_event: "Lead_Created",
    channel: "WhatsApp",
    template_subject: "",
    template_body: "",
    delay_minutes: "0"
  });

  const fetchMarketingData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [cRes, lpRes, propRes, autoRes] = await Promise.allSettled([
        api.get("/marketing/campaigns"),
        api.get("/marketing/landing-pages"),
        api.get("/properties"),
        api.get("/marketing/automations")
      ]);

      if (cRes.status === "fulfilled" && cRes.value.data?.success) {
        setCampaigns(cRes.value.data.campaigns || []);
      }
      if (lpRes.status === "fulfilled" && lpRes.value.data?.success) {
        setLandingPages(lpRes.value.data.landingPages || []);
      }
      if (propRes.status === "fulfilled" && propRes.value.data?.success) {
        setProperties(propRes.value.data.properties || []);
      }
      if (autoRes.status === "fulfilled" && autoRes.value.data?.success) {
        setAutomations(autoRes.value.data.automations || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load marketing data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMarketingData();
  }, [fetchMarketingData]);

  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...newCampaign,
        budget: Number(newCampaign.budget || 0),
        target_leads: Number(newCampaign.target_leads || 0)
      };
      const res = await api.post("/marketing/campaigns", payload);
      if (res.data?.success) {
        setSuccessMsg(`Campaign "${newCampaign.name}" launched successfully!`);
        setShowCampModal(false);
        setNewCampaign({ name: "", campaign_type: "Social", budget: "", target_leads: "" });
        fetchMarketingData();
        setTimeout(() => setSuccessMsg(""), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to launch campaign.");
    }
  };

  const handleCreateLandingPage = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...newLp,
        property_id: Number(newLp.property_id)
      };
      const res = await api.post("/marketing/landing-pages", payload);
      if (res.data?.success) {
        setSuccessMsg(`Dynamic Landing Page published at: /p/${res.data.slug}`);
        setShowLpModal(false);
        setNewLp({ title: "", property_id: "", hero_tagline: "", custom_content: "" });
        fetchMarketingData();
        setTimeout(() => setSuccessMsg(""), 4000);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to publish landing page.");
    }
  };

  const handleCreateAutomation = async (e) => {
    e.preventDefault();
    try {
      if (!newAuto.template_subject.trim()) {
        setError("Automation template subject is required.");
        return;
      }
      const payload = {
        ...newAuto,
        campaign_id: newAuto.campaign_id ? Number(newAuto.campaign_id) : null,
        delay_minutes: Number(newAuto.delay_minutes || 0)
      };
      const res = await api.post("/marketing/automations", payload);
      if (res.data?.success) {
        setSuccessMsg("Lead nurturing automation rule created successfully!");
        setShowAutoModal(false);
        setNewAuto({ campaign_id: "", trigger_event: "Lead_Created", channel: "WhatsApp", template_subject: "", template_body: "", delay_minutes: "0" });
        fetchMarketingData();
        setTimeout(() => setSuccessMsg(""), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create automation rule.");
    }
  };

  const handleToggleAutomation = async (id) => {
    try {
      const res = await api.put(`/marketing/automations/${id}/toggle`);
      if (res.data?.success) {
        setAutomations((prev) =>
          prev.map((a) => (a.id === id ? { ...a, is_active: !a.is_active } : a))
        );
        setSuccessMsg("Automation rule status toggled.");
        setTimeout(() => setSuccessMsg(""), 2500);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to toggle automation status.");
    }
  };

  const handleDeleteAutomation = async (id) => {
    try {
      const res = await api.delete(`/marketing/automations/${id}`);
      if (res.data?.success) {
        setAutomations((prev) => prev.filter((a) => a.id !== id));
        setSuccessMsg("Automation rule deleted.");
        setTimeout(() => setSuccessMsg(""), 2500);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete automation rule.");
    }
  };

  return (
    <div className="enterprise-module-container">
      <div className="module-header-row">
        <div>
          <h2>📢 Marketing Automation & Dynamic Showcase</h2>
          <p className="subtitle">Omni-channel marketing campaigns, cost-per-lead tracking, ROI analytics & dynamic single-property landing page generator.</p>
        </div>
        <div className="module-header-actions">
          <button type="button" className="btn-secondary" onClick={() => setShowAutoModal(true)}>
            + New Automation Rule
          </button>
          <button type="button" className="btn-secondary" onClick={() => setShowLpModal(true)}>
            + Create Landing Page
          </button>
          <button type="button" className="btn-primary" onClick={() => setShowCampModal(true)}>
            + Launch New Campaign
          </button>
        </div>
      </div>

      {error && <div className="ent-alert ent-alert-danger">{error}</div>}
      {successMsg && <div className="ent-alert ent-alert-success">{successMsg}</div>}

      <div className="ent-subtabs">
        <button
          type="button"
          className={`ent-subtab ${marketingTab === "campaigns" ? "active" : ""}`}
          onClick={() => handleTabChange("campaigns")}
        >
          🚀 Active Campaigns ({campaigns.length})
        </button>
        <button
          type="button"
          className={`ent-subtab ${marketingTab === "landing_pages" ? "active" : ""}`}
          onClick={() => handleTabChange("landing_pages")}
        >
          🌐 Dynamic Landing Pages ({landingPages.length})
        </button>
        <button
          type="button"
          className={`ent-subtab ${marketingTab === "automations" ? "active" : ""}`}
          onClick={() => handleTabChange("automations")}
        >
          🤖 Lead Nurturing Automations ({automations.length})
        </button>
      </div>

      {loading ? (
        <div className="ent-loading-state">Loading Marketing Automation Data...</div>
      ) : (
        <>
          {/* TAB 1: CAMPAIGNS */}
          {marketingTab === "campaigns" && (
            <div className="tab-content-area">
              <div className="ent-table-container">
                <table className="ent-table">
                  <thead>
                    <tr>
                      <th>Campaign</th>
                      <th>Channel</th>
                      <th>Budget (₹)</th>
                      <th>Spent (₹)</th>
                      <th>Leads Generated</th>
                      <th>Cost / Lead</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.map((camp) => {
                      const leads = Number(camp.generated_leads ?? camp.leads_generated ?? 0);
                      const spent = Number(camp.spent || 0);
                      const cpl = leads > 0 ? Math.round(spent / leads) : "-";
                      return (
                        <tr key={camp.id}>
                          <td><strong>{camp.name}</strong></td>
                          <td><span className="badge-pill">{camp.campaign_type}</span></td>
                          <td>₹{Number(camp.budget).toLocaleString("en-IN")}</td>
                          <td>₹{spent.toLocaleString("en-IN")}</td>
                          <td><strong>{leads} Leads</strong></td>
                          <td>{cpl !== "-" ? `₹${cpl}` : "N/A"}</td>
                          <td>
                            <span className={`badge-status status-${(camp.status || 'Active').toLowerCase()}`}>
                              {camp.status || "Active"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {campaigns.length === 0 && (
                      <tr>
                        <td colSpan="7" className="empty-row">No active marketing campaigns running.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: DYNAMIC LANDING PAGES */}
          {marketingTab === "landing_pages" && (
            <div className="tab-content-area">
              <div className="landing-page-grid">
                {landingPages.map((lp) => (
                  <div key={lp.id} className="lp-card">
                    <div className="lp-header">
                      <strong>{lp.title}</strong>
                      <span className="badge-pill">Published</span>
                    </div>
                    <p className="lp-tagline">"{lp.hero_tagline || "Exclusive property showcase"}"</p>
                    <div className="lp-meta">
                      <span>Property ID: #{lp.property_id}</span>
                      <span>Views: {lp.views_count || 0}</span>
                      <span>Leads: {lp.inquiries_count || 0}</span>
                    </div>
                    <div className="lp-url-box">
                      <code>https://estateelite.com/p/{lp.slug}</code>
                    </div>
                  </div>
                ))}
                {landingPages.length === 0 && (
                  <div className="empty-state">No dynamic landing pages published yet.</div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: LEAD NURTURING AUTOMATIONS */}
          {marketingTab === "automations" && (
            <div className="tab-content-area">
              <div className="ent-table-container">
                <table className="ent-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Template Subject & Body</th>
                      <th>Trigger Event</th>
                      <th>Channel</th>
                      <th>Delay</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {automations.map((auto) => (
                      <tr key={auto.id}>
                        <td>#{auto.id}</td>
                        <td>
                          <strong>{auto.template_subject}</strong>
                          {auto.template_body && (
                            <div className="sub-text">{auto.template_body}</div>
                          )}
                          {auto.campaign_name && (
                            <span className="badge-pill" style={{ marginTop: "4px", display: "inline-block" }}>
                              Campaign: {auto.campaign_name}
                            </span>
                          )}
                        </td>
                        <td>
                          <span className="badge-pill">{auto.trigger_event}</span>
                        </td>
                        <td>
                          <span className="badge-status status-active">{auto.channel}</span>
                        </td>
                        <td>
                          {auto.delay_minutes > 0 ? `${auto.delay_minutes} min` : "Immediate"}
                        </td>
                        <td>
                          <span className={`badge-status ${auto.is_active ? "status-active" : "status-overdue"}`}>
                            {auto.is_active ? "Active" : "Paused"}
                          </span>
                        </td>
                        <td>
                          <div className="action-button-group">
                            <button
                              type="button"
                              className="btn-sm btn-secondary-sm"
                              onClick={() => handleToggleAutomation(auto.id)}
                            >
                              {auto.is_active ? "Pause" : "Resume"}
                            </button>
                            <button
                              type="button"
                              className="btn-sm btn-outline-danger"
                              onClick={() => handleDeleteAutomation(auto.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {automations.length === 0 && (
                      <tr>
                        <td colSpan="7" className="empty-row">
                          No lead nurturing automation rules defined yet. Click "+ New Automation Rule" to automate client follow-ups.
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

      {/* Modal: Launch Campaign */}
      {showCampModal && (
        <div className="ent-modal-backdrop" onClick={() => setShowCampModal(false)}>
          <div className="ent-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🚀 Launch Marketing Campaign</h3>
              <button type="button" className="drawer-close" onClick={() => setShowCampModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateCampaign} className="modal-body-form">
              <div>
                <label>Campaign Title *</label>
                <input
                  type="text"
                  required
                  value={newCampaign.name}
                  onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                  placeholder="e.g. Surat Prime Luxury Launch"
                />
              </div>
              <div className="form-grid-2">
                <div>
                  <label>Channel / Medium</label>
                  <select
                    value={newCampaign.campaign_type}
                    onChange={(e) => setNewCampaign({ ...newCampaign, campaign_type: e.target.value })}
                  >
                    <option value="Social">Social Media (Meta / Instagram)</option>
                    <option value="Email">Email Drip Automation</option>
                    <option value="SMS">SMS / WhatsApp Broadcast</option>
                    <option value="Portal">Real Estate Portals</option>
                  </select>
                </div>
                <div>
                  <label>Total Budget (₹) *</label>
                  <input
                    type="number"
                    required
                    value={newCampaign.budget}
                    onChange={(e) => setNewCampaign({ ...newCampaign, budget: e.target.value })}
                    placeholder="50000"
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowCampModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Launch Campaign</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Landing Page */}
      {showLpModal && (
        <div className="ent-modal-backdrop" onClick={() => setShowLpModal(false)}>
          <div className="ent-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🌐 Publish Dynamic Property Landing Page</h3>
              <button type="button" className="drawer-close" onClick={() => setShowLpModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateLandingPage} className="modal-body-form">
              <div>
                <label>Landing Page Headline *</label>
                <input
                  type="text"
                  required
                  value={newLp.title}
                  onChange={(e) => setNewLp({ ...newLp, title: e.target.value })}
                  placeholder="e.g. The Grand Monarch Penthouse"
                />
              </div>
              <div>
                <label>Featured Property *</label>
                <select
                  required
                  value={newLp.property_id}
                  onChange={(e) => setNewLp({ ...newLp, property_id: e.target.value })}
                >
                  <option value="">-- Select Property --</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      #{p.id} - {p.title} ({p.city})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label>Hero Tagline</label>
                <input
                  type="text"
                  value={newLp.hero_tagline}
                  onChange={(e) => setNewLp({ ...newLp, hero_tagline: e.target.value })}
                  placeholder="e.g. Unrivaled luxury meets architectural perfection."
                />
              </div>
              <div>
                <label>Custom Showcase Copy</label>
                <textarea
                  rows="3"
                  value={newLp.custom_content}
                  onChange={(e) => setNewLp({ ...newLp, custom_content: e.target.value })}
                  placeholder="Highlights: Infinity pool, private elevator, imported marble..."
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowLpModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Generate & Publish Slug</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Automation Rule */}
      {showAutoModal && (
        <div className="ent-modal-backdrop" onClick={() => setShowAutoModal(false)}>
          <div className="ent-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🤖 Create Lead Nurturing Automation</h3>
              <button type="button" className="drawer-close" onClick={() => setShowAutoModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateAutomation} className="modal-body-form">
              <div>
                <label>Automation Headline / Subject *</label>
                <input
                  type="text"
                  required
                  value={newAuto.template_subject}
                  onChange={(e) => setNewAuto({ ...newAuto, template_subject: e.target.value })}
                  placeholder="e.g. Welcome & Brochure Delivery"
                />
              </div>
              <div className="form-grid-2">
                <div>
                  <label>Trigger Event *</label>
                  <select
                    value={newAuto.trigger_event}
                    onChange={(e) => setNewAuto({ ...newAuto, trigger_event: e.target.value })}
                  >
                    <option value="Lead_Created">New Lead Ingested</option>
                    <option value="Tour_Requested">Property Tour Scheduled</option>
                    <option value="Offer_Submitted">Offer / Token Submitted</option>
                    <option value="Milestone_Updated">Milestone Status Advanced</option>
                  </select>
                </div>
                <div>
                  <label>Delivery Channel *</label>
                  <select
                    value={newAuto.channel}
                    onChange={(e) => setNewAuto({ ...newAuto, channel: e.target.value })}
                  >
                    <option value="WhatsApp">WhatsApp Message</option>
                    <option value="Email">Automated Email</option>
                    <option value="SMS">Direct SMS Alert</option>
                  </select>
                </div>
                <div>
                  <label>Execution Delay (Minutes)</label>
                  <input
                    type="number"
                    min="0"
                    value={newAuto.delay_minutes}
                    onChange={(e) => setNewAuto({ ...newAuto, delay_minutes: e.target.value })}
                    placeholder="0 = Instant"
                  />
                </div>
                <div>
                  <label>Linked Marketing Campaign</label>
                  <select
                    value={newAuto.campaign_id}
                    onChange={(e) => setNewAuto({ ...newAuto, campaign_id: e.target.value })}
                  >
                    <option value="">-- Standalone / General (No Campaign) --</option>
                    {campaigns.map((c) => (
                      <option key={c.id} value={c.id}>
                        #{c.id} - {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label>Message Content / Template Body</label>
                <textarea
                  rows="3"
                  value={newAuto.template_body}
                  onChange={(e) => setNewAuto({ ...newAuto, template_body: e.target.value })}
                  placeholder="Hi {{lead_name}}, thank you for inquiring about {{property_title}}. Our advisor will reach out shortly..."
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowAutoModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Create Automation Rule</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
