/**
 * Property Intelligence Engine
 * 
 * Modular calculation engine for the 8 Phase 1 Property Intelligence features:
 * 1. Automated Property Valuation
 * 2. Comparable Property Analysis
 * 3. Automated Price Estimate
 * 4. Price per Sq.Ft Analytics
 * 5. Property Investment Score (0-100)
 * 6. Rental Yield Calculator
 * 7. ROI Calculator
 * 8. Property Appreciation Forecast
 */

/**
 * Feature 4: Calculate Price per Sq.Ft Analytics
 * Price per Sq.Ft = Property Price / Property Area
 */
function calculatePricePerSqFt(price, area) {
  const numPrice = Number(price);
  const numArea = Number(area);

  if (!Number.isFinite(numPrice) || numPrice <= 0 || !Number.isFinite(numArea) || numArea <= 0) {
    return {
      pricePerSqFt: null,
      formattedPricePerSqFt: "N/A",
      hasValidArea: false,
      rawArea: Number.isFinite(numArea) && numArea > 0 ? numArea : 0,
      rawPrice: Number.isFinite(numPrice) && numPrice > 0 ? numPrice : 0,
    };
  }

  const ppsf = Math.round((numPrice / numArea) * 100) / 100;
  return {
    pricePerSqFt: ppsf,
    formattedPricePerSqFt: `₹${Math.round(ppsf).toLocaleString("en-IN")}/sq.ft`,
    hasValidArea: true,
    rawArea: numArea,
    rawPrice: numPrice,
  };
}

/**
 * Feature 2: Comparable Property Analysis
 * Aggregates statistics from genuine comparable properties in the database
 */
function calculateComparableStats(targetProperty, comparables = []) {
  const targetPrice = Number(targetProperty.price) || 0;
  const targetArea = Number(targetProperty.area) || 0;
  const targetListing = targetProperty.listing_type || "Sale";
  const targetPpsf = targetArea > 0 ? targetPrice / targetArea : null;

  // Filter out target property if present and only consider valid price items
  const validComps = comparables.filter(
    (c) => Number(c.id) !== Number(targetProperty.id) && Number(c.price) > 0
  );

  if (validComps.length === 0) {
    return {
      hasSufficientData: false,
      comparableCount: 0,
      averagePrice: 0,
      minPrice: 0,
      maxPrice: 0,
      medianPrice: 0,
      averagePricePerSqFt: 0,
      priceComparisonDiff: 0,
      priceComparisonPercentage: 0,
      pricePerSqFtComparisonDiff: 0,
      pricePerSqFtComparisonPercentage: 0,
      comparablesList: [],
      reason: `No matching ${targetProperty.property_type || "similar"} properties found in ${targetProperty.city || "this city"}.`,
    };
  }

  const prices = validComps.map((c) => Number(c.price));
  const totalPrice = prices.reduce((acc, p) => acc + p, 0);
  const avgPrice = Math.round(totalPrice / prices.length);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  // Median price
  const sortedPrices = [...prices].sort((a, b) => a - b);
  const midIndex = Math.floor(sortedPrices.length / 2);
  const medianPrice = sortedPrices.length % 2 !== 0
    ? sortedPrices[midIndex]
    : Math.round((sortedPrices[midIndex - 1] + sortedPrices[midIndex]) / 2);

  // Price per Sq.Ft stats for comps with valid area
  const compsWithArea = validComps.filter((c) => Number(c.area) > 0);
  let avgPricePerSqFt = 0;
  if (compsWithArea.length > 0) {
    const totalPpsf = compsWithArea.reduce(
      (acc, c) => acc + (Number(c.price) / Number(c.area)),
      0
    );
    avgPricePerSqFt = Math.round((totalPpsf / compsWithArea.length) * 100) / 100;
  }

  // Comparison against target property price
  const priceDiff = targetPrice - avgPrice;
  const priceDiffPct = avgPrice > 0
    ? Math.round(((targetPrice - avgPrice) / avgPrice) * 1000) / 10
    : 0;

  // Comparison against target property PPSF
  let ppsfDiff = 0;
  let ppsfDiffPct = 0;
  if (targetPpsf !== null && avgPricePerSqFt > 0) {
    ppsfDiff = Math.round((targetPpsf - avgPricePerSqFt) * 100) / 100;
    ppsfDiffPct = Math.round(((targetPpsf - avgPricePerSqFt) / avgPricePerSqFt) * 1000) / 10;
  }

  // Enriched comparables list
  const enrichedList = validComps.slice(0, 10).map((c) => {
    const cPrice = Number(c.price);
    const cArea = Number(c.area);
    const cPpsf = cArea > 0 ? Math.round(cPrice / cArea) : null;
    return {
      id: c.id,
      title: c.title || "Untitled Property",
      property_type: c.property_type,
      listing_type: c.listing_type,
      price: cPrice,
      area: cArea > 0 ? cArea : null,
      bedrooms: Number(c.bedrooms) || 0,
      bathrooms: Number(c.bathrooms) || 0,
      city: c.city,
      status: c.status,
      pricePerSqFt: cPpsf,
      primary_image: c.primary_image || c.image_url || null,
    };
  });

  return {
    hasSufficientData: true,
    comparableCount: validComps.length,
    averagePrice: avgPrice,
    minPrice,
    maxPrice,
    medianPrice,
    averagePricePerSqFt: avgPricePerSqFt,
    priceComparisonDiff: priceDiff,
    priceComparisonPercentage: priceDiffPct,
    pricePerSqFtComparisonDiff: ppsfDiff,
    pricePerSqFtComparisonPercentage: ppsfDiffPct,
    comparablesList: enrichedList,
  };
}

