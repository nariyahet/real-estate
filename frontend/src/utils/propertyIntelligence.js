/**
 * Frontend Property Intelligence Utilities
 * Provides formatting and real-time interactive calculations
 */

export const formatCurrency = (value, listingType = "Sale") => {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) {
    return "₹0";
  }

  const formatted = Math.round(num).toLocaleString("en-IN");
  if (listingType === "Rent") {
    return `₹${formatted}/mo`;
  }
  return `₹${formatted}`;
};

export const formatPercent = (value, includeSign = false) => {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return "0.0%";
  }

  const prefix = includeSign && num > 0 ? "+" : "";
  return `${prefix}${num.toFixed(1)}%`;
};

export const formatSqFt = (area) => {
  const num = Number(area);
  if (!Number.isFinite(num) || num <= 0) {
    return "N/A";
  }
  return `${Math.round(num).toLocaleString("en-IN")} sq.ft`;
};

export const getScoreBadgeClass = (rating) => {
  switch (rating) {
    case "Excellent":
      return "score-badge-excellent";
    case "Good":
      return "score-badge-good";
    case "Average":
      return "score-badge-average";
    case "Weak":
    default:
      return "score-badge-weak";
  }
};

export const getValuationBadgeClass = (status) => {
  switch (status) {
    case "Undervalued":
      return "val-badge-undervalued";
    case "Overvalued":
      return "val-badge-overvalued";
    case "Fair Value":
    default:
      return "val-badge-fair";
  }
};

export const getMarketPositionBadgeClass = (position) => {
  if (position?.includes("Below")) {
    return "pos-badge-below";
  }
  if (position?.includes("Above")) {
    return "pos-badge-above";
  }
  return "pos-badge-average";
};

/**
 * Interactive Client-Side Rental Yield Recalculation
 */
export const recalculateRentalYield = (propertyValue, monthlyRent) => {
  const val = Number(propertyValue) || 0;
  const rent = Number(monthlyRent) || 0;

  if (val <= 0 || rent <= 0) {
    return {
      monthlyRent: rent,
      annualRentalIncome: rent * 12,
      propertyValue: val,
      grossRentalYield: 0,
      yieldRating: "Unavailable",
    };
  }

  const annualIncome = rent * 12;
  const grossRentalYield = Math.round((annualIncome / val) * 1000) / 10;

  let yieldRating;
  if (grossRentalYield >= 6.0) yieldRating = "High Yield";
  else if (grossRentalYield >= 4.0) yieldRating = "Healthy Yield";
  else if (grossRentalYield >= 2.5) yieldRating = "Moderate Yield";
  else yieldRating = "Low Yield";

  return {
    monthlyRent: rent,
    annualRentalIncome: annualIncome,
    propertyValue: val,
    grossRentalYield,
    yieldRating,
  };
};

/**
 * Interactive Client-Side ROI Recalculation
 */
export const recalculateROI = (initialValue, annualRent, holdingYears, appreciationRate) => {
  const initVal = Number(initialValue) || 0;
  const rent = Number(annualRent) || 0;
  const years = Math.max(1, Number(holdingYears) || 5);
  const rate = Number(appreciationRate) || 5.5;

  if (initVal <= 0) {
    return {
      initialPropertyValue: 0,
      estimatedFutureValue: 0,
      capitalGain: 0,
      cumulativeRentalIncome: 0,
      totalEstimatedGain: 0,
      roiPercentage: 0,
      annualizedRoiPercentage: 0,
    };
  }

  const futureVal = Math.round(initVal * Math.pow(1 + rate / 100, years));
  const capitalGain = futureVal - initVal;
  const cumulativeRent = Math.round(rent * years);
  const totalGain = capitalGain + cumulativeRent;
  const roiPct = Math.round((totalGain / initVal) * 1000) / 10;

  let annualizedRoi = 0;
  if (totalGain > -initVal) {
    annualizedRoi = Math.round(
      (Math.pow(1 + totalGain / initVal, 1 / years) - 1) * 1000
    ) / 10;
  }

  return {
    initialPropertyValue: initVal,
    estimatedFutureValue: futureVal,
    capitalGain,
    cumulativeRentalIncome: cumulativeRent,
    totalEstimatedGain: totalGain,
    roiPercentage: roiPct,
    annualizedRoiPercentage: annualizedRoi,
  };
};

