import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import api from "../api/axios";
import "./PropertyDetails.css";

function PropertyDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [property, setProperty] = useState(null);
  const [activeImage, setActiveImage] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favLoading, setFavLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Inquiry form states
  const getUser = () => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  };

  const user = getUser();

  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    message: "Hello, I am interested in this property and would like to schedule a viewing or request further details.",
  });

  const [submitting, setSubmitting] = useState(false);
  const [inquirySuccess, setInquirySuccess] = useState("");
  const [inquiryError, setInquiryError] = useState("");

  const fetchProperty = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      let response;
      try {
        response = await api.get(`/properties/${id}`);
      } catch (primaryErr) {
        try {
          response = await axios.get(
            `https://real-estate-backend-kved.onrender.com/api/properties/${id}`
          );
        } catch {
          throw primaryErr;
        }
      }

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

  const checkFavoriteStatus = useCallback(async () => {
    try {
      const res = await api.get(`/favorites/check/${id}`);
      if (res.data?.success) {
        setIsFavorite(Boolean(res.data.isFavorite));
      }
    } catch (err) {
      console.warn("Favorite check warning:", err.message);
    }
  }, [id]);

  useEffect(() => {
    fetchProperty();
    checkFavoriteStatus();
  }, [fetchProperty, checkFavoriteStatus]);

  const handleToggleFavorite = async () => {
    try {
      setFavLoading(true);
      if (isFavorite) {
        const res = await api.delete(`/favorites/${id}`);
        if (res.data?.success) {
          setIsFavorite(false);
        }
      } else {
        const res = await api.post(`/favorites/${id}`);
        if (res.data?.success) {
          setIsFavorite(true);
        }
      }
    } catch (err) {
      console.error("Toggle Favorite Error:", err);
    } finally {
      setFavLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleInquirySubmit = async (e) => {
    e.preventDefault();
    setInquiryError("");
    setInquirySuccess("");

    if (!formData.name.trim()) {
      setInquiryError("Please enter your name.");
      return;
    }

    if (!formData.email.trim()) {
      setInquiryError("Please enter your email address.");
      return;
    }

    if (!formData.message.trim() || formData.message.trim().length < 5) {
      setInquiryError("Please enter an inquiry message (minimum 5 characters).");
      return;
    }

    try {
      setSubmitting(true);

      let response;
      try {
        response = await api.post("/inquiries", {
          property_id: Number(id),
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone ? formData.phone.trim() : null,
          message: formData.message.trim(),
        });
      } catch (primaryErr) {
        try {
          const token =
            localStorage.getItem("token") || localStorage.getItem("adminToken");
          response = await axios.post(
            "https://real-estate-backend-kved.onrender.com/api/inquiries",
            {
              property_id: Number(id),
              name: formData.name.trim(),
              email: formData.email.trim(),
              phone: formData.phone ? formData.phone.trim() : null,
              message: formData.message.trim(),
            },
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            }
          );
        } catch {
          throw primaryErr;
        }
      }

      if (response.data?.success) {
        setInquirySuccess(
          response.data.message || "Your inquiry has been submitted successfully!",
        );
        // Reset message but keep contact info
        setFormData((prev) => ({
          ...prev,
          message: "",
        }));
      } else {
        setInquiryError(response.data?.message || "Failed to submit inquiry.");
      }
    } catch (err) {
      console.error("Submit Inquiry Error:", err);
      setInquiryError(
        err.response?.data?.message || "Unable to submit inquiry. Please try again later.",
      );
    } finally {
      setSubmitting(false);
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
          <Link to="/favorites" className="favorites-shortcut-link">
            ♥ My Favorites
          </Link>
          <Link to="/inquiries" className="inquiries-shortcut-link">
            ✉ View All Inquiries
          </Link>
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
                  <button
                    type="button"
                    className={`property-fav-btn ${isFavorite ? "favorited" : ""}`}
                    onClick={handleToggleFavorite}
                    disabled={favLoading}
                    title={isFavorite ? "Remove from Favorites" : "Save to Favorites"}
                  >
                    {isFavorite ? "♥ Saved to Favorites" : "♡ Save to Favorites"}
                  </button>
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

        {/* Right Column: Agent Card & Inquiry Form */}
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

          {/* Inquiry Form Card */}
          <div className="inquiry-form-card" id="inquiry-form">
            <h3 className="sidebar-card-title">Inquire About This Property</h3>
            <p className="inquiry-subtitle">
              Send a direct inquiry to the listing agent. We will respond promptly.
            </p>

            {inquirySuccess && (
              <div className="inquiry-success-box">
                <p>✅ {inquirySuccess}</p>
                <Link to="/inquiries" className="inquiry-success-link">
                  View your inquiries dashboard →
                </Link>
              </div>
            )}

            {inquiryError && (
              <div className="inquiry-error-box">
                <span>{inquiryError}</span>
              </div>
            )}

            <form onSubmit={handleInquirySubmit} className="inquiry-form">
              <div className="form-group">
                <label htmlFor="name">Your Name *</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Full Name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Your Email *</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="name@example.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="phone">Phone Number (Optional)</label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={formData.phone}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="message">Message *</label>
                <textarea
                  id="message"
                  name="message"
                  rows="4"
                  placeholder="Write your question or request..."
                  value={formData.message}
                  onChange={handleInputChange}
                  required
                ></textarea>
              </div>

              <button
                type="submit"
                className="submit-inquiry-btn"
                disabled={submitting}
              >
                {submitting ? "Sending Inquiry..." : "Send Inquiry ✉"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PropertyDetails;