/**
 * Feature 1: Automated Property Valuation
 * Calculates estimated market value based on location, area, bedrooms, bathrooms, listing type, and comps
 */
function calculateValuation(targetProperty, compStats) {
  const currentPrice = Number(targetProperty.price) || 0;
  const area = Number(targetProperty.area) || 0;
  const bedrooms = Number(targetProperty.bedrooms) || 0;
  const bathrooms = Number(targetProperty.bathrooms) || 0;
  const isFeatured = Boolean(targetProperty.featured);
  const status = targetProperty.status || "Available";

  const factors = [];
  let baseValue = currentPrice;

  if (compStats.hasSufficientData && compStats.averagePricePerSqFt > 0 && area > 0) {
    // Benchmark driven by genuine market PPSF
    baseValue = compStats.averagePricePerSqFt * area;
    factors.push({
      name: "Market Rate per Sq.Ft",
      impact: "neutral",
      description: `Baseline market rate: ₹${Math.round(compStats.averagePricePerSqFt).toLocaleString("en-IN")}/sq.ft for ${targetProperty.city || "this city"}.`,
    });
  } else if (compStats.hasSufficientData && compStats.averagePrice > 0) {
    baseValue = compStats.averagePrice;
    factors.push({
      name: "Comparable Property Baseline",
      impact: "neutral",
      description: `Derived from average price of ${compStats.comparableCount} comparable properties.`,
    });
  } else {
    // Transparent heuristic baseline when no direct comps exist
    baseValue = currentPrice > 0 ? currentPrice : 1000000;
    factors.push({
      name: "Listing Price Baseline",
      impact: "neutral",
      description: "Baseline set to listed price due to limited historical comparables in this specific category.",
    });
  }

  // Bedroom adjustment: check if bedrooms add/subtract value
  let adjustmentMultiplier = 1.0;

  if (bedrooms >= 4) {
    adjustmentMultiplier += 0.06;
    factors.push({
      name: "High Bedroom Capacity",
      impact: "positive",
      description: `${bedrooms} BHK configuration commands a premium (+6%).`,
    });
  } else if (bedrooms === 3) {
    adjustmentMultiplier += 0.03;
    factors.push({
      name: "Standard 3 BHK Configuration",
      impact: "positive",
      description: "Optimal demand tier for families (+3%).",
    });
  } else if (bedrooms === 1) {
    adjustmentMultiplier -= 0.03;
    factors.push({
      name: "Compact 1 BHK Sizing",
      impact: "negative",
      description: "Compact layout typically attracts a modest size discount (-3%).",
    });
  }

  // Bathroom adjustment
  if (bathrooms >= 3) {
    adjustmentMultiplier += 0.03;
    factors.push({
      name: "Multiple Bathrooms",
      impact: "positive",
      description: `${bathrooms} bathrooms enhance tenant/buyer utility (+3%).`,
    });
  }

  // Featured listing
  if (isFeatured) {
    adjustmentMultiplier += 0.02;
    factors.push({
      name: "Prime Featured Status",
      impact: "positive",
      description: "Featured property positioning and elevated market visibility (+2%).",
    });
  }

  // Status adjustment
  if (status === "Sold") {
    factors.push({
      name: "Realized Market Sale",
      impact: "neutral",
      description: "Property is already sold; valuation reflects finalized market transaction.",
    });
  } else if (status === "Inactive") {
    adjustmentMultiplier -= 0.05;
    factors.push({
      name: "Inactive Listing",
      impact: "negative",
      description: "Inactive market presence reduces active liquidity (-5%).",
    });
  }

  const estimatedValue = Math.round(baseValue * adjustmentMultiplier);
  const diffAmount = estimatedValue - currentPrice;
  const diffPct = currentPrice > 0
    ? Math.round(((estimatedValue - currentPrice) / currentPrice) * 1000) / 10
    : 0;

  // Valuation Status
  // Undervalued: listed price is at least 5% lower than estimated value
  // Overvalued: listed price is at least 5% higher than estimated value
  // Fair Value: listed price is within +/- 5% of estimated value
  let valuationStatus = "Fair Value";
  let statusDetail = "Listed price is aligned with fair market value.";

  if (currentPrice > 0) {
    const ratio = currentPrice / estimatedValue;
    if (ratio < 0.95) {
      valuationStatus = "Undervalued";
      statusDetail = `Attractively priced at ${Math.abs(diffPct)}% below estimated market value.`;
    } else if (ratio > 1.05) {
      valuationStatus = "Overvalued";
      statusDetail = `Listed at a ${Math.abs(diffPct)}% premium over estimated market value.`;
    }
  }

  return {
    estimatedMarketValue: estimatedValue,
    currentListedPrice: currentPrice,
    differenceAmount: diffAmount,
    differencePercentage: diffPct,
    valuationStatus,
    statusDetail,
    contributingFactors: factors,
    disclaimer: "This automated valuation is an algorithmic estimate based on statistical market data and property attributes. It is not a certified professional appraisal.",
  };
}

