import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";
import DashboardBackLink from "../components/DashboardBackLink";
import "./PropertyDetails.css";

function PropertyDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [property, setProperty] = useState(null);
  const [activeImage, setActiveImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchProperty = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get(`/properties/${id}`);

      if (response.data?.success && response.data?.property) {
        setProperty(response.data.property);

        const images = response.data.property.images || [];
        if (images.length > 0) {
          const primary = images.find((img) => img.is_primary) || images[0];
          setActiveImage(primary.image_url);
        }
      } else {
        setError(response.data?.message || "Failed to load property details.");
      }
    } catch (err) {
      console.error("Property Details Fetch Error:", err);
      setError(
        err.response?.data?.message || "Unable to fetch property details. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProperty();
  }, [fetchProperty]);

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
        return "status-available";
      case "Sold":
        return "status-sold";
      case "Rented":
        return "status-rented";
      case "Inactive":
        return "status-inactive";
      default:
        return "";
    }
  };

  if (loading) {
    return (
      <div className="property-details-container">
        <div className="loading-state">
          <div className="loader"></div>
          <p>Loading property details...</p>
        </div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="property-details-container">
        <div className="details-header-nav">
          <button type="button" className="back-btn" onClick={() => navigate("/properties")}>
            ← Back to Properties
          </button>
          <div className="header-actions">
            <DashboardBackLink />
          </div>
        </div>

        <div className="error-box">
          <span>{error || "Property not found."}</span>
          <button type="button" className="error-close" onClick={() => navigate("/properties")}>
            ×
          </button>
        </div>
      </div>
    );
  }

  const images = property.images || [];

  return (
    <div className="property-details-container">
      {/* Navigation & Header */}
      <div className="details-header-nav">
        <button type="button" className="back-btn" onClick={() => navigate("/properties")}>
          ← Back to Properties
        </button>

        <div className="header-actions">
          <DashboardBackLink />
        </div>
      </div>

      {/* Main Showcase Layout */}
      <div className="details-grid">
        {/* Left Column: Media & Specifications */}
        <div className="details-main">
          {/* Main Gallery */}
          <div className="gallery-section">
            <div className="main-image-wrapper">
              {activeImage ? (
                <img
                  src={activeImage}
                  alt={property.title}
                  className="main-property-image"
                />
              ) : (
                <div className="image-placeholder">
                  <span>🏠 No Image Available</span>
                </div>
              )}

              <span className={`property-status-badge ${getStatusClass(property.status)}`}>
                {property.status}
              </span>
            </div>

            {images.length > 1 && (
              <div className="thumbnails-row">
                {images.map((img) => (
                  <button
                    type="button"
                    key={img.id}
                    className={`thumbnail-btn ${activeImage === img.image_url ? "active" : ""}`}
                    onClick={() => setActiveImage(img.image_url)}
                  >
                    <img src={img.image_url} alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Property Title & Meta */}
          <div className="property-summary-card">
            <div className="summary-top">
              <div>
                <div className="summary-tags-row">
                  <span className="property-type-tag">{property.property_type}</span>
                  <span className="property-listing-tag">{property.listing_type}</span>
                </div>
                <h1 className="property-title">{property.title}</h1>
                <p className="property-address">
                  📍 {property.address ? `${property.address}, ` : ""}
                  {property.city}
                  {property.state ? `, ${property.state}` : ""}
                  {property.country ? `, ${property.country}` : ""}
                </p>
              </div>

              <div className="property-price-box">
                <span className="price-label">PRICE</span>
                <div className="price-amount">
                  {formatPrice(property.price, property.listing_type)}
                </div>
              </div>
            </div>

            {/* Quick Specs */}
            <div className="specs-grid">
              <div className="spec-card">
                <span className="spec-icon">🛏</span>
                <div>
                  <div className="spec-value">{property.bedrooms || 0}</div>
                  <div className="spec-label">Bedrooms</div>
                </div>
              </div>

              <div className="spec-card">
                <span className="spec-icon">🚿</span>
                <div>
                  <div className="spec-value">{property.bathrooms || 0}</div>
                  <div className="spec-label">Bathrooms</div>
                </div>
              </div>

              <div className="spec-card">
                <span className="spec-icon">📐</span>
                <div>
                  <div className="spec-value">
                    {property.area ? `${Number(property.area).toLocaleString("en-IN")} sq.ft` : "N/A"}
                  </div>
                  <div className="spec-label">Total Area</div>
                </div>
              </div>

              <div className="spec-card">
                <span className="spec-icon">🏷</span>
                <div>
                  <div className="spec-value">{property.status}</div>
                  <div className="spec-label">Listing Status</div>
                </div>
              </div>
            </div>
          </div>

          {/* Description Section */}
          <div className="property-description-card">
            <h2>About This Property</h2>
            <p className="description-text">
              {property.description || "No description provided for this property listing."}
            </p>
          </div>
        </div>

        {/* Right Column: Agent Profile Card */}
        <div className="details-sidebar">
          {/* Agent Information Card */}
          <div className="agent-profile-card">
            <h3 className="sidebar-card-title">Listing Agent</h3>

            <div className="agent-profile-header">
              <div className="agent-avatar">
                {(property.agent_name || "A").charAt(0).toUpperCase()}
              </div>

              <div className="agent-info">
                <strong>{property.agent_name || "Assigned Agent"}</strong>
                <span>{property.agency_name || "Premier Realty Agency"}</span>
              </div>
            </div>

            {property.agent_bio && (
              <p className="agent-bio">{property.agent_bio}</p>
            )}

            <div className="agent-contacts">
              {property.agent_phone && (
                <div className="contact-item">
                  <span className="contact-icon">📞</span>
                  <span>{property.agent_phone}</span>
                </div>
              )}

              {property.agent_email && (
                <div className="contact-item">
                  <span className="contact-icon">✉</span>
                  <span>{property.agent_email}</span>
                </div>
              )}

              {property.agent_location && (
                <div className="contact-item">
                  <span className="contact-icon">📍</span>
                  <span>{property.agent_location}</span>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default PropertyDetails;
