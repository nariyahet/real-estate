import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../../../api/axios";

export default function LegalGovernanceModule() {
  const [searchParams, setSearchParams] = useSearchParams();
  const subParam = searchParams.get("sub");
  const [activeTab, setActiveTab] = useState(subParam || "agreements"); // 'agreements' | 'apikeys' | 'organization'

  useEffect(() => {
    const sub = searchParams.get("sub");
    if (sub && sub !== activeTab) {
      setActiveTab(sub);
    }
  }, [searchParams, activeTab]);

  const handleTabChange = (key) => {
    setActiveTab(key);
    const newParams = new URLSearchParams(searchParams);
    newParams.set("tab", "governance");
    newParams.set("sub", key);
    setSearchParams(newParams);
  };
  const [agreements, setAgreements] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [deals, setDeals] = useState([]);
  const [apiKeys, setApiKeys] = useState([]);
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Create Agreement Modal
  const [showAgreementModal, setShowAgreementModal] = useState(false);
  const [newAgreement, setNewAgreement] = useState({
    deal_id: "",
    template_id: 1,
    agreement_title: ""
  });

  // Create API Key Modal
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [newKeyLabel, setNewKeyLabel] = useState("");
  const [generatedKey, setGeneratedKey] = useState(null);

  const fetchLegalGovernanceData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [agrRes, tempRes, dealsRes, keysRes, orgRes] = await Promise.allSettled([
        api.get("/legal/agreements"),
        api.get("/legal/templates"),
        api.get("/deals/deals"),
        api.get("/integrations/keys"),
        api.get("/platform/organization")
      ]);

      if (agrRes.status === "fulfilled" && agrRes.value.data?.success) {
        setAgreements(agrRes.value.data.agreements || []);
      }
      if (tempRes.status === "fulfilled" && tempRes.value.data?.success) {
        setTemplates(tempRes.value.data.templates || []);
      }
      if (dealsRes.status === "fulfilled" && dealsRes.value.data?.success) {
        setDeals(dealsRes.value.data.deals || []);
      }
      if (keysRes.status === "fulfilled" && keysRes.value.data?.success) {
        setApiKeys(keysRes.value.data.keys || []);
      }
      if (orgRes.status === "fulfilled" && orgRes.value.data?.success) {
        setOrganization(orgRes.value.data.organization);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load legal and governance data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLegalGovernanceData();
  }, [fetchLegalGovernanceData]);

  const handleGenerateAgreement = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        deal_id: Number(newAgreement.deal_id),
        template_id: Number(newAgreement.template_id),
        agreement_title: newAgreement.agreement_title
      };
      const res = await api.post("/legal/agreements/generate", payload);
      if (res.data?.success) {
        setSuccessMsg(`Agreement #${res.data.agreementId} generated with merged contract clauses!`);
        setShowAgreementModal(false);
        setNewAgreement({ deal_id: "", template_id: 1, agreement_title: "" });
        fetchLegalGovernanceData();
        setTimeout(() => setSuccessMsg(""), 4000);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to generate legal agreement.");
    }
  };

  const handleSignAgreement = async (agreementId, party) => {
    try {
      const res = await api.put(`/legal/agreements/${agreementId}/sign`, { party });
      if (res.data?.success) {
        setAgreements((prev) =>
          prev.map((a) =>
            a.id === agreementId
              ? {
                  ...a,
                  [party === "Buyer" ? "buyer_signed_at" : "seller_signed_at"]: new Date().toISOString(),
                  status: party === "Seller" && a.buyer_signed_at ? "Executed" : `${party} Signed`
                }
              : a
          )
        );
        setSuccessMsg(`Cryptographic signature recorded for ${party}!`);
        setTimeout(() => setSuccessMsg(""), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to sign agreement.");
    }
  };

  const handleGenerateApiKey = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/integrations/keys", { key_label: newKeyLabel });
      if (res.data?.success) {
        setGeneratedKey(res.data.apiKey);
        setNewKeyLabel("");
        fetchLegalGovernanceData();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to generate API Key.");
    }
  };

  return (
    <div className="enterprise-module-container">
      <div className="module-header-row">
        <div>
          <h2>⚖️ Legal Contracts, Developer APIs & Platform Governance</h2>
          <p className="subtitle">Automated sale agreement generation, multi-party cryptographic e-signatures, developer API tokens & organization settings.</p>
        </div>
        <div className="module-header-actions">
          <button type="button" className="btn-secondary" onClick={() => setShowKeyModal(true)}>
            + Generate API Token
          </button>
          <button type="button" className="btn-primary" onClick={() => setShowAgreementModal(true)}>
            + Generate Contract
          </button>
        </div>
      </div>

      {error && <div className="ent-alert ent-alert-danger">{error}</div>}
      {successMsg && <div className="ent-alert ent-alert-success">{successMsg}</div>}

      <div className="ent-subtabs">
        <button
          type="button"
          className={`ent-subtab ${activeTab === "agreements" ? "active" : ""}`}
          onClick={() => handleTabChange("agreements")}
        >
          📜 Legal Contracts & E-Signs ({agreements.length})
        </button>
        <button
          type="button"
          className={`ent-subtab ${activeTab === "apikeys" ? "active" : ""}`}
          onClick={() => handleTabChange("apikeys")}
        >
          🔑 Developer APIs & Webhooks ({apiKeys.length})
        </button>
        <button
          type="button"
          className={`ent-subtab ${activeTab === "organization" ? "active" : ""}`}
          onClick={() => handleTabChange("organization")}
        >
          🏢 Organization Profile
        </button>
      </div>

      {loading ? (
        <div className="ent-loading-state">Loading Platform & Governance Data...</div>
      ) : (
        <>
          {/* TAB 1: AGREEMENTS & E-SIGN */}
          {activeTab === "agreements" && (
            <div className="tab-content-area">
              <div className="ent-table-container">
                <table className="ent-table">
                  <thead>
                    <tr>
                      <th>Agreement ID</th>
                      <th>Contract Title</th>
                      <th>Deal Ref</th>
                      <th>Buyer E-Sign</th>
                      <th>Seller E-Sign</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agreements.map((agr) => (
                      <tr key={agr.id}>
                        <td>#{agr.id}</td>
                        <td>
                          <strong>{agr.agreement_title}</strong>
                          <div className="sub-text">Template: {agr.template_type || "Sale Deed"}</div>
                        </td>
                        <td>Deal #{agr.deal_id}</td>
                        <td>
                          {agr.buyer_signed_at ? (
                            <span className="badge-pill" style={{ background: "#d1fae5", color: "#065f46" }}>
                              ✔ Signed {new Date(agr.buyer_signed_at).toLocaleDateString("en-IN")}
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="btn-sm btn-outline-primary"
                              onClick={() => handleSignAgreement(agr.id, "Buyer")}
                            >
                              ✍️ Sign as Buyer
                            </button>
                          )}
                        </td>
                        <td>
                          {agr.seller_signed_at ? (
                            <span className="badge-pill" style={{ background: "#d1fae5", color: "#065f46" }}>
                              ✔ Signed {new Date(agr.seller_signed_at).toLocaleDateString("en-IN")}
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="btn-sm btn-outline-primary"
                              onClick={() => handleSignAgreement(agr.id, "Seller")}
                            >
                              ✍️ Sign as Seller
                            </button>
                          )}
                        </td>
                        <td>
                          <span className={`badge-status status-${(agr.status || 'Draft').toLowerCase().replace(/\s+/g, '-')}`}>
                            {agr.status || "Draft"}
                          </span>
                        </td>
                        <td>
                          <span className="text-muted">Encrypted PDF ✔</span>
                        </td>
                      </tr>
                    ))}
                    {agreements.length === 0 && (
                      <tr>
                        <td colSpan="7" className="empty-row">No legal agreements drafted yet. Click "+ Generate Contract" to start.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: DEVELOPER API KEYS & WEBHOOKS */}
          {activeTab === "apikeys" && (
            <div className="tab-content-area">
              <div className="ent-card">
                <h3>🔌 Enterprise Developer API Gateway</h3>
                <p className="sub-text">Secure Bearer API Keys for external integrations (CRM sync, PropTech aggregators, banking escrow webhooks).</p>
                <div className="ent-table-container" style={{ marginTop: "1rem" }}>
                  <table className="ent-table">
                    <thead>
                      <tr>
                        <th>Key Label</th>
                        <th>API Prefix Token</th>
                        <th>Scope</th>
                        <th>Created At</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {apiKeys.map((k) => (
                        <tr key={k.id}>
                          <td><strong>{k.key_label || "Production Key"}</strong></td>
                          <td><code>{k.api_key_prefix}••••••••••••••••</code></td>
                          <td><span className="badge-pill">{k.scope || "read,write"}</span></td>
                          <td>{new Date(k.created_at).toLocaleDateString("en-IN")}</td>
                          <td><span className="badge-status status-active">Active</span></td>
                        </tr>
                      ))}
                      {apiKeys.length === 0 && (
                        <tr>
                          <td colSpan="5" className="empty-row">No API keys generated.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ORGANIZATION PROFILE */}
          {activeTab === "organization" && organization && (
            <div className="tab-content-area">
              <div className="ent-card">
                <h3>🏢 Enterprise Legal Entity Profile</h3>
                <div className="form-grid-2" style={{ marginTop: "1.5rem" }}>
                  <div>
                    <label>Enterprise Entity Name</label>
                    <input type="text" readOnly value={organization.name || "EstateElite Enterprises Ltd."} />
                  </div>
                  <div>
                    <label>Corporate Tax Registration / GSTIN</label>
                    <input type="text" readOnly value={organization.tax_id || "24ABCDE1234F1Z5"} />
                  </div>
                  <div>
                    <label>Corporate Headquarters</label>
                    <input type="text" readOnly value={organization.address || "Ring Road Financial District"} />
                  </div>
                  <div>
                    <label>Headquarters City & State</label>
                    <input type="text" readOnly value={`${organization.city || "Surat"}, ${organization.state || "Gujarat"}`} />
                  </div>
                  <div>
                    <label>Enterprise Support Email</label>
                    <input type="text" readOnly value={organization.support_email || "support@estateelite.com"} />
                  </div>
                  <div>
                    <label>Enterprise Support Phone</label>
                    <input type="text" readOnly value={organization.support_phone || "+91 (0261) 2500000"} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal: Generate Agreement */}
      {showAgreementModal && (
        <div className="ent-modal-backdrop" onClick={() => setShowAgreementModal(false)}>
          <div className="ent-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📜 Generate Automated Legal Agreement</h3>
              <button type="button" className="drawer-close" onClick={() => setShowAgreementModal(false)}>✕</button>
            </div>
            <form onSubmit={handleGenerateAgreement} className="modal-body-form">
              <div>
                <label>Select Sales Deal *</label>
                <select
                  required
                  value={newAgreement.deal_id}
                  onChange={(e) => {
                    const dId = e.target.value;
                    const selDeal = deals.find((d) => d.id === Number(dId));
                    setNewAgreement({
                      ...newAgreement,
                      deal_id: dId,
                      agreement_title: selDeal ? `Sale Agreement - ${selDeal.deal_title}` : ""
                    });
                  }}
                >
                  <option value="">-- Select Deal --</option>
                  {deals.map((d) => (
                    <option key={d.id} value={d.id}>
                      Deal #{d.id} - {d.deal_title} (₹{Number(d.agreed_price).toLocaleString("en-IN")})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label>Legal Agreement Title *</label>
                <input
                  type="text"
                  required
                  value={newAgreement.agreement_title}
                  onChange={(e) => setNewAgreement({ ...newAgreement, agreement_title: e.target.value })}
                  placeholder="e.g. Agreement for Sale of Residential Flat"
                />
              </div>

              <div>
                <label>Legal Template Standard</label>
                <select
                  value={newAgreement.template_id}
                  onChange={(e) => setNewAgreement({ ...newAgreement, template_id: e.target.value })}
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>{t.template_name} ({t.category})</option>
                  ))}
                  {templates.length === 0 && <option value="1">Standard RERA Sale Agreement</option>}
                </select>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowAgreementModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Generate Contract & Prepare E-Sign</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Generate API Key */}
      {showKeyModal && (
        <div className="ent-modal-backdrop" onClick={() => { setShowKeyModal(false); setGeneratedKey(null); }}>
          <div className="ent-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🔑 Generate Enterprise API Key</h3>
              <button type="button" className="drawer-close" onClick={() => { setShowKeyModal(false); setGeneratedKey(null); }}>✕</button>
            </div>

            {generatedKey ? (
              <div className="modal-body-form">
                <div className="ent-alert ent-alert-success">
                  <strong>API Key Generated!</strong> Copy this key now; it will not be displayed again.
                </div>
                <div className="api-key-display-box">
                  <code>{generatedKey}</code>
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn-primary" onClick={() => { setShowKeyModal(false); setGeneratedKey(null); }}>
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleGenerateApiKey} className="modal-body-form">
                <div>
                  <label>Key Identifier / Label *</label>
                  <input
                    type="text"
                    required
                    value={newKeyLabel}
                    onChange={(e) => setNewKeyLabel(e.target.value)}
                    placeholder="e.g. Production Mobile App Sync"
                  />
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn-secondary" onClick={() => setShowKeyModal(false)}>Cancel</button>
                  <button type="submit" className="btn-primary">Generate Key</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