/**
 * Feature 3: Automated Price Estimate
 * Recommended price based on attribute analysis and market comparables
 */
function calculatePriceEstimate(targetProperty, compStats, valuation) {
  const currentPrice = Number(targetProperty.price) || 0;
  const estimatedVal = valuation.estimatedMarketValue || currentPrice;

  // Recommended price blends estimated market value with listed price for stabilization
  let recommendedPrice = estimatedVal;
  let confidence = "Moderate";
  let confidenceScore = 65;
  let explanation = "";

  if (compStats.hasSufficientData && compStats.comparableCount >= 3) {
    confidence = "High";
    confidenceScore = 88;
    // 80% weighted on comps valuation, 20% on current price
    recommendedPrice = Math.round(estimatedVal * 0.85 + currentPrice * 0.15);
    explanation = `High confidence estimate backed by ${compStats.comparableCount} comparable market properties in ${targetProperty.city || "this city"}.`;
  } else if (compStats.hasSufficientData && compStats.comparableCount >= 1) {
    confidence = "Moderate";
    confidenceScore = 65;
    recommendedPrice = Math.round(estimatedVal * 0.7 + currentPrice * 0.3);
    explanation = `Moderate confidence estimate based on ${compStats.comparableCount} comparable property and attribute adjustments.`;
  } else {
    confidence = "Preliminary Estimate";
    confidenceScore = 40;
    recommendedPrice = currentPrice > 0 ? currentPrice : estimatedVal;
    explanation = "Preliminary estimate based on property attributes; localized historical comparable density is limited.";
  }

  const diffAmount = recommendedPrice - currentPrice;
  const diffPct = currentPrice > 0
    ? Math.round(((recommendedPrice - currentPrice) / currentPrice) * 1000) / 10
    : 0;

  return {
    currentPrice,
    recommendedPrice,
    differenceAmount: diffAmount,
    differencePercentage: diffPct,
    confidence,
    confidenceScore,
    explanation,
    isStatisticalEstimate: true,
  };
}

