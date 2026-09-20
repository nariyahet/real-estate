import React, { useState, useEffect } from "react";
import Property3DViewer from "./3D/Property3DViewer";

/**
 * PropertyDetailsModal
 * Comprehensive Luxury Property Details Modal.
 * Integrates interactive 3D Architectural Viewer, photo gallery, specs,
 * agent information, and operations triggers.
 */
export default function PropertyDetailsModal({
  isOpen,
  property,
  onClose,
  canAccessVault,
  onOpenVault,
  onOpenOps,
  onOpenIntel,
  onToggleSave,
  isSaved,
}) {
  const [activeMediaTab, setActiveMediaTab] = useState("3d"); // "3d" | "photos"
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen || !property) return null;

  // Format Price
  const formatPrice = (price, listingType) => {
    const value = Number(price || 0);
    const formatted = value.toLocaleString("en-IN", { maximumFractionDigits: 2 });
    if (listingType === "Rent") return `₹${formatted}/month`;
    return `₹${formatted}`;
  };

  const images = property.images && property.images.length > 0
    ? property.images.map((img) => (typeof img === "string" ? img : img.image_url))
    : [
        property.primary_image ||
          property.image_url ||
          property.image ||
          "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200",
      ];

  return (
    <div
      className="property-details-modal-overlay"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(7, 26, 51, 0.82)",
        backdropFilter: "blur(10px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        overflowY: "auto",
      }}
    >
      <div
        className="property-details-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#FFFFFF",
          borderRadius: "20px",
          width: "100%",
          maxWidth: "1040px",
          maxHeight: "92vh",
          overflowY: "auto",
          boxShadow: "0 25px 60px -12px rgba(7, 26, 51, 0.4)",
          border: "1px solid #E2E8F0",
          display: "flex",
          flexDirection: "column",
          position: "relative",
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "20px 28px",
            borderBottom: "1px solid #E2E8F0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "#F8FAFC",
            borderTopLeftRadius: "20px",
            borderTopRightRadius: "20px",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
              <span
                style={{
                  padding: "4px 10px",
                  background: "#E0F2FE",
                  color: "#0369A1",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                }}
              >
                {property.property_type || "Apartment"}
              </span>
              <span
                style={{
                  padding: "4px 10px",
                  background: property.listing_type === "Sale" ? "#ECFDF5" : "#F3E8FF",
                  color: property.listing_type === "Sale" ? "#047857" : "#7E22CE",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: 700,
                }}
              >
                For {property.listing_type || "Sale"}
              </span>
              <span style={{ fontSize: "12px", color: "#64748B" }}>
                ID: #{property.id}
              </span>
            </div>
            <h2 style={{ margin: 0, fontSize: "22px", color: "#071A33", fontWeight: 700 }}>
              {property.title}
            </h2>
            <p style={{ margin: "4px 0 0", color: "#64748B", fontSize: "13px" }}>
              📍 {property.address ? `${property.address}, ` : ""}{property.city}, {property.state || "India"}
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {onToggleSave && (
              <button
                type="button"
                onClick={() => onToggleSave(property.id)}
                title="Save Property"
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  border: "1px solid #E2E8F0",
                  background: "#FFFFFF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "18px",
                  cursor: "pointer",
                }}
              >
                {isSaved ? "❤️" : "🤍"}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "50%",
                background: "#F1F5F9",
                border: "none",
                fontSize: "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "#475569",
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Media Switcher Tab (3D Model vs Photo Gallery) */}
        <div style={{ padding: "0 28px", marginTop: "16px", display: "flex", gap: "10px" }}>
          <button
            type="button"
            onClick={() => setActiveMediaTab("3d")}
            style={{
              padding: "10px 20px",
              borderRadius: "10px",
              border: activeMediaTab === "3d" ? "1px solid #2563EB" : "1px solid #E2E8F0",
              background: activeMediaTab === "3d" ? "#2563EB" : "#F8FAFC",
              color: activeMediaTab === "3d" ? "#FFFFFF" : "#071A33",
              fontWeight: 700,
              fontSize: "13px",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer",
            }}
          >
            <span>🏢</span> Interactive 3D Architectural Studio
          </button>
          <button
            type="button"
            onClick={() => setActiveMediaTab("photos")}
            style={{
              padding: "10px 20px",
              borderRadius: "10px",
              border: activeMediaTab === "photos" ? "1px solid #2563EB" : "1px solid #E2E8F0",
              background: activeMediaTab === "photos" ? "#2563EB" : "#F8FAFC",
              color: activeMediaTab === "photos" ? "#FFFFFF" : "#071A33",
              fontWeight: 700,
              fontSize: "13px",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer",
            }}
          >
            <span>📷</span> Photography Gallery ({images.length})
          </button>
        </div>

        {/* Media Display Area */}
        <div style={{ padding: "16px 28px" }}>
          {activeMediaTab === "3d" ? (
            <Property3DViewer property={property} fallbackImage={images[0]} />
          ) : (
            <div>
              <div style={{ position: "relative", width: "100%", height: "460px", borderRadius: "14px", overflow: "hidden" }}>
                <img
                  src={images[selectedImageIdx]}
                  alt="Property"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
              {images.length > 1 && (
                <div style={{ display: "flex", gap: "10px", marginTop: "12px", overflowX: "auto", paddingBottom: "4px" }}>
                  {images.map((img, idx) => (
                    <img
                      key={idx}
                      src={img}
                      alt={`Thumbnail ${idx}`}
                      onClick={() => setSelectedImageIdx(idx)}
                      style={{
                        width: "80px",
                        height: "60px",
                        objectFit: "cover",
                        borderRadius: "8px",
                        cursor: "pointer",
                        border: selectedImageIdx === idx ? "2px solid #2563EB" : "1px solid #E2E8F0",
                        opacity: selectedImageIdx === idx ? 1 : 0.65,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Specs & Pricing Banner */}
        <div
          style={{
            margin: "0 28px 20px",
            padding: "18px 24px",
            background: "#071A33",
            color: "#FFFFFF",
            borderRadius: "14px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          <div>
            <span style={{ color: "#94A3B8", fontSize: "12px", letterSpacing: "0.05em", textTransform: "uppercase" }}>
              Offered Price
            </span>
            <div style={{ fontSize: "28px", fontWeight: 800, color: "#38BDF8" }}>
              {formatPrice(property.price, property.listing_type)}
            </div>
          </div>

          <div style={{ display: "flex", gap: "24px" }}>
            <div style={{ textAlign: "center" }}>
              <span style={{ color: "#94A3B8", fontSize: "11px", display: "block" }}>Bedrooms</span>
              <strong style={{ fontSize: "18px", color: "#F8FAFC" }}>{property.bedrooms ?? "—"} BHK</strong>
            </div>
            <div style={{ textAlign: "center" }}>
              <span style={{ color: "#94A3B8", fontSize: "11px", display: "block" }}>Bathrooms</span>
              <strong style={{ fontSize: "18px", color: "#F8FAFC" }}>{property.bathrooms ?? "—"} Baths</strong>
            </div>
            <div style={{ textAlign: "center" }}>
              <span style={{ color: "#94A3B8", fontSize: "11px", display: "block" }}>Carpet Area</span>
              <strong style={{ fontSize: "18px", color: "#F8FAFC" }}>{property.area || property.area_sqft || "—"} sq.ft</strong>
            </div>
            <div style={{ textAlign: "center" }}>
              <span style={{ color: "#94A3B8", fontSize: "11px", display: "block" }}>Status</span>
              <span
                style={{
                  display: "inline-block",
                  padding: "2px 8px",
                  borderRadius: "4px",
                  fontSize: "13px",
                  fontWeight: 700,
                  background: property.status === "Available" ? "#10B981" : "#64748B",
                }}
              >
                {property.status || "Available"}
              </span>
            </div>
          </div>
        </div>

        {/* Detailed Description & Agent Section */}
        <div
          style={{
            padding: "0 28px 28px",
            display: "grid",
            gridTemplateColumns: "1.8fr 1fr",
            gap: "24px",
          }}
        >
          {/* Left Column: Description & Actions */}
          <div>
            <h3 style={{ fontSize: "16px", color: "#071A33", fontWeight: 700, marginBottom: "8px" }}>
              About this Property
            </h3>
            <p style={{ fontSize: "14px", color: "#475569", lineHeight: 1.6, marginBottom: "20px" }}>
              {property.description || "No description provided for this listing."}
            </p>

            {/* Quick Operations Links */}
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              {onOpenIntel && (
                <button
                  type="button"
                  onClick={() => onOpenIntel(property)}
                  style={{
                    padding: "9px 16px",
                    background: "#F0F9FF",
                    border: "1px solid #BAE6FD",
                    color: "#0369A1",
                    borderRadius: "8px",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  📊 Property Intelligence
                </button>
              )}
              {canAccessVault && canAccessVault(property) && onOpenVault && (
                <button
                  type="button"
                  onClick={() => onOpenVault(property)}
                  style={{
                    padding: "9px 16px",
                    background: "#F8FAFC",
                    border: "1px solid #CBD5E1",
                    color: "#334155",
                    borderRadius: "8px",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  📁 Document Vault
                </button>
              )}
              {canAccessVault && canAccessVault(property) && onOpenOps && (
                <button
                  type="button"
                  onClick={() => onOpenOps(property)}
                  style={{
                    padding: "9px 16px",
                    background: "#F8FAFC",
                    border: "1px solid #CBD5E1",
                    color: "#334155",
                    borderRadius: "8px",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  ⚙️ Operations Hub
                </button>
              )}
            </div>
          </div>

          {/* Right Column: Agent Information */}
          <div
            style={{
              background: "#F8FAFC",
              border: "1px solid #E2E8F0",
              borderRadius: "14px",
              padding: "20px",
            }}
          >
            <h4 style={{ margin: "0 0 12px", fontSize: "14px", color: "#64748B", textTransform: "uppercase" }}>
              Listing Agent
            </h4>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
              <div
                style={{
                  width: "46px",
                  height: "46px",
                  borderRadius: "50%",
                  background: "#071A33",
                  color: "#38BDF8",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "18px",
                  fontWeight: 700,
                }}
              >
                {(property.agent_name || "A").charAt(0)}
              </div>
              <div>
                <strong style={{ fontSize: "15px", color: "#071A33" }}>{property.agent_name || "Assigned Agent"}</strong>
                <span style={{ display: "block", fontSize: "12px", color: "#64748B" }}>
                  {property.agency_name || "Prime Properties"}
                </span>
              </div>
            </div>

            {property.agent_phone && (
              <p style={{ margin: "6px 0", fontSize: "13px", color: "#334155" }}>
                📞 {property.agent_phone}
              </p>
            )}
            {property.agent_email && (
              <p style={{ margin: "6px 0", fontSize: "13px", color: "#334155" }}>
                ✉️ {property.agent_email}
              </p>
            )}

            <button
              type="button"
              onClick={() => alert(`Inquiry initiated for ${property.title}`)}
              style={{
                width: "100%",
                marginTop: "14px",
                padding: "10px",
                background: "#2563EB",
                color: "#FFFFFF",
                borderRadius: "8px",
                fontWeight: 600,
                fontSize: "13px",
                cursor: "pointer",
                textAlign: "center",
              }}
            >
              Contact Agent
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
