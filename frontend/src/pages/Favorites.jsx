import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import "./Favorites.css";

function Favorites() {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [removingId, setRemovingId] = useState(null);

  const fetchFavorites = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/favorites");

      if (response.data?.success) {
        setFavorites(response.data.favorites || []);
      } else {
        setFavorites([]);
        setError(response.data?.message || "Failed to load favorite properties.");
      }
    } catch (err) {
      console.error("Fetch Favorites Error:", err);
      setFavorites([]);
      setError(
        err.response?.data?.message ||
          "Unable to load your favorites. Please ensure you are logged in."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const handleRemoveFavorite = async (propertyId, propertyTitle) => {
    try {
      setRemovingId(propertyId);
      setError("");
      setActionSuccess("");

      const response = await api.delete(`/favorites/${propertyId}`);

      if (response.data?.success) {
        setFavorites((prev) => prev.filter((item) => item.id !== propertyId));
        setActionSuccess(
          `"${propertyTitle || "Property"}" removed from favorites.`
        );
        setTimeout(() => setActionSuccess(""), 3000);
      } else {
        setError(response.data?.message || "Failed to remove favorite.");
      }
    } catch (err) {
      console.error("Remove Favorite Error:", err);
      setError(
        err.response?.data?.message || "Failed to remove property from favorites."
      );
    } finally {
      setRemovingId(null);
    }
  };

  const formatPrice = (price, listingType) => {
    const value = Number(price || 0);
    const formatted = value.toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    });

    if (listingType === "Rent") {
      return `₹${formatted}/mo`;
    }
    return `₹${formatted}`;
  };

  return (
    <div className="favorites-container">
      {/* Header */}
      <div className="favorites-header">
        <div className="favorites-title-wrap">
          <span className="favorites-label">SAVED PROPERTIES</span>
          <h1>
            My Favorites
            <span className="favorites-badge">{favorites.length}</span>
          </h1>
          <p className="favorites-subtitle">
            Properties you have marked as favorites for quick access and tracking.
          </p>
        </div>

        <div className="favorites-header-actions">
          <Link to="/properties" className="browse-properties-btn">
            🏠 Browse All Properties
          </Link>
          <button
            type="button"
            className="favorites-refresh-btn"
            onClick={fetchFavorites}
            disabled={loading}
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Alert Boxes */}
      {error && (
        <div className="favorites-error-box">
          <span>{error}</span>
          <button
            type="button"
            className="error-close"
            onClick={() => setError("")}
          >
            ×
          </button>
        </div>
      )}

      {actionSuccess && (
        <div className="favorites-success-box">
          <span>✓ {actionSuccess}</span>
          <button
            type="button"
            className="error-close"
            onClick={() => setActionSuccess("")}
          >
            ×
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="favorites-loading">
          <div className="favorites-loader"></div>
          <p>Loading your saved favorites...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && favorites.length === 0 && (
        <div className="favorites-empty">
          <div className="empty-fav-icon">💖</div>
          <h3>No Favorites Saved Yet</h3>
          <p>
            You haven't added any properties to your favorites. Explore our listings
            and click the heart icon to save properties you love!
          </p>
          <Link to="/properties" className="browse-properties-btn">
            Browse Properties →
          </Link>
        </div>
      )}

      {/* Favorites Grid */}
      {!loading && favorites.length > 0 && (
        <div className="favorites-grid">
          {favorites.map((property) => (
            <div key={property.id} className="favorite-card">
              {/* Image & Badges */}
              <div className="fav-image-wrapper">
                {property.primary_image ? (
                  <img
                    src={property.primary_image}
                    alt={property.title}
                    className="fav-property-img"
                  />
                ) : (
                  <div className="fav-img-placeholder">🏠 No Image</div>
                )}

                <div className="fav-card-badges">
                  {property.property_type && (
                    <span className="fav-badge-type">
                      {property.property_type}
                    </span>
                  )}
                  {property.listing_type && (
                    <span
                      className={`fav-badge-listing ${
                        property.listing_type === "Sale" ? "sale" : "rent"
                      }`}
                    >
                      {property.listing_type}
                    </span>
                  )}
                </div>

                {/* Quick Unfavorite Heart */}
                <button
                  type="button"
                  className="fav-quick-heart-btn"
                  title="Remove from favorites"
                  onClick={() =>
                    handleRemoveFavorite(property.id, property.title)
                  }
                  disabled={removingId === property.id}
                >
                  ♥
                </button>
              </div>

              {/* Body */}
              <div className="fav-card-body">
                <div className="fav-card-top">
                  <Link
                    to="/properties"
                    className="fav-property-title"
                    onClick={(e) => {
                      e.preventDefault();
                      navigate("/properties");
                    }}
                  >
                    {property.title || "Untitled Property"}
                  </Link>
                  <span className="fav-property-price">
                    {formatPrice(property.price, property.listing_type)}
                  </span>
                </div>

                {(property.city || property.state) && (
                  <div className="fav-property-location">
                    📍 {property.city}
                    {property.state ? `, ${property.state}` : ""}
                  </div>
                )}

                {/* Specs */}
                <div className="fav-specs-row">
                  {property.bedrooms !== null && (
                    <span className="fav-spec-item">
                      🛏 {property.bedrooms} Beds
                    </span>
                  )}
                  {property.bathrooms !== null && (
                    <span className="fav-spec-item">
                      🚿 {property.bathrooms} Baths
                    </span>
                  )}
                  {property.area && (
                    <span className="fav-spec-item">
                      📐 {Number(property.area).toLocaleString("en-IN")} sq.ft
                    </span>
                  )}
                </div>

                {/* Agent */}
                {property.agent_name && (
                  <div className="fav-agent-info">
                    <span className="fav-agent-avatar">
                      {property.agent_name.charAt(0).toUpperCase()}
                    </span>
                    <span>
                      {property.agent_name}
                      {property.agency_name ? ` • ${property.agency_name}` : ""}
                    </span>
                  </div>
                )}

                {/* Actions */}
                <div className="fav-card-actions">
                  <Link
                    to="/properties"
                    className="fav-view-btn"
                    onClick={(e) => {
                      e.preventDefault();
                      navigate("/properties");
                    }}
                  >
                    View Property →
                  </Link>

                  <button
                    type="button"
                    className="fav-remove-btn"
                    onClick={() =>
                      handleRemoveFavorite(property.id, property.title)
                    }
                    disabled={removingId === property.id}
                  >
                    {removingId === property.id ? "Removing..." : "Remove"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Favorites;