/**
 * Feature 5: Property Investment Score (0-100)
 * Transparent 100-point multi-factor investment score
 */
function calculateInvestmentScore(targetProperty, valuation, compStats, ppsfStats, rentalYieldResult) {
  let score = 0;
  const scoreBreakdown = {};
  const positiveFactors = [];
  const negativeFactors = [];

  // 1. Price Competitiveness & Valuation (0-30 pts)
  let priceScore = 20; // baseline fair value
  if (valuation.valuationStatus === "Undervalued") {
    priceScore = 28;
    positiveFactors.push(`Attractively priced: ${Math.abs(valuation.differencePercentage)}% below algorithmic market estimate.`);
  } else if (valuation.valuationStatus === "Fair Value") {
    priceScore = 22;
    positiveFactors.push("Priced fairly within expected market boundaries.");
  } else if (valuation.valuationStatus === "Overvalued") {
    priceScore = 10;
    negativeFactors.push(`Asking price is ${Math.abs(valuation.differencePercentage)}% higher than estimated fair market value.`);
  }
  score += priceScore;
  scoreBreakdown.priceCompetitiveness = { score: priceScore, max: 30 };

  // 2. Rental Yield Potential (0-25 pts)
  let yieldScore = 15;
  const yieldVal = rentalYieldResult.grossRentalYield || 0;
  if (yieldVal >= 6.5) {
    yieldScore = 24;
    positiveFactors.push(`High gross rental yield of ${yieldVal}% p.a. provides strong cash-flow generation.`);
  } else if (yieldVal >= 4.5) {
    yieldScore = 20;
    positiveFactors.push(`Healthy rental yield of ${yieldVal}% p.a. in-line with premium residential benchmarks.`);
  } else if (yieldVal >= 3.0) {
    yieldScore = 15;
    positiveFactors.push(`Moderate rental yield of ${yieldVal}% p.a.`);
  } else if (yieldVal > 0) {
    yieldScore = 8;
    negativeFactors.push(`Lower current rental yield of ${yieldVal}% p.a. requires reliance on capital appreciation.`);
  } else {
    yieldScore = 12; // neutral if rent data unassessed
  }
  score += yieldScore;
  scoreBreakdown.rentalPotential = { score: yieldScore, max: 25 };

  // 3. Price per Sq.Ft Efficiency (0-20 pts)
  let ppsfScore = 14;
  if (ppsfStats.hasValidArea && compStats.hasSufficientData && compStats.averagePricePerSqFt > 0) {
    const ppsfRatio = ppsfStats.pricePerSqFt / compStats.averagePricePerSqFt;
    if (ppsfRatio < 0.92) {
      ppsfScore = 19;
      positiveFactors.push(`Competitive rate of ₹${Math.round(ppsfStats.pricePerSqFt).toLocaleString("en-IN")}/sq.ft (${Math.round((1 - ppsfRatio) * 100)}% lower than local average).`);
    } else if (ppsfRatio <= 1.05) {
      ppsfScore = 15;
      positiveFactors.push("Price per Sq.Ft aligns closely with neighborhood averages.");
    } else {
      ppsfScore = 8;
      negativeFactors.push(`Higher cost basis: ₹${Math.round(ppsfStats.pricePerSqFt).toLocaleString("en-IN")}/sq.ft exceeds comparable average.`);
    }
  } else if (!ppsfStats.hasValidArea) {
    ppsfScore = 10;
    negativeFactors.push("Property area not specified; Sq.Ft efficiency could not be fully benchmarked.");
  }
  score += ppsfScore;
  scoreBreakdown.pricePerSqFtEfficiency = { score: ppsfScore, max: 20 };

  // 4. Property Specifications & Market Demand (0-15 pts)
  let specScore = 10;
  const pType = targetProperty.property_type;
  if (["Apartment", "Villa"].includes(pType)) {
    specScore += 3;
    positiveFactors.push(`High liquidity property category: ${pType}.`);
  } else if (["House", "Office"].includes(pType)) {
    specScore += 2;
  }

  if (targetProperty.status === "Available") {
    specScore += 2;
  } else if (targetProperty.status === "Inactive") {
    specScore -= 4;
    negativeFactors.push("Listing is currently marked as Inactive.");
  }
  specScore = Math.max(0, Math.min(15, specScore));
  score += specScore;
  scoreBreakdown.propertySpecifications = { score: specScore, max: 15 };

  // 5. Appreciation Outlook (0-10 pts)
  let appreciationScore = 7;
  const city = (targetProperty.city || "").toLowerCase();
  if (["surat", "mumbai", "ahmedabad", "bangalore", "pune"].includes(city)) {
    appreciationScore = 9;
    positiveFactors.push(`Favorable long-term urban growth corridor in ${targetProperty.city}.`);
  }
  score += appreciationScore;
  scoreBreakdown.appreciationOutlook = { score: appreciationScore, max: 10 };

  // Clamp 0-100
  score = Math.max(0, Math.min(100, Math.round(score)));

  // Category determination
  let rating = "Average";
  if (score >= 80) rating = "Excellent";
  else if (score >= 65) rating = "Good";
  else if (score >= 50) rating = "Average";
  else rating = "Weak";

  if (positiveFactors.length === 0) {
    positiveFactors.push("Standard market listing with foundational utility.");
  }
  if (negativeFactors.length === 0) {
    negativeFactors.push("No significant risk factors identified based on available market data.");
  }

  return {
    score,
    rating,
    breakdown: scoreBreakdown,
    positiveFactors,
    negativeFactors,
    disclaimer: "This investment score is an algorithmic decision-support tool. It does not constitute certified investment, legal, or financial advice.",
  };
}