/**
 * Interactive Client-Side Appreciation Forecast Recalculation
 */
export const recalculateAppreciation = (baseValue, annualRate) => {
  const val = Number(baseValue) || 0;
  const rate = Number(annualRate) || 5.5;

  const periods = [1, 3, 5, 10];
  return periods.map((years) => {
    const futureVal = Math.round(val * Math.pow(1 + rate / 100, years));
    const gain = futureVal - val;
    const growthPct = val > 0
      ? Math.round(((futureVal - val) / val) * 1000) / 10
      : 0;

    return {
      periodYears: years,
      label: `${years} Year${years > 1 ? "s" : ""}`,
      forecastValue: futureVal,
      estimatedGain: gain,
      growthPercentage: growthPct,
    };
  });
};

/**
 * Property Quality Score Badge Class
 */
export const getQualityScoreClass = (rating) => {
  switch (rating) {
    case "Excellent":
      return "quality-badge-excellent";
    case "Good":
      return "quality-badge-good";
    case "Average":
      return "quality-badge-average";
    case "Needs Improvement":
    default:
      return "quality-badge-improvement";
  }
};

/**
 * Client-Side Dynamic AI Property Description Generator
 * Enables instant interactive tone switching and regeneration in the modal
 */
export const generateClientPropertyDescription = (property, tone = "luxury") => {
  const selectedTone = (tone || "luxury").toLowerCase();
  const propType = property.property_type || "Residence";
  const city = property.city || "Prime City";
  const state = property.state ? `, ${property.state}` : "";
  const bedrooms = Number(property.bedrooms) || 0;
  const bathrooms = Number(property.bathrooms) || 0;
  const area = Number(property.area) || 0;
  const listingType = property.listing_type || "Sale";
  const price = Number(property.price) || 0;
  const status = property.status || "Available";
  const featured = Boolean(property.featured && property.featured !== 0 && property.featured !== "0");

  const formattedPrice = price > 0 ? `₹${Math.round(price).toLocaleString("en-IN")}` : "Price on Request";
  const formattedArea = area > 0 ? `${Math.round(area).toLocaleString("en-IN")} sq.ft` : "generous layout";
  const bedText = bedrooms > 0 ? `${bedrooms} BHK` : "";
  const bedLong = bedrooms > 0 ? `${bedrooms} spacious bedroom${bedrooms > 1 ? "s" : ""}` : "versatile living spaces";
  const bathLong = bathrooms > 0 ? `${bathrooms} modern bathroom${bathrooms > 1 ? "s" : ""}` : "well-appointed bathrooms";
  const rentSuffix = listingType === "Rent" ? "/month" : "";

  const isRent = listingType === "Rent";
  const isAvailable = status === "Available";
  const isSold = status === "Sold";
  const isRented = status === "Rented";
  const isInactive = status === "Inactive";

  // Truthful status-aware transaction phrasing
  let statusPhrase;
  if (isAvailable) {
    statusPhrase = isRent
      ? `Available for rent at ${formattedPrice}/month.`
      : `Available for purchase at ${formattedPrice}.`;
  } else if (isSold) {
    statusPhrase = isRent
      ? `Previously listed for rent at ${formattedPrice}/month (Current Status: Sold).`
      : `Previously sold / off-market at ${formattedPrice}.`;
  } else if (isRented) {
    statusPhrase = `Currently rented at ${formattedPrice}/month.`;
  } else if (isInactive) {
    statusPhrase = `Currently off-market (previously listed at ${formattedPrice}${rentSuffix}).`;
  } else {
    statusPhrase = `Listed at ${formattedPrice}${rentSuffix} (${status}).`;
  }

  let headline;
  let lead;
  let body;
  let conclusion;

  switch (selectedTone) {
    case "family":
      headline = `Welcoming ${bedText ? `${bedText} ` : ""}${propType} – The Ideal Home in ${city}`;
      lead = `Welcome to this warm and inviting ${propType.toLowerCase()} nestled in ${city}${state}. Designed for family comfort and modern harmony, this home provides a serene sanctuary while keeping you seamlessly connected to neighborhood conveniences.`;
      body = `Spanning ${formattedArea}, the residence features ${bedLong} and ${bathLong}. Every room has been planned to optimize daily comfort, natural airflow, and family togetherness.`;
      conclusion = `${statusPhrase} This property represents an outstanding opportunity for families seeking lasting security, community, and comfort in ${city}.`;
      break;

    case "investment":
      headline = `High-Growth Real Estate Opportunity: ${propType} in ${city}`;
      lead = `A high-potential real-estate asset strategically positioned in one of ${city}'s high-demand growth corridors. This ${propType.toLowerCase()} delivers an exceptional combination of capital appreciation and attractive rental liquidity.`;
      body = `Encompassing a high-efficiency footprint of ${formattedArea} with ${bedLong} and ${bathLong}, the asset is engineered for strong tenant attraction and durable long-term valuation in ${city}${state}.`;
      conclusion = `${statusPhrase} This asset offers immediate market readiness and compelling risk-adjusted yields for astute investors.`;
      break;

    case "concise":
      headline = `Prime ${bedText ? `${bedText} ` : ""}${propType} | ${city} | ${formattedPrice}`;
      lead = `Well-maintained ${propType.toLowerCase()} in a sought-after precinct of ${city}${state}. Current Status: ${status}.`;
      body = `Key specs include ${formattedArea} total area, ${bedLong}, ${bathLong}, and verified ${listingType.toLowerCase()} tier.`;
      conclusion = `${statusPhrase} Immediate inspection and acquisition details available upon inquiry.`;
      break;

    case "luxury":
    default:
      headline = `Exclusive ${bedText ? `${bedText} ` : ""}${propType} in Prime ${city}`;
      lead = `Presenting an extraordinary opportunity to acquire this distinguished ${propType.toLowerCase()} located in ${city}${state}. Crafted for discerning occupants who value quality, elegance, and effortless urban connectivity.`;
      body = `Boasting an expansive ${formattedArea} floor plan, this fine property accommodates ${bedLong} and ${bathLong}. Contemporary finishes, abundant natural sunlight, and balanced proportions define every corner of the living space.`;
      conclusion = `${statusPhrase} Positioned moments away from premier business districts, transport links, and lifestyle destinations.`;
      break;
  }

  const fullDescription = `${headline}\n\n${lead}\n\n${body}\n\n${conclusion}`;

  const highlights = [
    `📐 Total Footprint: ${formattedArea}`,
    `🛏️ Living Spaces: ${bedrooms > 0 ? `${bedrooms} Bedroom${bedrooms > 1 ? "s" : ""}` : "Open Plan"}${bathrooms > 0 ? `, ${bathrooms} Bathroom${bathrooms > 1 ? "s" : ""}` : ""}`,
    `📍 Prime Location: ${city}${state}`,
    `🏷️ Listed For: ${listingType} at ${formattedPrice}${rentSuffix}`,
    `⚡ Listing Status: ${status} ${featured ? "(⭐ Featured Listing)" : ""}`.trim(),
  ];

  return {
    tone: selectedTone,
    headline,
    lead,
    body,
    conclusion,
    fullDescription,
    highlights,
    wordCount: fullDescription.split(/\s+/).filter(Boolean).length,
    characterCount: fullDescription.length,
    provider: "deterministic_copywriter",
    providerReady: true,
    model: "antigravity-realestate-copywriter-v1",
    generatedAt: new Date().toISOString(),
  };
};
