import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import DashboardBackLink from "../components/DashboardBackLink";
import "./Properties.css";

function Properties() {
  const [properties, setProperties] = useState([]);
  const [favoriteIds, setFavoriteIds] = useState(new Set());
  const [togglingFavId, setTogglingFavId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Search, Filter & Pagination states
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("all");
  const [propertyType, setPropertyType] = useState("all");
  const [listingType, setListingType] = useState("all");
  const [bedrooms, setBedrooms] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const getUser = () => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  };

  const user = getUser();
  const isAdmin = user?.role === "admin";
  const isAgent = user?.role === "agent";

  const fetchProperties = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const params = {
        page,
        limit: 10,
      };

      if (search.trim()) params.search = search.trim();
      if (city && city !== "all") params.city = city;
      if (propertyType && propertyType !== "all") params.propertyType = propertyType;
      if (listingType && listingType !== "all") params.listingType = listingType;
      if (bedrooms && bedrooms !== "all") params.bedrooms = bedrooms;

      const response = await api.get("/properties", { params });

      if (response.data?.success) {
        setProperties(response.data.properties || []);
        if (response.data.pagination) {
          setTotalPages(response.data.pagination.totalPages || 1);
          setTotalCount(response.data.pagination.total || 0);
        }
      } else {
        setProperties([]);
        setError(response.data?.message || "Failed to load properties.");
      }
    } catch (err) {
      console.error("Properties Error:", err);
      setProperties([]);
      setError(
        err.response?.data?.message || "Failed to load properties. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [page, search, city, propertyType, listingType, bedrooms]);

  const fetchFavoriteIds = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const response = await api.get("/favorites/ids");
      if (response.data?.success && Array.isArray(response.data?.favoriteIds)) {
        setFavoriteIds(new Set(response.data.favoriteIds));
      }
    } catch (err) {
      console.warn("Favorites fetch info:", err.message);
    }
  }, []);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  useEffect(() => {
    fetchFavoriteIds();
  }, [fetchFavoriteIds]);

  const handleToggleFavorite = async (e, propertyId) => {
    e.preventDefault();
    e.stopPropagation();

    const token = localStorage.getItem("token");
    if (!token) {
      alert("Please log in to save properties to your favorites.");
      return;
    }

    try {
      setTogglingFavId(propertyId);
      const isFav = favoriteIds.has(propertyId);

      if (isFav) {
        const response = await api.delete(`/favorites/${propertyId}`);
        if (response.data?.success) {
          setFavoriteIds((prev) => {
            const next = new Set(prev);
            next.delete(propertyId);
            return next;
          });
        }
      } else {
        const response = await api.post(`/favorites/${propertyId}`);
        if (response.data?.success) {
          setFavoriteIds((prev) => {
            const next = new Set(prev);
            next.add(propertyId);
            return next;
          });
        }
      }
    } catch (err) {
      console.error("Toggle Favorite Error:", err);
    } finally {
      setTogglingFavId(null);
    }
  };

  const updatePropertyStatus = async (propertyId, status) => {
    try {
      setUpdatingId(propertyId);
      setError("");

      const response = isAdmin
        ? await api.put(`/admin/properties/${propertyId}/status`, { status })
        : await api.put(`/properties/${propertyId}`, { status });

      if (response.data?.success) {
        setProperties((currentProperties) =>
          currentProperties.map((property) =>
            property.id === propertyId ? { ...property, status } : property,
          ),
        );
      } else {
        setError(response.data?.message || "Failed to update property status.");
      }
    } catch (err) {
      console.error("Update Property Status Error:", err);
      setError(err.response?.data?.message || "Failed to update property status.");
    } finally {
      setUpdatingId(null);
    }
  };

  const deleteProperty = async (propertyId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this property?",
    );

    if (!confirmed) return;

    try {
      setDeletingId(propertyId);
      setError("");

      const response = isAdmin
        ? await api.delete(`/admin/properties/${propertyId}`)
        : await api.delete(`/properties/${propertyId}`);

      if (response.data?.success) {
        setProperties((currentProperties) =>
          currentProperties.filter((property) => property.id !== propertyId),
        );
        setTotalCount((prev) => Math.max(prev - 1, 0));
      } else {
        setError(response.data?.message || "Failed to delete property.");
      }
    } catch (err) {
      console.error("Delete Property Error:", err);
      setError(err.response?.data?.message || "Failed to delete property.");
    } finally {
      setDeletingId(null);
    }
  };

  const resetFilters = () => {
    setSearch("");
    setCity("all");
    setPropertyType("all");
    setListingType("all");
    setBedrooms("all");
    setPage(1);
  };

  const formatPrice = (price, listingTypeVal) => {
    const value = Number(price || 0);
    const formatted = value.toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    });

    if (listingTypeVal === "Rent") {
      return `₹${formatted}/month`;
    }
    return `₹${formatted}`;
  };

  const getStatusClass = (status) => {
    switch (status) {
      case "Available":
        return "available";
      case "Sold":
        return "sold";
      case "Rented":
        return "rented";
      case "Inactive":
        return "inactive";
      default:
        return "";
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <span className="page-label">PROPERTY MANAGEMENT</span>
          <h1>Properties</h1>
          <p>
            {isAdmin
              ? "Manage all listed properties from one place."
              : isAgent
              ? "Browse and manage property listings."
              : "Browse available real estate properties."}
          </p>
        </div>

        <div className="properties-header-actions">
          <DashboardBackLink />

          {user && (
            <Link to="/favorites" className="favorites-nav-btn">
              ♥ Favorites ({favoriteIds.size})
            </Link>
          )}

          {user && (
            <Link to="/inquiries" className="inquiries-nav-btn">
              ✉ Inquiries
            </Link>
          )}

          {!user && (
            <Link to="/" className="login-nav-btn">
              🔑 Sign In
            </Link>
          )}

          <button
            type="button"
            className="refresh-btn"
            onClick={fetchProperties}
            disabled={loading}
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Error Notice */}
      {error && (
        <div className="error-box">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError("")}
            className="error-close"
          >
            ×
          </button>
        </div>
      )}

      {/* Search & Filter Controls */}
      <div className="filter-panel-card">
        <div className="search-filter-row">
          <div className="search-input-wrap">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by title, location or city..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="search-input"
            />
          </div>

          <div className="filters-row">
            <div className="filter-item">
              <label htmlFor="filter-city">City:</label>
              <select
                id="filter-city"
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">All Cities</option>
                <option value="Surat">Surat</option>
                <option value="Ahmedabad">Ahmedabad</option>
                <option value="Mumbai">Mumbai</option>
              </select>
            </div>

            <div className="filter-item">
              <label htmlFor="filter-type">Type:</label>
              <select
                id="filter-type"
                value={propertyType}
                onChange={(e) => {
                  setPropertyType(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">All Types</option>
                <option value="Apartment">Apartment</option>
                <option value="Villa">Villa</option>
                <option value="House">House</option>
                <option value="Office">Office</option>
                <option value="Shop">Shop</option>
                <option value="Land">Land</option>
                <option value="Warehouse">Warehouse</option>
              </select>
            </div>

            <div className="filter-item">
              <label htmlFor="filter-listing">Listing:</label>
              <select
                id="filter-listing"
                value={listingType}
                onChange={(e) => {
                  setListingType(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">All Listings</option>
                <option value="Sale">Sale</option>
                <option value="Rent">Rent</option>
              </select>
            </div>

            <div className="filter-item">
              <label htmlFor="filter-beds">Beds:</label>
              <select
                id="filter-beds"
                value={bedrooms}
                onChange={(e) => {
                  setBedrooms(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">Any Beds</option>
                <option value="1">1+ BHK</option>
                <option value="2">2+ BHK</option>
                <option value="3">3+ BHK</option>
                <option value="4">4+ BHK</option>
              </select>
            </div>

            {(search || city !== "all" || propertyType !== "all" || listingType !== "all" || bedrooms !== "all") && (
              <button
                type="button"
                className="reset-filters-btn"
                onClick={resetFilters}
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Loading indicator */}
      {loading && (
        <div className="loading-state">
          <div className="loader"></div>
          <p>Loading properties...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && properties.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">🏠</div>
          <h3>No Properties Found</h3>
          <p>No listings matched your criteria. Try adjusting or clearing your filters.</p>
          <button type="button" onClick={resetFilters} className="reset-filters-btn-empty">
            Reset Filters
          </button>
        </div>
      )}

      {/* Properties Table */}
      {!loading && properties.length > 0 && (
        <>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Property</th>
                  <th>Type</th>
                  <th>Listing</th>
                  <th>Price</th>
                  <th>Agent</th>
                  {(isAdmin || isAgent) && <th>Status</th>}
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {properties.map((property) => (
                  <tr key={property.id}>
                    <td>
                      <span className="property-id">#{property.id}</span>
                    </td>

                    <td>
                      <div className="property-cell-wrapper">
                        {property.primary_image || property.image_url ? (
                          <img
                            src={property.primary_image || property.image_url}
                            alt=""
                            className="property-row-thumb"
                          />
                        ) : (
                          <div className="property-row-thumb-placeholder">🏠</div>
                        )}

                        <div className="property-info">
                          <div className="property-title-with-heart">
                            <button
                              type="button"
                              className={`heart-toggle-btn ${
                                favoriteIds.has(property.id) ? "favorited" : ""
                              }`}
                              title={
                                favoriteIds.has(property.id)
                                  ? "Remove from favorites"
                                  : "Save to favorites"
                              }
                              onClick={(e) => handleToggleFavorite(e, property.id)}
                              disabled={togglingFavId === property.id}
                            >
                              {favoriteIds.has(property.id) ? "♥" : "♡"}
                            </button>

                            <Link
                              to={`/properties/${property.id}`}
                              className="property-title-link"
                            >
                              {property.title || "Untitled Property"}
                            </Link>
                          </div>

                          {property.city && (
                            <span className="property-location">
                              📍 {property.city}
                              {property.state ? `, ${property.state}` : ""}
                            </span>
                          )}

                          <Link
                            to={`/properties/${property.id}`}
                            className="inline-inquire-btn"
                          >
                            View / Inquire →
                          </Link>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className="property-type">
                        {property.property_type || "-"}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`listing-badge ${
                          property.listing_type === "Sale" ? "sale" : "rent"
                        }`}
                      >
                        {property.listing_type || "-"}
                      </span>
                    </td>

                    <td>
                      <span className="property-price">
                        {formatPrice(property.price, property.listing_type)}
                      </span>
                    </td>

                    <td>
                      <span className="agent-name">
                        {property.agent_name || "Not Assigned"}
                      </span>
                    </td>

                    {(isAdmin || isAgent) && (
                      <td>
                        {isAdmin || (isAgent && Number(property.agent_id) === Number(user?.agent_id)) ? (
                          <select
                            className={`status-select ${getStatusClass(
                              property.status,
                            )}`}
                            value={property.status || "Available"}
                            disabled={updatingId === property.id}
                            onChange={(e) =>
                              updatePropertyStatus(property.id, e.target.value)
                            }
                          >
                            <option value="Available">Available</option>
                            <option value="Sold">Sold</option>
                            <option value="Rented">Rented</option>
                            <option value="Inactive">Inactive</option>
                          </select>
                        ) : (
                          <span className={`status-badge-readonly ${getStatusClass(property.status)}`}>
                            {property.status || "Available"}
                          </span>
                        )}
                      </td>
                    )}

                    <td className="actions-cell">
                      <div className="row-action-buttons">
                        <Link
                          to={`/properties/${property.id}`}
                          className="view-inquire-btn"
                        >
                          View / Inquire →
                        </Link>

                        {(isAdmin || (isAgent && Number(property.agent_id) === Number(user?.agent_id))) && (
                          <button
                            type="button"
                            className="delete-btn"
                            disabled={deletingId === property.id}
                            onClick={() => deleteProperty(property.id)}
                          >
                            {deletingId === property.id
                              ? "Deleting..."
                              : "Delete"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="pagination-bar">
              <span className="pagination-info">
                Showing page {page} of {totalPages} ({totalCount} properties)
              </span>

              <div className="pagination-buttons">
                <button
                  type="button"
                  className="pagination-nav-btn"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                >
                  ← Previous
                </button>

                <span className="pagination-current-page">{page}</span>

                <button
                  type="button"
                  className="pagination-nav-btn"
                  disabled={page >= totalPages || loading}
                  onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Properties;