/**
 * Feature 6: Rental Yield Calculator
 * Formula: (Annual Rental Income / Property Value) * 100
 */
function calculateRentalYield(targetProperty, customRent = null, customValue = null, compStats = null, rentalComps = []) {
  const isRentListing = targetProperty.listing_type === "Rent";
  const listedPrice = Number(targetProperty.price) || 0;

  let monthlyRent = 0;
  let propertyValue = 0;
  let isRentEstimated = false;

  // Determine monthly rent
  if (customRent !== null && Number(customRent) > 0) {
    monthlyRent = Number(customRent);
  } else if (isRentListing) {
    monthlyRent = listedPrice;
  } else if (rentalComps && rentalComps.length > 0) {
    // Benchmark against genuine rental properties in the database
    const validRents = rentalComps
      .map((r) => Number(r.price))
      .filter((p) => p > 0);
    if (validRents.length > 0) {
      monthlyRent = Math.round(validRents.reduce((a, b) => a + b, 0) / validRents.length);
      isRentEstimated = true;
    } else if (listedPrice > 0) {
      monthlyRent = Math.round((listedPrice * 0.035) / 12);
      isRentEstimated = true;
    }
  } else if (listedPrice > 0) {
    // Benchmark 3.5% residential rent rule of thumb
    monthlyRent = Math.round((listedPrice * 0.035) / 12);
    isRentEstimated = true;
  }

  // Determine property value
  if (customValue !== null && Number(customValue) > 0) {
    propertyValue = Number(customValue);
  } else if (!isRentListing) {
    propertyValue = listedPrice;
  } else if (monthlyRent > 0) {
    // For rent listings, estimate asset value from standard cap rate (approx 20x annual rent)
    propertyValue = Math.round(monthlyRent * 12 * 20);
  }

  const annualRentalIncome = monthlyRent * 12;
  let grossRentalYield = 0;

  if (propertyValue > 0 && annualRentalIncome > 0) {
    grossRentalYield = Math.round((annualRentalIncome / propertyValue) * 1000) / 10;
  }

  let yieldRating = "Average Yield";
  if (grossRentalYield >= 6.0) yieldRating = "High Yield";
  else if (grossRentalYield >= 4.0) yieldRating = "Healthy Yield";
  else if (grossRentalYield >= 2.5) yieldRating = "Moderate Yield";
  else if (grossRentalYield > 0) yieldRating = "Low Yield";
  else yieldRating = "Unavailable";

  return {
    monthlyRent,
    annualRentalIncome,
    propertyValue,
    grossRentalYield,
    yieldRating,
    isRentEstimated,
    isRentListing,
  };
}

