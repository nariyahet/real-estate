import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import api from "../api/axios";
import "./Properties.css";

const API_URL = "https://real-estate-backend-kved.onrender.com/api";

function Properties() {
  const [properties, setProperties] = useState([]);
  const [favoriteIds, setFavoriteIds] = useState(new Set());
  const [togglingFavId, setTogglingFavId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const getUser = () => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  };

  const getHeaders = useCallback(() => {
    const token =
      localStorage.getItem("adminToken") || localStorage.getItem("token");

    return {
      Authorization: `Bearer ${token}`,
    };
  }, []);

  const fetchProperties = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const user = getUser();

      const endpoint =
        user?.role === "admin"
          ? `${API_URL}/admin/properties`
          : `${API_URL}/properties`;

      const response = await axios.get(endpoint, {
        headers: getHeaders(),
      });

      if (response.data.success) {
        setProperties(response.data.properties || []);
      } else {
        setProperties([]);
        setError(
          response.data.message || "Failed to load properties.",
        );
      }
    } catch (err) {
      console.error("Properties Error:", err);

      setProperties([]);
      setError(
        err.response?.data?.message || "Failed to load properties.",
      );
    } finally {
      setLoading(false);
    }
  }, [getHeaders]);

  const fetchFavoriteIds = useCallback(async () => {
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
    fetchFavoriteIds();
  }, [fetchProperties, fetchFavoriteIds]);

  const handleToggleFavorite = async (e, propertyId) => {
    e.preventDefault();
    e.stopPropagation();

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

      const response = await axios.put(
        `${API_URL}/admin/properties/${propertyId}/status`,
        { status },
        {
          headers: getHeaders(),
        },
      );

      if (response.data.success) {
        setProperties((currentProperties) =>
          currentProperties.map((property) =>
            property.id === propertyId
              ? { ...property, status }
              : property,
          ),
        );
      } else {
        setError(
          response.data.message ||
            "Failed to update property status.",
        );
      }
    } catch (err) {
      console.error("Update Property Status Error:", err);

      setError(
        err.response?.data?.message ||
          "Failed to update property status.",
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const deleteProperty = async (propertyId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this property?",
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(propertyId);
      setError("");

      const response = await axios.delete(
        `${API_URL}/admin/properties/${propertyId}`,
        {
          headers: getHeaders(),
        },
      );

      if (response.data.success) {
        setProperties((currentProperties) =>
          currentProperties.filter(
            (property) => property.id !== propertyId,
          ),
        );
      } else {
        setError(
          response.data.message ||
            "Failed to delete property.",
        );
      }
    } catch (err) {
      console.error("Delete Property Error:", err);

      setError(
        err.response?.data?.message ||
          "Failed to delete property.",
      );
    } finally {
      setDeletingId(null);
    }
  };

  const formatPrice = (price, listingType) => {
    const value = Number(price || 0);

    const formatted = value.toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    });

    if (listingType === "Rent") {
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

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-header">
          <div>
            <h1>Properties</h1>
            <p>Manage all real estate properties</p>
          </div>
        </div>

        <div className="loading-state">
          <div className="loader"></div>
          <p>Loading properties...</p>
        </div>
      </div>
    );
  }

  const user = getUser();
  const isAdmin = user?.role === "admin";

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <span className="page-label">PROPERTY MANAGEMENT</span>
          <h1>Properties</h1>
          <p>
            {isAdmin
              ? "Manage all listed properties from one place."
              : "Browse available real estate properties."}
          </p>
        </div>

        <div className="properties-header-actions">
          <Link to="/favorites" className="favorites-nav-btn">
            ♥ Favorites ({favoriteIds.size})
          </Link>

          <button
            type="button"
            onClick={fetchProperties}
            disabled={loading}
          >
            ↻ Refresh
          </button>
        </div>
      </div>

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

      {!error && properties.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">🏠</div>
          <h3>No Properties Found</h3>
          <p>Currently there are no properties available.</p>
        </div>
      )}

      {properties.length > 0 && (
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

                {isAdmin && <th>Status</th>}
                {isAdmin && <th>Actions</th>}
              </tr>
            </thead>

            <tbody>
              {properties.map((property) => (
                <tr key={property.id}>
                  <td>
                    <span className="property-id">
                      #{property.id}
                    </span>
                  </td>

                  <td>
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

                        <strong className="property-title">
                          {property.title || "Untitled Property"}
                        </strong>
                      </div>

                      {property.city && (
                        <span className="property-location">
                          {property.city}
                          {property.state
                            ? `, ${property.state}`
                            : ""}
                        </span>
                      )}
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
                        property.listing_type === "Sale"
                          ? "sale"
                          : "rent"
                      }`}
                    >
                      {property.listing_type || "-"}
                    </span>
                  </td>

                  <td>
                    <span className="property-price">
                      {formatPrice(
                        property.price,
                        property.listing_type,
                      )}
                    </span>
                  </td>

                  <td>
                    <span className="agent-name">
                      {property.agent_name || "Not Assigned"}
                    </span>
                  </td>

                  {isAdmin && (
                    <td>
                      <select
                        className={`status-select ${getStatusClass(
                          property.status,
                        )}`}
                        value={
                          property.status || "Available"
                        }
                        disabled={
                          updatingId === property.id
                        }
                        onChange={(e) =>
                          updatePropertyStatus(
                            property.id,
                            e.target.value,
                          )
                        }
                      >
                        <option value="Available">
                          Available
                        </option>
                        <option value="Sold">Sold</option>
                        <option value="Rented">Rented</option>
                        <option value="Inactive">
                          Inactive
                        </option>
                      </select>
                    </td>
                  )}

                  {isAdmin && (
                    <td>
                      <button
                        type="button"
                        className="delete-btn"
                        disabled={
                          deletingId === property.id
                        }
                        onClick={() =>
                          deleteProperty(property.id)
                        }
                      >
                        {deletingId === property.id
                          ? "Deleting..."
                          : "Delete"}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default Properties;