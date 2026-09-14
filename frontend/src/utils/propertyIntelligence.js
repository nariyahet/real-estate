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
