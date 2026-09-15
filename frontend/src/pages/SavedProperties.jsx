import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import "./SavedProperties.css";

function SavedProperties() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("saved");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Tab 1: Saved Properties
  const [savedList, setSavedList] = useState([]);
  const [editingNotesId, setEditingNotesId] = useState(null);
  const [notesInput, setNotesInput] = useState("");
  const [tagsInput, setTagsInput] = useState("");

  // Tab 2: Collections
  const [collections, setCollections] = useState([]);
  const [showCreateCol, setShowCreateCol] = useState(false);
  const [colName, setColName] = useState("");
  const [colDesc, setColDesc] = useState("");
  const [colColor, setColColor] = useState("#3b82f6");
  const [selectedCol, setSelectedCol] = useState(null);

  // Tab 3: Saved Searches
  const [savedSearches, setSavedSearches] = useState([]);

  // Modal for Adding Property to Collection
  const [addPropToColModal, setAddPropToColModal] = useState(null); // propertyId
  const [selectedColId, setSelectedColId] = useState("");

  const fetchSavedData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      if (activeTab === "saved") {
        const res = await api.get("/saved-properties");
        if (res.data?.success) {
          setSavedList(res.data.savedProperties || []);
        }
      } else if (activeTab === "collections") {
        const res = await api.get("/collections");
        if (res.data?.success) {
          setCollections(res.data.collections || []);
        }
      } else if (activeTab === "searches") {
        const res = await api.get("/saved-searches");
        if (res.data?.success) {
          setSavedSearches(res.data.searches || []);
        }
      }
    } catch (err) {
      console.error("Saved Data Fetch Error:", err);
      setError(err.response?.data?.message || "Failed to load saved items.");
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchSavedData();
  }, [fetchSavedData]);

  // Remove saved property
  const handleRemoveSaved = async (propertyId) => {
    try {
      const res = await api.delete(`/saved-properties/${propertyId}`);
      if (res.data?.success) {
        setSavedList((prev) => prev.filter((item) => item.property.id !== propertyId));
        setSuccessMsg("Property removed from saved list.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to remove property.");
    }
  };

  // Save notes & tags
  const handleSaveNotes = async (propertyId) => {
    try {
      const tagsArray = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
      const res = await api.put(`/saved-properties/${propertyId}/notes`, {
        personal_notes: notesInput,
        tags: tagsArray,
      });
      if (res.data?.success) {
        setSavedList((prev) =>
          prev.map((item) =>
            item.property.id === propertyId
              ? { ...item, personalNotes: notesInput, tags: tagsArray }
              : item
          )
        );
        setEditingNotesId(null);
        setSuccessMsg("Notes and tags updated.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update notes.");
    }
  };

  // Create Collection
  const handleCreateCollection = async (e) => {
    e.preventDefault();
    if (!colName.trim()) return;

    try {
      const res = await api.post("/collections", {
        name: colName.trim(),
        description: colDesc.trim(),
        color: colColor,
      });
      if (res.data?.success) {
        setSuccessMsg("Collection created successfully.");
        setShowCreateCol(false);
        setColName("");
        setColDesc("");
        fetchSavedData();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create collection.");
    }
  };

  // View Collection Details
  const handleViewCollection = async (collectionId) => {
    try {
      setLoading(true);
      const res = await api.get(`/collections/${collectionId}`);
      if (res.data?.success) {
        setSelectedCol(res.data.collection);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load collection details.");
    } finally {
      setLoading(false);
    }
  };

  // Delete Collection
  const handleDeleteCollection = async (collectionId) => {
    if (!window.confirm("Are you sure you want to delete this collection?")) return;
    try {
      const res = await api.delete(`/collections/${collectionId}`);
      if (res.data?.success) {
        setSelectedCol(null);
        setSuccessMsg("Collection deleted.");
        fetchSavedData();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete collection.");
    }
  };

  // Add Property to Collection
  const handleAddPropertyToCollection = async (e) => {
    e.preventDefault();
    if (!selectedColId || !addPropToColModal) return;

    try {
      const res = await api.post(`/collections/${selectedColId}/items`, {
        propertyId: addPropToColModal,
      });
      if (res.data?.success) {
        setSuccessMsg("Property added to collection!");
        setAddPropToColModal(null);
        setSelectedColId("");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add property to collection.");
    }
  };

  // Apply Search
  const handleApplySearch = (filters) => {
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    if (filters.property_type && filters.property_type !== "all") params.set("property_type", filters.property_type);
    if (filters.listing_type && filters.listing_type !== "all") params.set("listing_type", filters.listing_type);
    if (filters.city) params.set("city", filters.city);
    if (filters.min_price) params.set("min_price", filters.min_price);
    if (filters.max_price) params.set("max_price", filters.max_price);
    navigate(`/properties?${params.toString()}`);
  };

  // Delete Saved Search
  const handleDeleteSearch = async (searchId) => {
    try {
      const res = await api.delete(`/saved-searches/${searchId}`);
      if (res.data?.success) {
        setSavedSearches((prev) => prev.filter((s) => s.id !== searchId));
        setSuccessMsg("Saved search deleted.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete search.");
    }
  };

  return (
    <div className="saved-page-container">
      <div className="saved-page-header">
        <h1 className="saved-page-title">Saved Workspace</h1>
        <p className="saved-page-subtitle">
          Manage your favorited properties, curated collections, and saved search filters
        </p>
      </div>

      {/* Tabs */}
      <div className="saved-tabs-bar">
        <button
          type="button"
          className={`saved-tab-button ${activeTab === "saved" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("saved");
            setSelectedCol(null);
          }}
        >
          ❤️ Saved Properties
          <span className="saved-badge-count">{savedList.length}</span>
        </button>

        <button
          type="button"
          className={`saved-tab-button ${activeTab === "collections" ? "active" : ""}`}
          onClick={() => setActiveTab("collections")}
        >
          📁 Collections
          <span className="saved-badge-count">{collections.length}</span>
        </button>

        <button
          type="button"
          className={`saved-tab-button ${activeTab === "searches" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("searches");
            setSelectedCol(null);
          }}
        >
          🔎 Saved Searches
          <span className="saved-badge-count">{savedSearches.length}</span>
        </button>
      </div>

      {error && <div className="ops-alert ops-alert-error" style={{ marginBottom: "20px" }}>⚠️ {error}</div>}
      {successMsg && <div className="ops-alert ops-alert-success" style={{ marginBottom: "20px" }}>✅ {successMsg}</div>}

      {/* TAB 1: SAVED PROPERTIES */}
      {activeTab === "saved" && (
        <div>
          {loading ? (
            <div style={{ textAlign: "center", padding: "48px" }}>Loading saved properties...</div>
          ) : savedList.length === 0 ? (
            <div className="saved-empty-state">
              <div className="saved-empty-icon">💔</div>
              <h3 className="saved-empty-title">No Saved Properties Yet</h3>
              <p className="saved-empty-desc">
                Browse our real estate catalogue and click the save button on any property to bookmark it here for fast access.
              </p>
              <Link to="/properties" className="saved-view-btn" style={{ display: "inline-block", width: "auto", padding: "10px 24px" }}>
                Browse Properties
              </Link>
            </div>
          ) : (
            <div className="saved-grid">
              {savedList.map((item) => {
                const p = item.property;
                const isEditing = editingNotesId === p.id;

                return (
                  <div key={p.id} className="saved-card">
                    <div className="saved-card-img-wrap">
                      <img
                        src={p.image || "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800"}
                        alt={p.title}
                        className="saved-card-img"
                      />
                      <span className="saved-card-badge">{p.property_type}</span>
                      <button
                        type="button"
                        className="saved-card-remove-btn"
                        onClick={() => handleRemoveSaved(p.id)}
                        title="Remove from saved"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="saved-card-body">
                      <div className="saved-card-price">
                        ₹{Number(p.price).toLocaleString("en-IN")}
                        {p.listing_type === "Rent" && <span style={{ fontSize: "13px", fontWeight: 400, color: "#64748b" }}>/mo</span>}
                      </div>
                      <h3 className="saved-card-title">{p.title}</h3>
                      <div className="saved-card-loc">📍 {p.city || "Prime Area"}, {p.state || "India"}</div>

                      <div className="saved-card-specs">
                        <span>🛏️ {p.bedrooms} Beds</span>
                        <span>🚿 {p.bathrooms} Baths</span>
                        <span>📐 {p.area_sqft} sq.ft</span>
                      </div>

                      {/* Personal Notes & Tags */}
                      <div className="saved-notes-box">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span className="saved-notes-label">📝 My Notes & Tags</span>
                          {!isEditing ? (
                            <button
                              type="button"
                              style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", fontSize: "11px", fontWeight: 700 }}
                              onClick={() => {
                                setEditingNotesId(p.id);
                                setNotesInput(item.personalNotes || "");
                                setTagsInput((item.tags || []).join(", "));
                              }}
                            >
                              Edit
                            </button>
                          ) : (
                            <button
                              type="button"
                              style={{ background: "none", border: "none", color: "#16a34a", cursor: "pointer", fontSize: "11px", fontWeight: 700 }}
                              onClick={() => handleSaveNotes(p.id)}
                            >
                              Save
                            </button>
                          )}
                        </div>

                        {isEditing ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "6px" }}>
                            <input
                              type="text"
                              className="saved-notes-input"
                              placeholder="Personal notes (e.g. Near metro, good price)..."
                              value={notesInput}
                              onChange={(e) => setNotesInput(e.target.value)}
                            />
                            <input
                              type="text"
                              className="saved-notes-input"
                              placeholder="Tags comma-separated (e.g. Investment, High ROI)..."
                              value={tagsInput}
                              onChange={(e) => setTagsInput(e.target.value)}
                            />
                          </div>
                        ) : (
                          <div>
                            <div style={{ color: "#334155", fontStyle: item.personalNotes ? "normal" : "italic" }}>
                              {item.personalNotes || "No notes added yet."}
                            </div>
                            {item.tags && item.tags.length > 0 && (
                              <div className="saved-tags-wrap">
                                {item.tags.map((t, idx) => (
                                  <span key={idx} className="saved-tag-pill">#{t}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="saved-card-actions">
                        <Link to={`/properties/${p.id}`} className="saved-view-btn">
                          View Property Details
                        </Link>
                        <button
                          type="button"
                          className="saved-col-btn"
                          onClick={() => {
                            setAddPropToColModal(p.id);
                            // Preload collections if empty
                            if (collections.length === 0) {
                              api.get("/collections").then((r) => setCollections(r.data?.collections || []));
                            }
                          }}
                          title="Add to Collection"
                        >
                          + Collection
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: COLLECTIONS */}
      {activeTab === "collections" && (
        <div>
          {selectedCol ? (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <div>
                  <button
                    type="button"
                    style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", fontSize: "13px", fontWeight: 700, marginBottom: "6px" }}
                    onClick={() => setSelectedCol(null)}
                  >
                    ← Back to All Collections
                  </button>
                  <h2 style={{ margin: 0, fontSize: "22px", fontWeight: 800 }}>{selectedCol.name}</h2>
                  <p style={{ margin: 0, color: "#64748b", fontSize: "13px" }}>{selectedCol.description || "Curated list"}</p>
                </div>

                <button
                  type="button"
                  style={{ background: "#fee2e2", border: "none", color: "#dc2626", borderRadius: "8px", padding: "8px 14px", fontWeight: 600, cursor: "pointer" }}
                  onClick={() => handleDeleteCollection(selectedCol.id)}
                >
                  Delete Collection
                </button>
              </div>

              {selectedCol.items?.length === 0 ? (
                <div className="saved-empty-state">
                  <div className="saved-empty-icon">📂</div>
                  <h3 className="saved-empty-title">This Collection is Empty</h3>
                  <p className="saved-empty-desc">
                    Add properties to this collection from your Saved Properties tab!
                  </p>
                </div>
              ) : (
                <div className="saved-grid">
                  {selectedCol.items.map((it) => (
                    <div key={it.itemId} className="saved-card">
                      <div className="saved-card-img-wrap">
                        <img
                          src={it.property.image || "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800"}
                          alt={it.property.title}
                          className="saved-card-img"
                        />
                        <span className="saved-card-badge">{it.property.property_type}</span>
                      </div>
                      <div className="saved-card-body">
                        <div className="saved-card-price">₹{Number(it.property.price).toLocaleString("en-IN")}</div>
                        <h3 className="saved-card-title">{it.property.title}</h3>
                        <div className="saved-card-loc">📍 {it.property.city}</div>
                        <div className="saved-card-actions">
                          <Link to={`/properties/${it.property.id}`} className="saved-view-btn">
                            View Property
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="collections-header">
                <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700 }}>Custom Property Collections</h3>
                <button
                  type="button"
                  className="ops-btn-primary"
                  onClick={() => setShowCreateCol(!showCreateCol)}
                >
                  {showCreateCol ? "Cancel" : "+ New Collection"}
                </button>
              </div>

              {showCreateCol && (
                <div className="ops-verif-card" style={{ marginBottom: "24px" }}>
                  <form onSubmit={handleCreateCollection}>
                    <div className="ops-form-grid">
                      <div className="ops-form-group">
                        <label className="ops-label">Collection Name *</label>
                        <input
                          type="text"
                          className="ops-input"
                          placeholder="e.g. South Mumbai Luxury Villas"
                          value={colName}
                          onChange={(e) => setColName(e.target.value)}
                          required
                        />
                      </div>
                      <div className="ops-form-group">
                        <label className="ops-label">Color Tag</label>
                        <input
                          type="color"
                          className="ops-input"
                          style={{ height: "38px", padding: "2px" }}
                          value={colColor}
                          onChange={(e) => setColColor(e.target.value)}
                        />
                      </div>
                      <div className="ops-form-group full-width">
                        <label className="ops-label">Description (Optional)</label>
                        <input
                          type="text"
                          className="ops-input"
                          placeholder="e.g. Shortlisted for client meeting on Friday"
                          value={colDesc}
                          onChange={(e) => setColDesc(e.target.value)}
                        />
                      </div>
                    </div>
                    <button type="submit" className="ops-btn-primary">
                      Create Collection
                    </button>
                  </form>
                </div>
              )}

              {collections.length === 0 ? (
                <div className="saved-empty-state">
                  <div className="saved-empty-icon">📁</div>
                  <h3 className="saved-empty-title">No Collections Created</h3>
                  <p className="saved-empty-desc">
                    Organize your favorite listings into custom client or investment folders (e.g. "Weekend Getaways", "Commercial Investments").
                  </p>
                </div>
              ) : (
                <div className="collections-grid">
                  {collections.map((col) => (
                    <div
                      key={col.id}
                      className="collection-card"
                      style={{ borderTopColor: col.color || "#3b82f6" }}
                      onClick={() => handleViewCollection(col.id)}
                    >
                      <h4 className="collection-card-title">{col.name}</h4>
                      <p className="collection-card-desc">{col.description || "Curated collection"}</p>
                      <div className="collection-card-footer">
                        <span>📁 {col.itemCount} properties</span>
                        <span style={{ color: "#2563eb", fontWeight: 700 }}>Open →</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SAVED SEARCHES */}
      {activeTab === "searches" && (
        <div>
          <div style={{ marginBottom: "20px" }}>
            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700 }}>Saved Search Filters</h3>
            <span style={{ fontSize: "13px", color: "#64748b" }}>
              Quickly re-execute complex property filter criteria with a single click
            </span>
          </div>

          {savedSearches.length === 0 ? (
            <div className="saved-empty-state">
              <div className="saved-empty-icon">🔎</div>
              <h3 className="saved-empty-title">No Saved Searches Yet</h3>
              <p className="saved-empty-desc">
                When searching in the Properties directory, click "Save Search" to bookmark your search filters here!
              </p>
              <Link to="/properties" className="saved-view-btn" style={{ display: "inline-block", width: "auto", padding: "10px 24px" }}>
                Go to Properties Search
              </Link>
            </div>
          ) : (
            <div className="searches-list">
              {savedSearches.map((s) => (
                <div key={s.id} className="search-item-card">
                  <div>
                    <h4 className="search-item-title">🔍 {s.searchName}</h4>
                    <div className="search-filters-chips">
                      {Object.entries(s.filters || {}).map(([k, v]) => (
                        <span key={k} className="search-chip">
                          {k}: {String(v)}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="search-item-actions">
                    <button
                      type="button"
                      className="btn-apply-search"
                      onClick={() => handleApplySearch(s.filters)}
                    >
                      Apply Search
                    </button>
                    <button
                      type="button"
                      className="btn-delete-search"
                      onClick={() => handleDeleteSearch(s.id)}
                      title="Delete search"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL: ADD TO COLLECTION */}
      {addPropToColModal && (
        <div className="ops-modal-overlay" onClick={() => setAddPropToColModal(null)}>
          <div className="ops-modal-card" style={{ maxWidth: "420px" }} onClick={(e) => e.stopPropagation()}>
            <div className="ops-modal-header">
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>Add to Collection</h3>
              <button type="button" className="ops-close-btn" onClick={() => setAddPropToColModal(null)}>×</button>
            </div>
            <div className="ops-modal-body">
              {collections.length === 0 ? (
                <div>
                  <p style={{ fontSize: "13px", color: "#64748b" }}>You haven't created any collections yet.</p>
                  <button
                    type="button"
                    className="ops-btn-primary"
                    onClick={() => {
                      setAddPropToColModal(null);
                      setActiveTab("collections");
                      setShowCreateCol(true);
                    }}
                  >
                    Create a Collection
                  </button>
                </div>
              ) : (
                <form onSubmit={handleAddPropertyToCollection}>
                  <div className="ops-form-group" style={{ marginBottom: "16px" }}>
                    <label className="ops-label">Select Target Collection</label>
                    <select
                      className="ops-select"
                      value={selectedColId}
                      onChange={(e) => setSelectedColId(e.target.value)}
                      required
                    >
                      <option value="">-- Choose Collection --</option>
                      {collections.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.itemCount} items)
                        </option>
                      ))}
                    </select>
                  </div>
                  <button type="submit" className="ops-btn-primary" disabled={!selectedColId}>
                    Save to Collection
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SavedProperties;
