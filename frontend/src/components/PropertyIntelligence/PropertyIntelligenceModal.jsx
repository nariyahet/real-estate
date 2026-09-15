import { useEffect, useState, useCallback } from "react";
import api from "../../api/axios";
import {
  formatCurrency,
  formatPercent,
  formatSqFt,
  getScoreBadgeClass,
  getValuationBadgeClass,
  getMarketPositionBadgeClass,
  getQualityScoreClass,
  recalculateRentalYield,
  recalculateROI,
  recalculateAppreciation,
  generateClientPropertyDescription,
} from "../../utils/propertyIntelligence";
import "./PropertyIntelligence.css";

function PropertyIntelligenceModal({ isOpen, property, onClose }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [intelData, setIntelData] = useState(null);
  const [activeTab, setActiveTab] = useState("valuation");

  // Interactive Calculator State
  const [customMonthlyRent, setCustomMonthlyRent] = useState("");
  const [holdingYears, setHoldingYears] = useState(5);
  const [appreciationRate, setAppreciationRate] = useState(5.5);

  // AI Description Generator State
  const [descriptionTone, setDescriptionTone] = useState("luxury");
  const [activeDescription, setActiveDescription] = useState(null);
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const propertyId = property?.id;

  const fetchIntelligence = useCallback(async () => {
    if (!propertyId) return;

    try {
      setLoading(true);
      setError("");

      const response = await api.get(`/properties/${propertyId}/intelligence`);

      if (response.data?.success && response.data?.intelligence) {
        const intel = response.data.intelligence;
        setIntelData(intel);

        // Pre-populate interactive calculator values
        if (intel.rentalYield?.monthlyRent) {
          setCustomMonthlyRent(String(intel.rentalYield.monthlyRent));
        } else {
          setCustomMonthlyRent("");
        }

        if (intel.roiCalculator?.holdingPeriodYears) {
          setHoldingYears(intel.roiCalculator.holdingPeriodYears);
        }
        if (intel.roiCalculator?.assumedAppreciationRate) {
          setAppreciationRate(intel.roiCalculator.assumedAppreciationRate);
        }

        if (intel.aiDescription) {
          setActiveDescription(intel.aiDescription);
          setDescriptionTone(intel.aiDescription.tone || "luxury");
        }
      } else {
        setError(response.data?.message || "Failed to load property intelligence.");
      }
    } catch (err) {
      console.error("Property Intelligence Load Error:", err);
      setError(
        err.response?.data?.message || "Failed to load intelligence metrics. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    if (isOpen && propertyId) {
      fetchIntelligence();
    }
  }, [isOpen, propertyId, fetchIntelligence]);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !property) return null;

  // Real-time recalculated values for interactive sliders
  const activeRentVal = customMonthlyRent !== "" && !Number.isNaN(Number(customMonthlyRent))
    ? Number(customMonthlyRent)
    : intelData?.rentalYield?.monthlyRent || 0;

  // Realistic asset property value basis (ensures rental properties don't use monthly rent as asset value)
  const propertyAssetVal =
    property.listing_type === "Rent"
      ? (intelData?.rentalYield?.propertyValue ||
          (activeRentVal > 0 ? activeRentVal * 12 * 20 : (Number(property.price) || 0) * 12 * 20))
      : (Number(intelData?.price || property.price) || 0);

  const currentYield = recalculateRentalYield(
    propertyAssetVal,
    activeRentVal
  );

  const currentRoi = recalculateROI(
    propertyAssetVal,
    currentYield.annualRentalIncome,
    holdingYears,
    appreciationRate
  );

  const currentForecasts = recalculateAppreciation(
    propertyAssetVal,
    appreciationRate
  );

  // Fallback / Active Description for Feature 10
  const displayDesc = activeDescription || intelData?.aiDescription || generateClientPropertyDescription(property, descriptionTone);

  const handleGenerateDescription = (newTone = descriptionTone) => {
    setIsGenerating(true);
    setTimeout(() => {
      const targetProp = intelData?.property ? { ...property, ...intelData.property } : property;
      const generated = generateClientPropertyDescription(targetProp, newTone);
      setActiveDescription(generated);
      setIsGenerating(false);
    }, 200);
  };

  const handleCopyDescription = () => {
    if (!displayDesc?.fullDescription) return;
    navigator.clipboard.writeText(displayDesc.fullDescription).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch((err) => {
      console.error("Failed to copy description:", err);
    });
  };

  return (
    <div className="intel-modal-overlay" onClick={onClose}>
      <div
        className="intel-modal-container"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="intel-modal-header">
          <div className="intel-header-title-area">
            <div className="intel-badge-row">
              <span className="intel-badge-brand">PROPERTY INTELLIGENCE</span>
              <span className="intel-badge-pill">#{property.id}</span>
              <span className="intel-badge-pill">{property.property_type || "Property"}</span>
              <span
                className={`intel-badge-pill ${
                  property.listing_type === "Sale" ? "sale" : "rent"
                }`}
              >
                {property.listing_type || "Sale"}
              </span>
              {property.city && (
                <span className="intel-badge-pill">📍 {property.city}</span>
              )}
            </div>

            <h2 className="intel-header-title">{property.title || "Untitled Property"}</h2>

            <p className="intel-header-sub">
              <span>
                🛏️ {property.bedrooms || 0} BHK
              </span>
              <span>
                🚿 {property.bathrooms || 0} Bath
              </span>
              <span>
                📐 {formatSqFt(property.area)}
              </span>
            </p>
          </div>

          <div className="intel-header-right">
            <div className="intel-header-price-box">
              <div className="intel-header-price-label">Listed Price</div>
              <div className="intel-header-price-value">
                {formatCurrency(property.price, property.listing_type)}
              </div>
            </div>

            <button
              type="button"
              className="intel-close-btn"
              onClick={onClose}
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="intel-modal-body">
          {error && (
            <div className="error-box">
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

          {loading ? (
            <div className="intel-loading-skeleton">
              <div className="intel-skeleton-bar"></div>
              <div className="intel-skeleton-box"></div>
              <div className="intel-skeleton-box"></div>
            </div>
          ) : intelData ? (
            <>
              {/* Quick Key Metrics Bar */}
              <div className="intel-quick-bar">
                {/* 1. Valuation Highlight (Property Asset Valuation) */}
                <div className="intel-quick-card">
                  <div className="intel-quick-card-top">
                    <span className="intel-quick-label">Automated Valuation</span>
                    <span className="intel-quick-icon">🏷️</span>
                  </div>
                  <div className="intel-quick-val">
                    {formatCurrency(
                      intelData.valuation?.estimatedMarketValue,
                      "Sale"
                    )}
                  </div>
                  <span
                    className={`intel-quick-badge ${getValuationBadgeClass(
                      intelData.valuation?.valuationStatus
                    )}`}
                  >
                    {intelData.valuation?.valuationStatus || "Fair Value"}
                  </span>
                </div>

                {/* 2. Price Estimate Highlight (Rent Recommendation for Rent, Price for Sale) */}
                <div className="intel-quick-card">
                  <div className="intel-quick-card-top">
                    <span className="intel-quick-label">
                      {intelData.listingType === "Rent"
                        ? "Rent Recommendation"
                        : "Price Recommendation"}
                    </span>
                    <span className="intel-quick-icon">🎯</span>
                  </div>
                  <div className="intel-quick-val">
                    {formatCurrency(
                      intelData.priceEstimate?.recommendedPrice,
                      intelData.listingType
                    )}
                  </div>
                  <span className="intel-quick-badge pos-badge-average">
                    {intelData.priceEstimate?.confidence || "Moderate"}
                  </span>
                </div>

                {/* 3. Price per Sq.Ft Highlight */}
                <div className="intel-quick-card">
                  <div className="intel-quick-card-top">
                    <span className="intel-quick-label">
                      {intelData.listingType === "Rent"
                        ? "Asset Value / Sq.Ft"
                        : "Price per Sq.Ft"}
                    </span>
                    <span className="intel-quick-icon">📐</span>
                  </div>
                  <div className="intel-quick-val">
                    {intelData.pricePerSqFtAnalytics?.formattedPricePerSqFt || "N/A"}
                  </div>
                  <span
                    className={`intel-quick-badge ${getMarketPositionBadgeClass(
                      intelData.pricePerSqFtAnalytics?.marketPosition
                    )}`}
                  >
                    {intelData.pricePerSqFtAnalytics?.marketPosition || "Market Benchmark"}
                  </span>
                </div>

                {/* 4. Investment Score Highlight */}
                <div className="intel-quick-card">
                  <div className="intel-quick-card-top">
                    <span className="intel-quick-label">Investment Score</span>
                    <span className="intel-quick-icon">⭐</span>
                  </div>
                  <div className="intel-quick-val">
                    {intelData.investmentScore?.score ?? 0}
                    <span style={{ fontSize: "14px", color: "#64748b" }}> / 100</span>
                  </div>
                  <span
                    className={`intel-quick-badge ${getScoreBadgeClass(
                      intelData.investmentScore?.rating
                    )}`}
                  >
                    {intelData.investmentScore?.rating || "Average"}
                  </span>
                </div>

                {/* 5. Quality Score Highlight */}
                <div className="intel-quick-card">
                  <div className="intel-quick-card-top">
                    <span className="intel-quick-label">Quality Score</span>
                    <span className="intel-quick-icon">✨</span>
                  </div>
                  <div className="intel-quick-val">
                    {intelData.qualityScore?.score ?? 0}
                    <span style={{ fontSize: "14px", color: "#64748b" }}> / 100</span>
                  </div>
                  <span
                    className={`intel-quick-badge ${getQualityScoreClass(
                      intelData.qualityScore?.rating
                    )}`}
                  >
                    {intelData.qualityScore?.rating || "Average"}
                  </span>
                </div>
              </div>

              {/* Tabs Navigation */}
              <div className="intel-tabs-nav">
                <button
                  type="button"
                  className={`intel-tab-btn ${activeTab === "valuation" ? "active" : ""}`}
                  onClick={() => setActiveTab("valuation")}
                >
                  <span>📊</span> Valuation & Pricing
                </button>
                <button
                  type="button"
                  className={`intel-tab-btn ${activeTab === "comparables" ? "active" : ""}`}
                  onClick={() => setActiveTab("comparables")}
                >
                  <span>🏘️</span> Market Comparables
                </button>
                <button
                  type="button"
                  className={`intel-tab-btn ${activeTab === "investment" ? "active" : ""}`}
                  onClick={() => setActiveTab("investment")}
                >
                  <span>📈</span> Investment & Financials
                </button>
                <button
                  type="button"
                  className={`intel-tab-btn ${activeTab === "quality" ? "active" : ""}`}
                  onClick={() => setActiveTab("quality")}
                >
                  <span>⭐</span> Quality Score
                </button>
                <button
                  type="button"
                  className={`intel-tab-btn ${activeTab === "description" ? "active" : ""}`}
                  onClick={() => setActiveTab("description")}
                >
                  <span>🤖</span> AI Description
                </button>
              </div>

              {/* ============================================================
                  TAB 1: VALUATION & PRICING (Features 1, 3, 4)
                  ============================================================ */}
              {activeTab === "valuation" && (
                <div className="intel-tab-pane">
                  {/* Feature 1: Automated Property Valuation */}
                  <div className="intel-feature-card">
                    <div className="intel-card-header">
                      <div className="intel-card-title-wrap">
                        <div className="intel-card-icon">🏷️</div>
                        <div>
                          <h3 className="intel-card-title">Automated Property Valuation</h3>
                          <p className="intel-card-subtitle">
                            Algorithmic market valuation derived from location, specifications, and comparable data.
                          </p>
                        </div>
                      </div>

                      <span
                        className={`intel-quick-badge ${getValuationBadgeClass(
                          intelData.valuation?.valuationStatus
                        )}`}
                        style={{ fontSize: "12px", padding: "5px 12px" }}
                      >
                        ● {intelData.valuation?.valuationStatus || "Fair Value"}
                      </span>
                    </div>

                    {intelData.listingType === "Rent" ? (
                      <div className="intel-grid-3">
                        <div className="intel-stat-box">
                          <span className="intel-stat-box-label">Estimated Property Asset Value</span>
                          <span className="intel-stat-box-value">
                            {formatCurrency(intelData.valuation?.estimatedMarketValue, "Sale")}
                          </span>
                          <span className="intel-stat-box-sub">Capital Asset Valuation</span>
                        </div>

                        <div className="intel-stat-box">
                          <span className="intel-stat-box-label">Current Listed Rent</span>
                          <span className="intel-stat-box-value">
                            {formatCurrency(intelData.valuation?.currentListedPrice, "Rent")}
                          </span>
                          <span className="intel-stat-box-sub">Asking Tenant Rate</span>
                        </div>

                        <div className="intel-stat-box">
                          <span className="intel-stat-box-label">Estimated Market Rent</span>
                          <span
                            className="intel-stat-box-value"
                            style={{
                              color:
                                (intelData.valuation?.differenceAmount || 0) >= 0
                                  ? "#16a34a"
                                  : "#dc2626",
                            }}
                          >
                            {formatCurrency(intelData.valuation?.estimatedMonthlyRent, "Rent")}
                          </span>
                          <span className="intel-stat-box-sub">
                            Variance: {formatCurrency(intelData.valuation?.differenceAmount, "Rent")} ({formatPercent(intelData.valuation?.differencePercentage, true)})
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="intel-grid-3">
                        <div className="intel-stat-box">
                          <span className="intel-stat-box-label">Estimated Market Value</span>
                          <span className="intel-stat-box-value">
                            {formatCurrency(
                              intelData.valuation?.estimatedMarketValue,
                              intelData.listingType
                            )}
                          </span>
                          <span className="intel-stat-box-sub">Model Target Valuation</span>
                        </div>

                        <div className="intel-stat-box">
                          <span className="intel-stat-box-label">Current Listed Price</span>
                          <span className="intel-stat-box-value">
                            {formatCurrency(
                              intelData.valuation?.currentListedPrice,
                              intelData.listingType
                            )}
                          </span>
                          <span className="intel-stat-box-sub">Asking Value</span>
                        </div>

                        <div className="intel-stat-box">
                          <span className="intel-stat-box-label">Variance</span>
                          <span
                            className="intel-stat-box-value"
                            style={{
                              color:
                                (intelData.valuation?.differenceAmount || 0) >= 0
                                  ? "#16a34a"
                                  : "#dc2626",
                            }}
                          >
                            {formatCurrency(
                              intelData.valuation?.differenceAmount,
                              intelData.listingType
                            )}{" "}
                            ({formatPercent(intelData.valuation?.differencePercentage, true)})
                          </span>
                          <span className="intel-stat-box-sub">
                            {intelData.valuation?.statusDetail || "Market alignment"}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Contributing Factors */}
                    {intelData.valuation?.contributingFactors?.length > 0 && (
                      <div className="intel-factors-list">
                        <div style={{ fontSize: "12px", fontWeight: 700, color: "#475569" }}>
                          Valuation Drivers & Contributing Adjustments:
                        </div>
                        {intelData.valuation.contributingFactors.map((factor, idx) => (
                          <div key={idx} className="intel-factor-row">
                            <span className={`intel-factor-badge ${factor.impact}`}>
                              {factor.impact === "positive"
                                ? "+ Premium"
                                : factor.impact === "negative"
                                ? "- Discount"
                                : "• Baseline"}
                            </span>
                            <div className="intel-factor-text">
                              <strong>{factor.name}:</strong> {factor.description}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="intel-disclaimer-box">
                      <span>ℹ️</span>
                      <span>
                        <strong>Valuation Transparency:</strong>{" "}
                        {intelData.valuation?.disclaimer}
                      </span>
                    </div>
                  </div>

                  {/* Feature 3: Automated Price Estimate */}
                  <div className="intel-feature-card">
                    <div className="intel-card-header">
                      <div className="intel-card-title-wrap">
                        <div className="intel-card-icon">🎯</div>
                        <div>
                          <h3 className="intel-card-title">Automated Price Estimate</h3>
                          <p className="intel-card-subtitle">
                            Recommended pricing based on active market comparable synthesis.
                          </p>
                        </div>
                      </div>

                      <span className="intel-quick-badge pos-badge-average">
                        Confidence: {intelData.priceEstimate?.confidence || "Moderate"}
                      </span>
                    </div>

                    <div className="intel-grid-2">
                      <div className="intel-stat-box">
                        <span className="intel-stat-box-label">Recommended Price</span>
                        <span className="intel-stat-box-value" style={{ color: "#2563eb" }}>
                          {formatCurrency(
                            intelData.priceEstimate?.recommendedPrice,
                            intelData.listingType
                          )}
                        </span>
                        <span className="intel-stat-box-sub">
                          Difference:{" "}
                          {formatCurrency(
                            intelData.priceEstimate?.differenceAmount,
                            intelData.listingType
                          )}{" "}
                          ({formatPercent(intelData.priceEstimate?.differencePercentage, true)})
                        </span>
                      </div>

                      <div className="intel-stat-box">
                        <div className="intel-progress-wrap">
                          <div className="intel-progress-header">
                            <span>Data Confidence Score</span>
                            <span>{intelData.priceEstimate?.confidenceScore || 0}%</span>
                          </div>
                          <div className="intel-progress-bar-bg">
                            <div
                              className="intel-progress-bar-fill blue"
                              style={{
                                width: `${intelData.priceEstimate?.confidenceScore || 0}%`,
                              }}
                            ></div>
                          </div>
                          <span className="intel-stat-box-sub" style={{ marginTop: "4px" }}>
                            {intelData.priceEstimate?.explanation}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Feature 4: Price per Sq.Ft Analytics */}
                  <div className="intel-feature-card">
                    <div className="intel-card-header">
                      <div className="intel-card-title-wrap">
                        <div className="intel-card-icon">📐</div>
                        <div>
                          <h3 className="intel-card-title">Price per Sq.Ft Analytics</h3>
                          <p className="intel-card-subtitle">
                            Area efficiency compared against localized market benchmarks.
                          </p>
                        </div>
                      </div>

                      <span
                        className={`intel-quick-badge ${getMarketPositionBadgeClass(
                          intelData.pricePerSqFtAnalytics?.marketPosition
                        )}`}
                      >
                        {intelData.pricePerSqFtAnalytics?.marketPosition || "Market Benchmark"}
                      </span>
                    </div>

                    {intelData.pricePerSqFtAnalytics?.hasValidArea ? (
                      intelData.listingType === "Rent" ? (
                        <div className="intel-grid-4">
                          <div className="intel-stat-box">
                            <span className="intel-stat-box-label">Asset Value / Sq.Ft</span>
                            <span className="intel-stat-box-value">
                              {intelData.pricePerSqFtAnalytics.formattedPricePerSqFt}
                            </span>
                            <span className="intel-stat-box-sub">
                              Total Area: {formatSqFt(intelData.area)}
                            </span>
                          </div>

                          <div className="intel-stat-box">
                            <span className="intel-stat-box-label">Monthly Rent / Sq.Ft</span>
                            <span className="intel-stat-box-value">
                              ₹{Math.round(intelData.pricePerSqFtAnalytics.rentPerSqFt || 0).toLocaleString("en-IN")}/sq.ft/month
                            </span>
                            <span className="intel-stat-box-sub">
                              Monthly Tenant Rate
                            </span>
                          </div>

                          <div className="intel-stat-box">
                            <span className="intel-stat-box-label">Comparable Sale Asset Average</span>
                            <span className="intel-stat-box-value">
                              {intelData.pricePerSqFtAnalytics.comparableAveragePricePerSqFt > 0
                                ? `₹${Math.round(
                                    intelData.pricePerSqFtAnalytics.comparableAveragePricePerSqFt
                                  ).toLocaleString("en-IN")}/sq.ft`
                                : "No Area Comps"}
                            </span>
                            <span className="intel-stat-box-sub">
                              Neighborhood Asset Comps
                            </span>
                          </div>

                          <div className="intel-stat-box">
                            <span className="intel-stat-box-label">Rate Variance</span>
                            <span
                              className="intel-stat-box-value"
                              style={{
                                color:
                                  (intelData.pricePerSqFtAnalytics.difference || 0) <= 0
                                    ? "#16a34a"
                                    : "#d97706",
                              }}
                            >
                              {formatPercent(
                                intelData.pricePerSqFtAnalytics.differencePercentage,
                                true
                              )}
                            </span>
                            <span className="intel-stat-box-sub">
                              {intelData.pricePerSqFtAnalytics.marketPosition}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="intel-grid-3">
                          <div className="intel-stat-box">
                            <span className="intel-stat-box-label">Property Price/Sq.Ft</span>
                            <span className="intel-stat-box-value">
                              {intelData.pricePerSqFtAnalytics.formattedPricePerSqFt}
                            </span>
                            <span className="intel-stat-box-sub">
                              Total Area: {formatSqFt(intelData.area)}
                            </span>
                          </div>

                          <div className="intel-stat-box">
                            <span className="intel-stat-box-label">Comparable Average Price/Sq.Ft</span>
                            <span className="intel-stat-box-value">
                              {intelData.pricePerSqFtAnalytics.comparableAveragePricePerSqFt > 0
                                ? `₹${Math.round(
                                    intelData.pricePerSqFtAnalytics.comparableAveragePricePerSqFt
                                  ).toLocaleString("en-IN")}/sq.ft`
                                : "No Area Comps"}
                            </span>
                            <span className="intel-stat-box-sub">
                              Neighborhood Average
                            </span>
                          </div>

                          <div className="intel-stat-box">
                            <span className="intel-stat-box-label">Rate Variance</span>
                            <span
                              className="intel-stat-box-value"
                              style={{
                                color:
                                  (intelData.pricePerSqFtAnalytics.difference || 0) <= 0
                                    ? "#16a34a"
                                    : "#d97706",
                              }}
                            >
                              ₹{Math.abs(Math.round(intelData.pricePerSqFtAnalytics.difference || 0)).toLocaleString("en-IN")}/sq.ft ({formatPercent(
                                intelData.pricePerSqFtAnalytics.differencePercentage,
                                true
                              )})
                            </span>
                            <span className="intel-stat-box-sub">
                              {intelData.pricePerSqFtAnalytics.marketPosition}
                            </span>
                          </div>
                        </div>
                      )
                    ) : (
                      <div className="intel-empty-state">
                        <div className="intel-empty-icon">📏</div>
                        <h4 className="intel-empty-title">Property Area Not Specified</h4>
                        <p className="intel-empty-desc">
                          This property does not have a recorded square footage in the system. Edit the property to add its area for full Price per Sq.Ft analytics.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ============================================================
                  TAB 2: MARKET COMPARABLES (Feature 2)
                  ============================================================ */}
              {activeTab === "comparables" && (
                <div className="intel-tab-pane">
                  <div className="intel-feature-card">
                    <div className="intel-card-header">
                      <div className="intel-card-title-wrap">
                        <div className="intel-card-icon">🏘️</div>
                        <div>
                          <h3 className="intel-card-title">Comparable Property Analysis</h3>
                          <p className="intel-card-subtitle">
                            Direct market comparisons within the same city ({property.city || "N/A"}) and property type ({property.property_type || "N/A"}).
                          </p>
                        </div>
                      </div>

                      <span className="intel-quick-badge pos-badge-average">
                        Found: {intelData.comparableAnalysis?.comparableCount || 0} Properties
                      </span>
                    </div>

                    {intelData.comparableAnalysis?.hasSufficientData ? (
                      <>
                        {/* 5 Key Metric Stats */}
                        <div className="intel-grid-4">
                          <div className="intel-stat-box">
                            <span className="intel-stat-box-label">Comparable Count</span>
                            <span className="intel-stat-box-value">
                              {intelData.comparableAnalysis.comparableCount}
                            </span>
                            <span className="intel-stat-box-sub">Verified Listings</span>
                          </div>

                          <div className="intel-stat-box">
                            <span className="intel-stat-box-label">Average Price</span>
                            <span className="intel-stat-box-value">
                              {formatCurrency(
                                intelData.comparableAnalysis.averagePrice,
                                intelData.listingType
                              )}
                            </span>
                            <span className="intel-stat-box-sub">
                              Median:{" "}
                              {formatCurrency(
                                intelData.comparableAnalysis.medianPrice,
                                intelData.listingType
                              )}
                            </span>
                          </div>

                          <div className="intel-stat-box">
                            <span className="intel-stat-box-label">Price Range</span>
                            <span className="intel-stat-box-value" style={{ fontSize: "15px" }}>
                              {formatCurrency(
                                intelData.comparableAnalysis.minPrice,
                                intelData.listingType
                              )}{" "}
                              –{" "}
                              {formatCurrency(
                                intelData.comparableAnalysis.maxPrice,
                                intelData.listingType
                              )}
                            </span>
                            <span className="intel-stat-box-sub">Min to Max</span>
                          </div>

                          <div className="intel-stat-box">
                            <span className="intel-stat-box-label">Avg Price/Sq.Ft</span>
                            <span className="intel-stat-box-value">
                              {intelData.comparableAnalysis.averagePricePerSqFt > 0
                                ? `₹${Math.round(
                                    intelData.comparableAnalysis.averagePricePerSqFt
                                  ).toLocaleString("en-IN")}/sq.ft`
                                : "N/A"}
                            </span>
                            <span className="intel-stat-box-sub">Area Benchmark</span>
                          </div>
                        </div>

                        {/* Comparables Table */}
                        <div className="intel-table-wrap">
                          <table className="intel-table">
                            <thead>
                              <tr>
                                <th>Property</th>
                                <th>Type</th>
                                <th>Listing</th>
                                <th>Price</th>
                                <th>Area</th>
                                <th>Price/Sq.Ft</th>
                                <th>BHK</th>
                                <th>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {intelData.comparableAnalysis.comparablesList?.map((comp) => (
                                <tr key={comp.id}>
                                  <td>
                                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                      {comp.primary_image ? (
                                        <img
                                          src={comp.primary_image}
                                          alt=""
                                          className="intel-comp-thumb"
                                        />
                                      ) : (
                                        <div className="intel-comp-thumb-ph">🏠</div>
                                      )}
                                      <div>
                                        <div style={{ fontWeight: 700, color: "#0f172a" }}>
                                          {comp.title}
                                        </div>
                                        <div style={{ fontSize: "11px", color: "#64748b" }}>
                                          #{comp.id} • {comp.city || "Unknown"}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td>{comp.property_type || "-"}</td>
                                  <td>
                                    <span
                                      className={`intel-badge-pill ${
                                        comp.listing_type === "Sale" ? "sale" : "rent"
                                      }`}
                                      style={{ padding: "2px 8px", fontSize: "11px" }}
                                    >
                                      {comp.listing_type || "-"}
                                    </span>
                                  </td>
                                  <td style={{ fontWeight: 700 }}>
                                    {formatCurrency(comp.price, comp.listing_type)}
                                  </td>
                                  <td>{comp.area ? formatSqFt(comp.area) : "N/A"}</td>
                                  <td style={{ color: "#475569", fontWeight: 600 }}>
                                    {comp.pricePerSqFt
                                      ? comp.listing_type === "Rent"
                                        ? `₹${comp.pricePerSqFt.toLocaleString("en-IN")}/sq.ft/month`
                                        : `₹${comp.pricePerSqFt.toLocaleString("en-IN")}/sq.ft`
                                      : "N/A"}
                                  </td>
                                  <td>{comp.bedrooms ? `${comp.bedrooms} BHK` : "-"}</td>
                                  <td>
                                    <span
                                      style={{
                                        fontSize: "11px",
                                        fontWeight: 700,
                                        color:
                                          comp.status === "Available"
                                            ? "#16a34a"
                                            : comp.status === "Sold"
                                            ? "#dc2626"
                                            : "#475569",
                                      }}
                                    >
                                      {comp.status || "Available"}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    ) : (
                      <div className="intel-empty-state">
                        <div className="intel-empty-icon">🏘️</div>
                        <h4 className="intel-empty-title">Insufficient Comparable Data</h4>
                        <p className="intel-empty-desc">
                          {intelData.comparableAnalysis?.reason ||
                            "No directly comparable properties found in this city/category. As new listings are added to the system, comparable analysis will populate automatically."}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ============================================================
                  TAB 3: INVESTMENT & FINANCIAL CALCULATORS (Features 5, 6, 7, 8)
                  ============================================================ */}
              {activeTab === "investment" && (
                <div className="intel-tab-pane">
                  {/* Feature 5: Property Investment Score */}
                  <div className="intel-feature-card">
                    <div className="intel-card-header">
                      <div className="intel-card-title-wrap">
                        <div className="intel-card-icon">⭐</div>
                        <div>
                          <h3 className="intel-card-title">Property Investment Score</h3>
                          <p className="intel-card-subtitle">
                            Comprehensive 0–100 investment attractiveness rating based on price competitiveness, yield, and demand.
                          </p>
                        </div>
                      </div>

                      <span
                        className={`intel-quick-badge ${getScoreBadgeClass(
                          intelData.investmentScore?.rating
                        )}`}
                        style={{ fontSize: "12px", padding: "5px 12px" }}
                      >
                        Rating: {intelData.investmentScore?.rating || "Average"}
                      </span>
                    </div>

                    <div className="intel-score-hero">
                      <div
                        className={`intel-score-circle ${
                          (intelData.investmentScore?.rating || "").toLowerCase()
                        }`}
                      >
                        <span className="intel-score-circle-num">
                          {intelData.investmentScore?.score ?? 0}
                        </span>
                        <span className="intel-score-circle-max">/ 100</span>
                      </div>

                      <div className="intel-score-hero-info">
                        <h3>
                          {intelData.investmentScore?.rating === "Excellent"
                            ? "Exceptional Investment Potential"
                            : intelData.investmentScore?.rating === "Good"
                            ? "Favorable Investment Fundamentals"
                            : intelData.investmentScore?.rating === "Average"
                            ? "Standard Market Fundamentals"
                            : "Cautious Investment Profile"}
                        </h3>
                        <p>
                          Algorithmic evaluation indicates this property scores{" "}
                          <strong>{intelData.investmentScore?.score ?? 0} out of 100</strong> across 5 analytical dimensions.
                        </p>

                        {/* Score Breakdown Progress Meters */}
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                            gap: "10px",
                            marginTop: "8px",
                          }}
                        >
                          {intelData.investmentScore?.breakdown &&
                            Object.entries(intelData.investmentScore.breakdown).map(
                              ([key, val]) => (
                                <div key={key} className="intel-progress-wrap">
                                  <div className="intel-progress-header">
                                    <span style={{ textTransform: "capitalize", fontSize: "11px" }}>
                                      {key.replace(/([A-Z])/g, " $1")}
                                    </span>
                                    <span>
                                      {val.score}/{val.max}
                                    </span>
                                  </div>
                                  <div className="intel-progress-bar-bg">
                                    <div
                                      className="intel-progress-bar-fill blue"
                                      style={{
                                        width: `${(val.score / val.max) * 100}%`,
                                      }}
                                    ></div>
                                  </div>
                                </div>
                              )
                            )}
                        </div>
                      </div>
                    </div>

                    {/* Drivers and Risk Factors */}
                    <div className="intel-drivers-row">
                      <div className="intel-driver-card positive">
                        <div className="intel-driver-title">
                          <span>✅</span> Key Positive Factors
                        </div>
                        <ul>
                          {intelData.investmentScore?.positiveFactors?.map((f, i) => (
                            <li key={i}>{f}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="intel-driver-card negative">
                        <div className="intel-driver-title">
                          <span>⚠️</span> Factors to Monitor & Considerations
                        </div>
                        <ul>
                          {intelData.investmentScore?.negativeFactors?.map((f, i) => (
                            <li key={i}>{f}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="intel-disclaimer-box">
                      <span>ℹ️</span>
                      <span>
                        <strong>Investment Disclaimer:</strong>{" "}
                        {intelData.investmentScore?.disclaimer}
                      </span>
                    </div>
                  </div>

                  {/* Feature 6: Rental Yield Calculator */}
                  <div className="intel-feature-card">
                    <div className="intel-card-header">
                      <div className="intel-card-title-wrap">
                        <div className="intel-card-icon">💵</div>
                        <div>
                          <h3 className="intel-card-title">Rental Yield Calculator</h3>
                          <p className="intel-card-subtitle">
                            Gross annual rental return relative to property asset valuation.
                          </p>
                        </div>
                      </div>

                      <span className="intel-quick-badge pos-badge-average">
                        {currentYield.yieldRating}
                      </span>
                    </div>

                    {/* Interactive Input */}
                    <div className="intel-calc-control-group">
                      <div className="intel-control-item">
                        <label htmlFor="custom-rent-input" className="intel-control-label">
                          Monthly Rent (₹):
                        </label>
                        <div className="intel-input-group">
                          <input
                            id="custom-rent-input"
                            type="number"
                            min="1000"
                            step="1000"
                            className="intel-number-input"
                            value={customMonthlyRent}
                            onChange={(e) => setCustomMonthlyRent(e.target.value)}
                            placeholder="Enter monthly rent..."
                          />
                          {intelData.rentalYield?.monthlyRent && (
                            <button
                              type="button"
                              className="intel-reset-btn"
                              onClick={() =>
                                setCustomMonthlyRent(String(intelData.rentalYield.monthlyRent))
                              }
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      </div>

                      <div style={{ fontSize: "12px", color: "#64748b", flex: 2 }}>
                        {intelData.rentalYield?.isRentListing ? (
                          <span>
                            ℹ️ Pre-filled from property listed monthly rental price.
                          </span>
                        ) : intelData.rentalYield?.isRentEstimated ? (
                          <span>
                            ℹ️ Benchmarked from comparable city rental data. You can customize the rent above to test scenarios.
                          </span>
                        ) : (
                          <span>
                            Enter projected monthly rent to compute the gross yield.
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="intel-grid-4">
                      <div className="intel-stat-box">
                        <span className="intel-stat-box-label">Monthly Rent</span>
                        <span className="intel-stat-box-value">
                          {formatCurrency(currentYield.monthlyRent, "Rent")}
                        </span>
                        <span className="intel-stat-box-sub">Income Basis</span>
                      </div>

                      <div className="intel-stat-box">
                        <span className="intel-stat-box-label">Annual Rental Income</span>
                        <span className="intel-stat-box-value">
                          {formatCurrency(currentYield.annualRentalIncome)}
                        </span>
                        <span className="intel-stat-box-sub">12 Months Gross</span>
                      </div>

                      <div className="intel-stat-box">
                        <span className="intel-stat-box-label">Property Valuation</span>
                        <span className="intel-stat-box-value">
                          {formatCurrency(currentYield.propertyValue)}
                        </span>
                        <span className="intel-stat-box-sub">Asset Cost Basis</span>
                      </div>

                      <div className="intel-stat-box">
                        <span className="intel-stat-box-label">Gross Rental Yield</span>
                        <span className="intel-stat-box-value" style={{ color: "#16a34a" }}>
                          {formatPercent(currentYield.grossRentalYield)}
                        </span>
                        <span className="intel-stat-box-sub">
                          {currentYield.yieldRating}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Feature 7: ROI Calculator */}
                  <div className="intel-feature-card">
                    <div className="intel-card-header">
                      <div className="intel-card-title-wrap">
                        <div className="intel-card-icon">📊</div>
                        <div>
                          <h3 className="intel-card-title">ROI Calculator (Return on Investment)</h3>
                          <p className="intel-card-subtitle">
                            Projected return combining capital appreciation and cumulative rental income.
                          </p>
                        </div>
                      </div>

                      <span className="intel-quick-badge pos-badge-average">
                        Holding Period: {holdingYears} Years
                      </span>
                    </div>

                    {/* Interactive Sliders */}
                    <div className="intel-calc-control-group">
                      <div className="intel-control-item">
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span className="intel-control-label">Holding Period:</span>
                          <strong style={{ fontSize: "12px", color: "#2563eb" }}>
                            {holdingYears} {holdingYears === 1 ? "Year" : "Years"}
                          </strong>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          step="1"
                          className="intel-range-slider"
                          value={holdingYears}
                          onChange={(e) => setHoldingYears(Number(e.target.value))}
                        />
                      </div>

                      <div className="intel-control-item">
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span className="intel-control-label">Annual Appreciation Rate:</span>
                          <strong style={{ fontSize: "12px", color: "#16a34a" }}>
                            {appreciationRate}% p.a.
                          </strong>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="15"
                          step="0.5"
                          className="intel-range-slider"
                          value={appreciationRate}
                          onChange={(e) => setAppreciationRate(Number(e.target.value))}
                        />
                      </div>
                    </div>

                    <div className="intel-grid-4">
                      <div className="intel-stat-box">
                        <span className="intel-stat-box-label">Initial Asset Value</span>
                        <span className="intel-stat-box-value">
                          {formatCurrency(currentRoi.initialPropertyValue)}
                        </span>
                        <span className="intel-stat-box-sub">Current Value</span>
                      </div>

                      <div className="intel-stat-box">
                        <span className="intel-stat-box-label">Projected Future Value</span>
                        <span className="intel-stat-box-value">
                          {formatCurrency(currentRoi.estimatedFutureValue)}
                        </span>
                        <span className="intel-stat-box-sub">
                          Gain: +{formatCurrency(currentRoi.capitalGain)}
                        </span>
                      </div>

                      <div className="intel-stat-box">
                        <span className="intel-stat-box-label">Cumulative Rental</span>
                        <span className="intel-stat-box-value">
                          {formatCurrency(currentRoi.cumulativeRentalIncome)}
                        </span>
                        <span className="intel-stat-box-sub">Over {holdingYears} Years</span>
                      </div>

                      <div className="intel-stat-box">
                        <span className="intel-stat-box-label">Total Projected ROI</span>
                        <span className="intel-stat-box-value" style={{ color: "#2563eb" }}>
                          {formatPercent(currentRoi.roiPercentage, true)}
                        </span>
                        <span className="intel-stat-box-sub">
                          Annualized: {formatPercent(currentRoi.annualizedRoiPercentage, true)}
                        </span>
                      </div>
                    </div>

                    <div className="intel-disclaimer-box">
                      <span>ℹ️</span>
                      <span>
                        <strong>Distinction & Disclosure:</strong>{" "}
                        {intelData.roiCalculator?.distinction}{" "}
                        {intelData.roiCalculator?.disclaimer}
                      </span>
                    </div>
                  </div>

                  {/* Feature 8: Property Appreciation Forecast */}
                  <div className="intel-feature-card">
                    <div className="intel-card-header">
                      <div className="intel-card-title-wrap">
                        <div className="intel-card-icon">📈</div>
                        <div>
                          <h3 className="intel-card-title">Property Appreciation Forecast</h3>
                          <p className="intel-card-subtitle">
                            Model-based capital appreciation trajectory across multiple investment horizons.
                          </p>
                        </div>
                      </div>

                      <span className="intel-quick-badge pos-badge-average">
                        Assumed Rate: {appreciationRate}% p.a.
                      </span>
                    </div>

                    <div className="intel-forecast-grid">
                      {currentForecasts.map((fc) => (
                        <div key={fc.periodYears} className="intel-forecast-box">
                          <span className="intel-forecast-period">{fc.label}</span>
                          <span className="intel-forecast-val">
                            {formatCurrency(fc.forecastValue)}
                          </span>
                          <span className="intel-forecast-gain">
                            +{formatCurrency(fc.estimatedGain)}
                          </span>
                          <span className="intel-forecast-growth">
                            Total Growth: {formatPercent(fc.growthPercentage, true)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="intel-disclaimer-box">
                      <span>ℹ️</span>
                      <span>
                        <strong>Model Methodology:</strong>{" "}
                        {intelData.appreciationForecast?.methodology}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* ============================================================
                  TAB 4: PROPERTY QUALITY SCORE (Feature 9)
                  ============================================================ */}
              {activeTab === "quality" && (
                <div className="intel-tab-pane">
                  <div className="intel-feature-card">
                    <div className="intel-card-header">
                      <div className="intel-card-title-wrap">
                        <div className="intel-card-icon">⭐</div>
                        <div>
                          <h3 className="intel-card-title">Property Quality Score</h3>
                          <p className="intel-card-subtitle">
                            Algorithmic index evaluating space proportions, location tier, media completeness, and property type desirability.
                          </p>
                        </div>
                      </div>

                      <span
                        className={`intel-quick-badge ${getQualityScoreClass(
                          intelData.qualityScore?.rating
                        )}`}
                        style={{ fontSize: "12px", padding: "5px 12px" }}
                      >
                        ● {intelData.qualityScore?.rating || "Average"}
                      </span>
                    </div>

                    {/* Quality Hero Banner */}
                    <div className="intel-quality-hero">
                      <div className="intel-quality-gauge">
                        <div className="intel-quality-gauge-num">
                          {intelData.qualityScore?.score ?? 0}
                        </div>
                        <div className="intel-quality-gauge-den">/ 100</div>
                      </div>
                      <div className="intel-quality-hero-info">
                        <div className="intel-quality-hero-title">
                          Quality Rating: <strong>{intelData.qualityScore?.rating}</strong>
                        </div>
                        <p className="intel-quality-hero-desc">
                          {intelData.qualityScore?.summary}
                        </p>
                      </div>
                    </div>

                    {/* 5 Factors Breakdown */}
                    <div className="intel-quality-factors">
                      <h4 className="intel-sub-heading">Individual Factor Breakdown</h4>
                      <div className="intel-factors-grid">
                        {intelData.qualityScore?.breakdown?.map((factor) => (
                          <div key={factor.factor} className="intel-factor-card">
                            <div className="intel-factor-header">
                              <div>
                                <span className="intel-factor-name">{factor.factor}</span>
                                <span className="intel-factor-weight"> (Weight: {factor.weight})</span>
                              </div>
                              <div className="intel-factor-score-pill">
                                <strong>{factor.score}</strong> / {factor.maxScore} pts
                              </div>
                            </div>

                            {/* Progress bar */}
                            <div className="intel-factor-progress-bg">
                              <div
                                className={`intel-factor-progress-fill ${getQualityScoreClass(factor.status)}`}
                                style={{
                                  width: `${Math.round((factor.score / factor.maxScore) * 100)}%`,
                                }}
                              ></div>
                            </div>

                            <div className="intel-factor-details">
                              {factor.details}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Calculation Explanation */}
                    <div className="intel-disclaimer-box">
                      <span>ℹ️</span>
                      <span>
                        <strong>Scoring Methodology:</strong>{" "}
                        {intelData.qualityScore?.methodology}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* ============================================================
                  TAB 5: AI PROPERTY DESCRIPTION GENERATOR (Feature 10)
                  ============================================================ */}
              {activeTab === "description" && (
                <div className="intel-tab-pane">
                  <div className="intel-feature-card">
                    <div className="intel-card-header">
                      <div className="intel-card-title-wrap">
                        <div className="intel-card-icon">🤖</div>
                        <div>
                          <h3 className="intel-card-title">AI Property Description Generator</h3>
                          <p className="intel-card-subtitle">
                            Automated, publication-ready real-estate marketing copy generated from verified property specifications.
                          </p>
                        </div>
                      </div>

                      <span className="intel-quick-badge pos-badge-average">
                        ⚡ Provider-Ready Generator
                      </span>
                    </div>

                    {/* Generator Controls Bar */}
                    <div className="intel-desc-controls">
                      <div className="intel-desc-tone-group">
                        <label htmlFor="intel-desc-tone" className="intel-input-label">
                          Copywriting Tone / Style:
                        </label>
                        <select
                          id="intel-desc-tone"
                          className="intel-desc-select"
                          value={descriptionTone}
                          onChange={(e) => {
                            const newTone = e.target.value;
                            setDescriptionTone(newTone);
                            handleGenerateDescription(newTone);
                          }}
                        >
                          <option value="luxury">👑 Executive / Luxury Appeal</option>
                          <option value="family">🏡 Family & Neighborhood Comfort</option>
                          <option value="investment">📈 High-Yield Investor Focus</option>
                          <option value="concise">⚡ Concise / Punchy Summary</option>
                        </select>
                      </div>

                      <div className="intel-desc-btn-group">
                        <button
                          type="button"
                          className="intel-desc-btn-gen"
                          onClick={() => handleGenerateDescription(descriptionTone)}
                          disabled={isGenerating}
                        >
                          {isGenerating ? "⏳ Generating..." : "🔄 Regenerate"}
                        </button>

                        <button
                          type="button"
                          className={`intel-desc-btn-copy ${copied ? "copied" : ""}`}
                          onClick={handleCopyDescription}
                          disabled={!displayDesc?.fullDescription}
                        >
                          {copied ? "✓ Copied to Clipboard!" : "📋 Copy Description"}
                        </button>
                      </div>
                    </div>

                    {/* Generated Description Display Box */}
                    <div className="intel-desc-preview-card">
                      <div className="intel-desc-preview-top">
                        <div className="intel-desc-headline">
                          {displayDesc?.headline || property.title}
                        </div>
                        <div className="intel-desc-meta-tags">
                          <span className="intel-desc-tag">
                            📝 {displayDesc?.wordCount || 0} Words
                          </span>
                          <span className="intel-desc-tag">
                            🔤 {displayDesc?.characterCount || 0} Chars
                          </span>
                          <span className="intel-desc-tag tone-tag">
                            Tone: {descriptionTone}
                          </span>
                        </div>
                      </div>

                      <div className="intel-desc-body-text">
                        {displayDesc?.lead && (
                          <p className="intel-desc-para intel-desc-lead">
                            {displayDesc.lead}
                          </p>
                        )}
                        {displayDesc?.body && (
                          <p className="intel-desc-para">
                            {displayDesc.body}
                          </p>
                        )}
                        {displayDesc?.conclusion && (
                          <p className="intel-desc-para intel-desc-conclusion">
                            {displayDesc.conclusion}
                          </p>
                        )}
                      </div>

                      {/* Key Highlights Bullets */}
                      {displayDesc?.highlights && displayDesc.highlights.length > 0 && (
                        <div className="intel-desc-highlights">
                          <div className="intel-desc-highlights-title">Key Property Highlights</div>
                          <ul className="intel-desc-highlights-list">
                            {displayDesc.highlights.map((item, idx) => (
                              <li key={idx}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Architecture & Provider Status Note */}
                    <div className="intel-disclaimer-box">
                      <span>ℹ️</span>
                      <span>
                        <strong>AI Provider Architecture:</strong> Built using our modular real-estate copywriting engine with verified property metadata. Pre-configured for direct connection with OpenAI, Gemini, or Claude providers when API keys are configured.
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default PropertyIntelligenceModal;