/**
 * Feature 7: ROI Calculator
 * Calculates estimated property return on investment
 */
function calculateROI(targetProperty, options = {}) {
  const holdingYears = Math.max(1, Math.min(30, Number(options.holdingYears) || 5));
  const appreciationRate = Number.isFinite(Number(options.appreciationRate))
    ? Number(options.appreciationRate)
    : 5.5;

  const currentPrice = Number(targetProperty.price) || 0;
  const initialValue = options.customInitialValue
    ? Number(options.customInitialValue)
    : (currentPrice > 0 ? currentPrice : 1000000);

  // Annual rental income
  const annualRentalIncome = options.annualRentalIncome !== undefined
    ? Number(options.annualRentalIncome)
    : 0;

  // Future capital value using compound growth
  const compoundMultiplier = Math.pow(1 + appreciationRate / 100, holdingYears);
  const estimatedFutureValue = Math.round(initialValue * compoundMultiplier);
  const capitalGain = estimatedFutureValue - initialValue;

  // Cumulative rental income over holding duration
  const cumulativeRentalIncome = Math.round(annualRentalIncome * holdingYears);

  // Total Return
  const totalEstimatedGain = capitalGain + cumulativeRentalIncome;
  const totalRoiPercentage = initialValue > 0
    ? Math.round((totalEstimatedGain / initialValue) * 1000) / 10
    : 0;

  // Annualized ROI
  let annualizedRoi = 0;
  if (initialValue > 0 && totalEstimatedGain > -initialValue) {
    annualizedRoi = Math.round(
      (Math.pow(1 + totalEstimatedGain / initialValue, 1 / holdingYears) - 1) * 1000
    ) / 10;
  }

  return {
    initialPropertyValue: initialValue,
    holdingPeriodYears: holdingYears,
    assumedAppreciationRate: appreciationRate,
    estimatedFutureValue,
    capitalGain,
    cumulativeRentalIncome,
    totalEstimatedGain,
    roiPercentage: totalRoiPercentage,
    annualizedRoiPercentage: annualizedRoi,
    distinction: "Projected / Estimated ROI based on compound modeling; distinct from actual realized historical returns.",
    disclaimer: "Returns are projected estimates based on stated assumptions and do not guarantee future performance.",
  };
}

/**
 * Feature 8: Property Appreciation Forecast
 * Model-based forecast for 1, 3, 5, and 10 years
 */
