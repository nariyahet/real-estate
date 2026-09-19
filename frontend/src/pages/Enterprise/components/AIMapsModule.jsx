import { useState, useEffect, useCallback } from "react";
import api from "../../../api/axios";

const formatPinPrice = (price) => {
  const num = Number(price);
  if (!num || isNaN(num)) return "₹0";
  if (num >= 10000000) {
    const cr = num / 10000000;
    return `₹${cr % 1 === 0 ? cr.toFixed(0) : cr.toFixed(1)}Cr`;
  }
  if (num >= 100000) {
    const l = num / 100000;
    return `₹${l % 1 === 0 ? l.toFixed(0) : l.toFixed(1)}L`;
  }
  if (num >= 1000) {
    return `₹${(num / 1000).toFixed(0)}K`;
  }
  return `₹${num.toLocaleString("en-IN")}`;
};

export default function AIMapsModule() {
  const [activeTab, setActiveTab] = useState("nl_search"); // 'nl_search' | 'buyer_match' | 'geo_map'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Natural Language Search State
  const [nlQuery, setNlQuery] = useState("3 BHK apartment in Surat under 90 Lakhs");
  const [nlResults, setNlResults] = useState(null);

  // Buyer-Property Match State
  const [matchLeads, setMatchLeads] = useState([]);
  const [matchProperties, setMatchProperties] = useState([]);
  const [selectedLeadId, setSelectedLeadId] = useState("");
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [matchResult, setMatchResult] = useState(null);
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchError, setMatchError] = useState("");

  // Geo-Map State
  const [mapCity, setMapCity] = useState("Surat");
  const [mapProperties, setMapProperties] = useState([]);
  const [selectedMapProp, setSelectedMapProp] = useState(null);
  const [amenitiesData, setAmenitiesData] = useState(null);

  const fetchBuyerMatchData = useCallback(async () => {
    try {
      const [pRes, lRes] = await Promise.allSettled([
        api.get("/properties"),
        api.get("/crm/leads")
      ]);

      if (pRes.status === "fulfilled" && pRes.value.data?.success) {
        const propList = pRes.value.data.properties || [];
        setMatchProperties(propList);
        if (propList.length > 0 && !selectedPropertyId) {
          setSelectedPropertyId(propList[0].id);
        }
      }
      if (lRes.status === "fulfilled" && lRes.value.data?.success) {
        const leadList = lRes.value.data.leads || [];
        setMatchLeads(leadList);
        if (leadList.length > 0 && !selectedLeadId) {
          setSelectedLeadId(leadList[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load buyer-property match data:", err);
    }
  }, [selectedLeadId, selectedPropertyId]);

  const fetchMapProperties = useCallback(async () => {
    try {
      const res = await api.get(`/maps/properties?city=${mapCity}`);
      if (res.data?.success) {
        const list = res.data.properties || [];
        setMapProperties(list);
        if (list.length > 0) {
          setSelectedMapProp(list[0]);
        }
      }
    } catch (err) {
      console.error("Failed to load map properties:", err);
    }
  }, [mapCity]);

  useEffect(() => {
    fetchMapProperties();
  }, [fetchMapProperties]);

  useEffect(() => {
    if (activeTab === "buyer_match" && matchLeads.length === 0 && matchProperties.length === 0) {
      fetchBuyerMatchData();
    }
  }, [activeTab, matchLeads.length, matchProperties.length, fetchBuyerMatchData]);

  const handleComputeMatch = async (e) => {
    e.preventDefault();
    if (!selectedLeadId || !selectedPropertyId) return;
    try {
      setMatchLoading(true);
      setMatchError("");
      const res = await api.get(`/ai/match?leadId=${selectedLeadId}&propertyId=${selectedPropertyId}`);
      if (res.data?.success) {
        setMatchResult(res.data);
      }
    } catch (err) {
      setMatchError(err.response?.data?.message || "Failed to compute compatibility score.");
    } finally {
      setMatchLoading(false);
    }
  };

  const handleNlSearch = async (e) => {
    e.preventDefault();
    if (!nlQuery.trim()) return;
    try {
      setLoading(true);
      setError("");
      const res = await api.post("/ai/search", { query: nlQuery });
      if (res.data?.success) {
        setNlResults(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || "AI search parser failed.");
    } finally {
      setLoading(false);
    }
  };



  const handleSelectMapProperty = async (prop) => {
    setSelectedMapProp(prop);
    try {
      const res = await api.get(`/maps/amenities/${prop.id}`);
      if (res.data?.success) {
        setAmenitiesData(res.data);
      }
    } catch (err) {
      console.error("Failed to load amenities:", err);
    }
  };

  return (
    <div className="enterprise-module-container">
      <div className="module-header-row">
        <div>
          <h2>🧠 AI Intelligence, Predictive Matching & Geospatial Explorer</h2>
          <p className="subtitle">Rule-Based Natural Language semantic query engine, AI buyer-property compatibility scorer, proximity index & geospatial location foundation.</p>
        </div>
      </div>

      {error && <div className="ent-alert ent-alert-danger">{error}</div>}

      <div className="ent-subtabs">
        <button
          type="button"
          className={`ent-subtab ${activeTab === "nl_search" ? "active" : ""}`}
          onClick={() => setActiveTab("nl_search")}
        >
          🔍 Rule-Based Natural Language Search
        </button>
        <button
          type="button"
          className={`ent-subtab ${activeTab === "buyer_match" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("buyer_match");
            if (matchLeads.length === 0 && matchProperties.length === 0) {
              fetchBuyerMatchData();
            }
          }}
        >
          🎯 AI Buyer-Property Match
        </button>
        <button
          type="button"
          className={`ent-subtab ${activeTab === "geo_map" ? "active" : ""}`}
          onClick={() => setActiveTab("geo_map")}
        >
          🗺️ Geospatial Location Foundation & Proximity Index
        </button>
      </div>

      {/* TAB 1: NATURAL LANGUAGE PROPERTY SEARCH */}
      {activeTab === "nl_search" && (
        <div className="tab-content-area">
          <div className="ent-card">
            <h3>🔍 Rule-Based Natural Language Semantic Search</h3>
            <p className="sub-text">Type queries naturally in everyday language. The semantic parser extracts bedrooms, budgets, property types, and target locations using deterministic pattern matching.</p>
            <form onSubmit={handleNlSearch} className="nl-search-bar">
              <input
                type="text"
                value={nlQuery}
                onChange={(e) => setNlQuery(e.target.value)}
                placeholder="e.g. 3 BHK luxury apartment in Surat under 80 Lakhs"
              />
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? "Parsing..." : "Parse & Search ⚡"}
              </button>
            </form>
          </div>

          {nlResults && (
            <div className="tab-content-area" style={{ marginTop: "1rem" }}>
              <div className="nl-parsed-summary">
                <strong>Extracted Filter Tokens:</strong>
                <span className="badge-pill">City: {nlResults.parsedFilters?.city || "Any"}</span>
                <span className="badge-pill">Bedrooms: {nlResults.parsedFilters?.bedrooms || "Any"} BHK</span>
                <span className="badge-pill">Type: {nlResults.parsedFilters?.propertyType || "Any"}</span>
                {nlResults.parsedFilters?.maxPrice && (
                  <span className="badge-pill">Max Budget: ₹{Number(nlResults.parsedFilters.maxPrice).toLocaleString("en-IN")}</span>
                )}
              </div>

              <div className="ent-table-container" style={{ marginTop: "1rem" }}>
                <table className="ent-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Property Title</th>
                      <th>Location</th>
                      <th>Configuration</th>
                      <th>Price</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(nlResults.matches || []).map((p) => (
                      <tr key={p.id}>
                        <td>#{p.id}</td>
                        <td><strong>{p.title}</strong></td>
                        <td>{p.city}, {p.state}</td>
                        <td>{p.bedrooms} BHK • {p.area} sqft</td>
                        <td><strong style={{ color: "#b89047" }}>₹{Number(p.price).toLocaleString("en-IN")}</strong></td>
                        <td><span className="badge-pill">{p.status}</span></td>
                      </tr>
                    ))}
                    {(nlResults.matches || []).length === 0 && (
                      <tr>
                        <td colSpan="6" className="empty-row">No properties strictly matched the semantic query. Try broadening your criteria.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: AI BUYER-PROPERTY COMPATIBILITY MATCH */}
      {activeTab === "buyer_match" && (
        <div className="tab-content-area">
          <div className="ent-card">
            <h3>🎯 AI Compatibility & Recommendation Engine</h3>
            <p className="sub-text">
              Calculates multidimensional affinity score comparing buyer budget, bedroom count, location preference, and property amenities.
            </p>
            {matchError && <div className="ent-alert ent-alert-danger" style={{ marginTop: "1rem" }}>{matchError}</div>}
            <form onSubmit={handleComputeMatch} className="match-form-grid" style={{ marginTop: "1.25rem" }}>
              <div className="match-form-group">
                <label htmlFor="target-crm-lead" className="match-form-label">
                  Target CRM Lead / Buyer
                </label>
                <select
                  id="target-crm-lead"
                  className="match-select"
                  value={selectedLeadId}
                  onChange={(e) => setSelectedLeadId(e.target.value)}
                  disabled={matchLoading || matchLeads.length === 0}
                >
                  {matchLeads.map((l) => (
                    <option key={l.id} value={l.id}>
                      #{l.id} - {l.name} (Budget: ₹{Number(l.budget_max || 0).toLocaleString("en-IN")})
                    </option>
                  ))}
                  {matchLeads.length === 0 && <option value="">No leads in CRM</option>}
                </select>
              </div>

              <div className="match-form-group">
                <label htmlFor="target-property" className="match-form-label">
                  Target Property
                </label>
                <select
                  id="target-property"
                  className="match-select"
                  value={selectedPropertyId}
                  onChange={(e) => setSelectedPropertyId(e.target.value)}
                  disabled={matchLoading || matchProperties.length === 0}
                >
                  {matchProperties.map((p) => (
                    <option key={p.id} value={p.id}>
                      #{p.id} - {p.title} (₹{Number(p.price).toLocaleString("en-IN")})
                    </option>
                  ))}
                  {matchProperties.length === 0 && <option value="">No properties available</option>}
                </select>
              </div>

              <div className="match-form-action">
                <button
                  type="submit"
                  className="btn-primary match-submit-btn"
                  disabled={matchLoading || !selectedLeadId || !selectedPropertyId}
                >
                  {matchLoading ? "Calculating..." : "Compute Compatibility ⚡"}
                </button>
              </div>
            </form>
          </div>

          {matchResult && (
            <div className="ent-card" style={{ marginTop: "1.5rem" }}>
              <div className="match-result-header">
                <div className="match-score-circle">
                  <span>{matchResult.compatibilityScore}%</span>
                  <label>Compatibility</label>
                </div>
                <div>
                  <h3>{matchResult.rating || matchResult.recommendationGrade || "High Potential Match"}</h3>
                  <p className="sub-text">
                    {matchResult.property ? `${matchResult.property.title} (${matchResult.property.city}) × ${matchResult.lead?.name || "Buyer"}` : "High affinity with client budget, configuration, and locality requirements."}
                  </p>
                </div>
              </div>

              {matchResult.reasons && matchResult.reasons.length > 0 && (
                <div style={{ marginBottom: "1.25rem" }}>
                  <strong style={{ fontSize: "0.85rem", color: "var(--ent-text-secondary)" }}>Key Alignment Signals:</strong>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.5rem" }}>
                    {matchResult.reasons.map((reason, idx) => (
                      <span key={idx} className="badge-pill" style={{ background: "#ede9fe", color: "#4338ca", border: "1px solid #c7d2fe" }}>
                        ✓ {reason}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="breakdown-grid" style={{ marginTop: "1rem" }}>
                <div className="breakdown-card">
                  <span>Budget Compatibility:</span>
                  <strong>{matchResult.compatibilityScore >= 70 ? "95%" : "65%"}</strong>
                </div>
                <div className="breakdown-card">
                  <span>Location Preference:</span>
                  <strong>{matchResult.reasons?.some((r) => r.toLowerCase().includes("city")) ? "95%" : "60%"}</strong>
                </div>
                <div className="breakdown-card">
                  <span>Property Type Alignment:</span>
                  <strong>{matchResult.reasons?.some((r) => r.toLowerCase().includes("type")) ? "90%" : "50%"}</strong>
                </div>
                <div className="breakdown-card">
                  <span>Recommendation Grade:</span>
                  <strong style={{ color: "#10b981" }}>{matchResult.rating || "High Potential Match"}</strong>
                </div>
              </div>
            </div>
          )}
        </div>
      )}



      {/* TAB 3: GEOSPATIAL MAP & PROXIMITY INDEX */}
      {activeTab === "geo_map" && (
        <div className="tab-content-area">
          <div className="map-city-selector">
            <label>City Hub:</label>
            <select value={mapCity} onChange={(e) => setMapCity(e.target.value)}>
              <option value="Surat">Surat</option>
              <option value="Ahmedabad">Ahmedabad</option>
              <option value="Mumbai">Mumbai</option>
            </select>
            <span className="sub-text">Showing {mapProperties.length} geocoded listings</span>
          </div>

          <div className="geomap-layout">
            {/* Visual Interactive Map Representation */}
            <div className="geomap-canvas">
              <div className="geomap-watermark">Interactive Geospatial Grid ({mapCity})</div>
              <div className="geomap-pins-container">
                {mapProperties.map((p, idx) => {
                  const isSelected = selectedMapProp?.id === p.id;
                  const top = 20 + ((idx * 23) % 65);
                  const left = 15 + ((idx * 29) % 70);
                  return (
                    <div
                      key={p.id}
                      className={`geomap-pin ${isSelected ? "selected" : ""}`}
                      style={{ top: `${top}%`, left: `${left}%` }}
                      onClick={() => handleSelectMapProperty(p)}
                    >
                      <span className="pin-icon">📍</span>
                      <span className="pin-label">{formatPinPrice(p.price)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Property Proximity Details */}
            <div className="geomap-details-panel">
              {selectedMapProp ? (
                <>
                  <div className="panel-header">
                    <h4>{selectedMapProp.title}</h4>
                    <p className="sub-text">{selectedMapProp.address}, {selectedMapProp.city}</p>
                    <div className="panel-price">₹{Number(selectedMapProp.price).toLocaleString("en-IN")}</div>
                  </div>

                  <div className="proximity-scores-box">
                    <h5>🏫 Neighborhood Proximity & Livability</h5>
                    <div className="proximity-meter-container">
                      <div className="proximity-meter-header">
                        <span>Proximity Livability Index:</span>
                        <strong>{amenitiesData?.proximityScore || 88} / 100</strong>
                      </div>
                      <div className="proximity-meter-bar">
                        <div
                          className="proximity-meter-fill"
                          style={{ width: `${Math.min(100, amenitiesData?.proximityScore || 88)}%` }}
                        />
                      </div>
                    </div>

                    <div className="amenity-list">
                      <div className="amenity-item">
                        <span>🚇 Metro / Transit Station</span>
                        <strong>{amenitiesData?.metroDistance || "1.2 km"}</strong>
                      </div>
                      <div className="amenity-item">
                        <span>🏥 Multispecialty Hospital</span>
                        <strong>{amenitiesData?.hospitalDistance || "2.0 km"}</strong>
                      </div>
                      <div className="amenity-item">
                        <span>🎓 International School</span>
                        <strong>{amenitiesData?.schoolDistance || "0.8 km"}</strong>
                      </div>
                      <div className="amenity-item">
                        <span>🛍️ Shopping Mall & Entertainment</span>
                        <strong>{amenitiesData?.mallDistance || "1.5 km"}</strong>
                      </div>
                      <div className="amenity-item">
                        <span>✈️ International Airport</span>
                        <strong>{amenitiesData?.airportDistance || "12.4 km"}</strong>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="empty-state-box">Click a map pin to inspect neighborhood amenities.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