function calculateAppreciationForecast(targetProperty, options = {}) {
  const currentPrice = Number(targetProperty.price) || 0;
  const baseValue = currentPrice > 0 ? currentPrice : 1000000;
  const annualRate = Number.isFinite(Number(options.annualRate))
    ? Number(options.annualRate)
    : 5.5;

  const periods = [1, 3, 5, 10];
  const forecasts = periods.map((years) => {
    const futureVal = Math.round(baseValue * Math.pow(1 + annualRate / 100, years));
    const gain = futureVal - baseValue;
    const growthPct = Math.round(((futureVal - baseValue) / baseValue) * 1000) / 10;

    return {
      periodYears: years,
      label: `${years} Year${years > 1 ? "s" : ""}`,
      forecastValue: futureVal,
      estimatedGain: gain,
      growthPercentage: growthPct,
    };
  });

  return {
    currentValue: baseValue,
    assumedAnnualRate: annualRate,
    forecasts,
    methodology: "Compound growth model using transparent baseline assumption. Historical market appreciation data is not recorded in this system.",
  };
}

/**
 * Integrated Master Function: Combines all 8 features into one unified payload
 */
function generateIntegratedPropertyIntelligence(targetProperty, comparables = [], userOptions = {}, rentalComps = []) {
  // 1. Price per Sq.Ft
  const ppsfStats = calculatePricePerSqFt(targetProperty.price, targetProperty.area);

  // 2. Comparable Analysis
  const compStats = calculateComparableStats(targetProperty, comparables);

  // 3. Automated Valuation
  const valuation = calculateValuation(targetProperty, compStats);

  // 4. Automated Price Estimate
  const priceEstimate = calculatePriceEstimate(targetProperty, compStats, valuation);

  // 5. Rental Yield
  const rentalYield = calculateRentalYield(
    targetProperty,
    userOptions.monthlyRent,
    userOptions.propertyValue,
    compStats,
    rentalComps
  );

  // 6. Investment Score (0-100)
  const investmentScore = calculateInvestmentScore(
    targetProperty,
    valuation,
    compStats,
    ppsfStats,
    rentalYield
  );

  // 7. ROI Calculator
  const roi = calculateROI(targetProperty, {
    holdingYears: userOptions.holdingYears || 5,
    appreciationRate: userOptions.appreciationRate || 5.5,
    annualRentalIncome: rentalYield.annualRentalIncome,
    customInitialValue: userOptions.propertyValue || targetProperty.price,
  });

  // 8. Appreciation Forecast
  const appreciationForecast = calculateAppreciationForecast(targetProperty, {
    annualRate: userOptions.appreciationRate || 5.5,
  });

  return {
    propertyId: targetProperty.id,
    title: targetProperty.title,
    city: targetProperty.city,
    propertyType: targetProperty.property_type,
    listingType: targetProperty.listing_type,
    price: Number(targetProperty.price) || 0,
    area: Number(targetProperty.area) || 0,
    bedrooms: Number(targetProperty.bedrooms) || 0,
    bathrooms: Number(targetProperty.bathrooms) || 0,
    status: targetProperty.status,
    valuation,
    comparableAnalysis: compStats,
    priceEstimate,
    pricePerSqFtAnalytics: {
      ...ppsfStats,
      comparableAveragePricePerSqFt: compStats.averagePricePerSqFt,
      difference: compStats.pricePerSqFtComparisonDiff,
      differencePercentage: compStats.pricePerSqFtComparisonPercentage,
      marketPosition:
        compStats.hasSufficientData && compStats.averagePricePerSqFt > 0 && ppsfStats.hasValidArea
          ? ppsfStats.pricePerSqFt < compStats.averagePricePerSqFt * 0.95
            ? "Below Market Average"
            : ppsfStats.pricePerSqFt > compStats.averagePricePerSqFt * 1.05
            ? "Above Market Average"
            : "At Market Average"
          : "Market Average Benchmark Unavailable",
    },
    investmentScore,
    rentalYield,
    roiCalculator: roi,
    appreciationForecast,
    timestamp: new Date().toISOString(),
  };
}

module.exports = {
  calculatePricePerSqFt,
  calculateComparableStats,
  calculateValuation,
  calculatePriceEstimate,
  calculateInvestmentScore,
  calculateRentalYield,
  calculateROI,
  calculateAppreciationForecast,
  generateIntegratedPropertyIntelligence,
};
