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

  // Filter out target property if present, only consider valid price items, and enforce identical property type
  const targetType = targetProperty.property_type;
  const validComps = comparables.filter(
    (c) =>
      Number(c.id) !== Number(targetProperty.id) &&
      Number(c.price) > 0 &&
      (!targetType || c.property_type === targetType)
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
function calculateRentalYield(targetProperty, customRent = null, customValue = null, compStats = null, rentalComps = [], saleComps = []) {
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
  } else {
    // For rent listings, benchmark property asset valuation from sale comps if available
    if (saleComps && saleComps.length > 0) {
      const validSalePpsf = saleComps
        .filter((s) => Number(s.price) > 0 && Number(s.area) > 0)
        .map((s) => Number(s.price) / Number(s.area));
      if (validSalePpsf.length > 0 && Number(targetProperty.area) > 0) {
        const avgSalePpsf = validSalePpsf.reduce((a, b) => a + b, 0) / validSalePpsf.length;
        propertyValue = Math.round(avgSalePpsf * Number(targetProperty.area));
      } else {
        const validSalePrices = saleComps.map((s) => Number(s.price)).filter((p) => p > 0);
        if (validSalePrices.length > 0) {
          propertyValue = Math.round(validSalePrices.reduce((a, b) => a + b, 0) / validSalePrices.length);
        }
      }
    }
    // Standard valuation cap rate fallback (~20x annual rent, i.e. 5% cap rate)
    if (propertyValue <= 0 && monthlyRent > 0) {
      propertyValue = Math.round(monthlyRent * 12 * 20);
    }
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
  const baseValue = options.baseValue
    ? Number(options.baseValue)
    : (currentPrice > 0 ? currentPrice : 1000000);
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
 * Feature 9: Property Quality Score (0-100)
 * Evaluates 5 dimensions: Space & Layout (25), Location & Address (20),
 * Listing Presentation (20), Asset Status (20), and Property Type Appeal (15).
 */
function calculatePropertyQualityScore(property) {
  const area = Number(property.area) || 0;
  const bedrooms = Number(property.bedrooms) || 0;
  const bathrooms = Number(property.bathrooms) || 0;
  const status = property.status || "Available";
  const featured = Boolean(property.featured && property.featured !== 0 && property.featured !== "0");
  const city = (property.city || "").trim();
  const address = (property.address || "").trim();
  const title = (property.title || "").trim();
  const description = (property.description || "").trim();
  const propType = (property.property_type || "").trim();
  const hasImages = Array.isArray(property.images) ? property.images.length : (property.image_url || property.primary_image ? 1 : 0);
  const hasGps = property.latitude !== null && property.latitude !== undefined && property.longitude !== null && property.longitude !== undefined && (Number(property.latitude) !== 0 || Number(property.longitude) !== 0);

  // 1. Space & Layout Quality (Max 25 pts)
  let spaceScore = 0;
  let spaceDetail = "";
  if (bedrooms > 0 && area > 0) {
    const sqftPerBed = Math.round(area / bedrooms);
    if (sqftPerBed >= 500) {
      spaceScore += 10;
      spaceDetail = `Spacious layout with ~${sqftPerBed} sq.ft per bedroom.`;
    } else if (sqftPerBed >= 350) {
      spaceScore += 8;
      spaceDetail = `Well-proportioned layout with ~${sqftPerBed} sq.ft per bedroom.`;
    } else if (sqftPerBed >= 200) {
      spaceScore += 6;
      spaceDetail = `Standard space distribution (~${sqftPerBed} sq.ft per bedroom).`;
    } else {
      spaceScore += 4;
      spaceDetail = `Compact layout (~${sqftPerBed} sq.ft per bedroom).`;
    }
  } else if (area >= 1500) {
    spaceScore += 10;
    spaceDetail = `Substantial footprint (${area.toLocaleString("en-IN")} sq.ft).`;
  } else if (area >= 700) {
    spaceScore += 7;
    spaceDetail = `Moderate footprint (${area.toLocaleString("en-IN")} sq.ft).`;
  } else {
    spaceScore += 4;
    spaceDetail = `Compact space allocation (${area ? `${area} sq.ft` : "unspecified"}).`;
  }

  // Bathroom ratio
  if (bathrooms >= bedrooms && bedrooms > 0) {
    spaceScore += 8;
    spaceDetail += ` Excellent en-suite/bath ratio (${bathrooms} baths for ${bedrooms} beds).`;
  } else if (bathrooms >= Math.ceil(bedrooms / 2) && bathrooms > 0) {
    spaceScore += 6;
    spaceDetail += ` Balanced bathroom provision (${bathrooms} baths).`;
  } else if (bathrooms >= 1) {
    spaceScore += 4;
    spaceDetail += ` Essential sanitary allocation (${bathrooms} bath).`;
  } else {
    spaceScore += 2;
  }

  // Total area scale
  if (area >= 2000) {
    spaceScore += 7;
  } else if (area >= 1200) {
    spaceScore += 6;
  } else if (area >= 600) {
    spaceScore += 4;
  } else {
    spaceScore += 2;
  }
  spaceScore = Math.min(25, spaceScore);

  // 2. Location & Address Desirability (Max 20 pts)
  let locScore = 0;
  let locDetail = "";
  const primeCities = ["mumbai", "surat", "ahmedabad", "delhi", "bangalore", "bengaluru", "pune", "hyderabad", "chennai", "kolkata", "gurgaon", "noida"];
  const isPrimeCity = primeCities.includes(city.toLowerCase());

  if (isPrimeCity) {
    locScore += 10;
    locDetail = `Prime metropolitan real estate hub (${city}).`;
  } else if (city.length > 0) {
    locScore += 7;
    locDetail = `Established regional market (${city}).`;
  } else {
    locScore += 2;
    locDetail = "Unspecified city location.";
  }

  if (address.length >= 15) {
    locScore += 5;
    locDetail += " Complete street address provided.";
  } else if (address.length > 0) {
    locScore += 3;
    locDetail += " Locality address provided.";
  }

  if (hasGps) {
    locScore += 5;
    locDetail += " Verified coordinates on map.";
  } else {
    locScore += 1;
  }
  locScore = Math.min(20, locScore);

  // 3. Listing Presentation & Completeness (Max 20 pts)
  let presScore = 0;
  let presDetail = "";
  if (hasImages >= 3) {
    presScore += 8;
    presDetail = `Rich visual coverage with ${hasImages} gallery photos.`;
  } else if (hasImages >= 1) {
    presScore += 5;
    presDetail = "Primary property visuals available.";
  } else {
    presScore += 0;
    presDetail = "No images currently uploaded.";
  }

  if (description.length >= 120) {
    presScore += 7;
    presDetail += " Comprehensive property overview.";
  } else if (description.length >= 30) {
    presScore += 4;
    presDetail += " Basic property description provided.";
  } else {
    presScore += 1;
  }

  if (title.length >= 12) {
    presScore += 5;
  } else if (title.length > 0) {
    presScore += 3;
  }
  presScore = Math.min(20, presScore);

  // 4. Asset Status & Premium Tier (Max 20 pts)
  let statusScore = 0;
  let statusDetail = "";
  if (featured) {
    statusScore += 10;
    statusDetail = "Highlighted premium featured listing.";
  } else {
    statusScore += 5;
    statusDetail = "Standard listing tier.";
  }

  if (status === "Available") {
    statusScore += 10;
    statusDetail += " Active and ready for immediate transaction.";
  } else if (status === "Sold" || status === "Rented") {
    statusScore += 6;
    statusDetail += ` Current market status: ${status}.`;
  } else {
    statusScore += 2;
    statusDetail += ` Status is ${status}.`;
  }
  statusScore = Math.min(20, statusScore);

  // 5. Property Type & Practicality (Max 15 pts)
  let typeScore = 0;
  let typeDetail = "";
  const typeLower = propType.toLowerCase();
  if (typeLower === "villa") {
    typeScore = 15;
    typeDetail = "High-prestige detached residential villa with superior privacy and land share.";
  } else if (typeLower === "apartment") {
    typeScore = 14;
    typeDetail = "High-liquidity multi-unit residential apartment with strong community demand.";
  } else if (typeLower === "house") {
    typeScore = 14;
    typeDetail = "Independent residential home with high owner-occupant appeal.";
  } else if (typeLower === "office") {
    typeScore = 12;
    typeDetail = "Commercial office space optimized for business operations and leasing.";
  } else if (typeLower === "shop") {
    typeScore = 12;
    typeDetail = "Retail commercial unit with consumer frontage and footfall utility.";
  } else if (typeLower === "land") {
    typeScore = 10;
    typeDetail = "Development land with future appreciation and customization potential.";
  } else if (typeLower === "warehouse") {
    typeScore = 10;
    typeDetail = "Industrial logistics facility with specialized storage capability.";
  } else {
    typeScore = 9;
    typeDetail = `${propType || "Standard"} real-estate asset class.`;
  }

  // Calculate Overall Quality Score
  const totalScore = Math.min(100, Math.max(0, spaceScore + locScore + presScore + statusScore + typeScore));

  let rating = "Average";
  if (totalScore >= 85) rating = "Excellent";
  else if (totalScore >= 70) rating = "Good";
  else if (totalScore >= 50) rating = "Average";
  else rating = "Needs Improvement";

  const breakdown = [
    {
      factor: "Space & Layout",
      score: spaceScore,
      maxScore: 25,
      weight: "25%",
      status: spaceScore >= 20 ? "Excellent" : spaceScore >= 15 ? "Good" : spaceScore >= 10 ? "Average" : "Needs Improvement",
      details: spaceDetail,
    },
    {
      factor: "Location & Address",
      score: locScore,
      maxScore: 20,
      weight: "20%",
      status: locScore >= 16 ? "Excellent" : locScore >= 12 ? "Good" : locScore >= 8 ? "Average" : "Needs Improvement",
      details: locDetail,
    },
    {
      factor: "Listing Presentation",
      score: presScore,
      maxScore: 20,
      weight: "20%",
      status: presScore >= 16 ? "Excellent" : presScore >= 12 ? "Good" : presScore >= 8 ? "Average" : "Needs Improvement",
      details: presDetail,
    },
    {
      factor: "Asset Status & Tier",
      score: statusScore,
      maxScore: 20,
      weight: "20%",
      status: statusScore >= 16 ? "Excellent" : statusScore >= 12 ? "Good" : statusScore >= 8 ? "Average" : "Needs Improvement",
      details: statusDetail,
    },
    {
      factor: "Property Type Appeal",
      score: typeScore,
      maxScore: 15,
      weight: "15%",
      status: typeScore >= 13 ? "Excellent" : typeScore >= 11 ? "Good" : typeScore >= 8 ? "Average" : "Needs Improvement",
      details: typeDetail,
    },
  ];

  return {
    score: totalScore,
    rating,
    summary: `Quality Score: ${totalScore}/100 (${rating}). Evaluated across space ergonomics, location tier, media completeness, and property type desirability.`,
    breakdown,
    methodology: "Calculated across 5 key dimensions: Space & Layout (25%), Location & Address (20%), Listing Presentation (20%), Asset Status & Tier (20%), and Property Type Appeal (15%).",
  };
}

/**
 * Feature 10: AI Property Description Generator
 * Provider-ready copywriter generator producing professional real-estate marketing copy.
 * Generates distinct tone profiles: 'luxury', 'family', 'investment', 'concise'.
 */
function generatePropertyDescription(property, options = {}) {
  const tone = (options.tone || "luxury").toLowerCase();
  const title = property.title || "Premium Property";
  const propType = property.property_type || "Residence";
  const city = property.city || "Prime Location";
  const state = property.state ? `, ${property.state}` : "";
  const bedrooms = Number(property.bedrooms) || 0;
  const bathrooms = Number(property.bathrooms) || 0;
  const area = Number(property.area) || 0;
  const listingType = property.listing_type || "Sale";
  const price = Number(property.price) || 0;
  const status = property.status || "Available";
  const featured = Boolean(property.featured && property.featured !== 0 && property.featured !== "0");

  const formattedPrice = price > 0 ? `₹${Math.round(price).toLocaleString("en-IN")}` : "Price on Request";
  const formattedArea = area > 0 ? `${Math.round(area).toLocaleString("en-IN")} sq.ft` : "spacious layout";
  const bedText = bedrooms > 0 ? `${bedrooms} BHK` : "";
  const bedLong = bedrooms > 0 ? `${bedrooms} generous bedroom${bedrooms > 1 ? "s" : ""}` : "versatile living spaces";
  const bathLong = bathrooms > 0 ? `${bathrooms} modern bathroom${bathrooms > 1 ? "s" : ""}` : "well-appointed sanitary spaces";
  const rentSuffix = listingType === "Rent" ? "/month" : "";

  let headline;
  let lead;
  let body;
  let conclusion;

  switch (tone) {
    case "family":
      headline = `Welcoming ${bedText ? `${bedText} ` : ""}${propType} – The Ideal Home in ${city}`;
      lead = `Welcome to this warm and inviting ${propType.toLowerCase()} nestled in the heart of ${city}${state}. Designed for family comfort and modern harmony, this home provides a serene sanctuary while keeping you seamlessly connected to neighborhood conveniences.`;
      body = `Spanning ${formattedArea}, the residence features ${bedLong} and ${bathLong}. Every room has been planned to optimize daily comfort, natural airflow, and family togetherness.`;
      conclusion = `Offered for ${listingType.toLowerCase()} at ${formattedPrice}${rentSuffix}, this property represents an outstanding opportunity for families seeking lasting security, community, and comfort in ${city}.`;
      break;

    case "investment":
      headline = `High-Growth Real Estate Opportunity: ${propType} in ${city}`;
      lead = `A high-potential real-estate asset strategically positioned in one of ${city}'s high-demand growth corridors. This ${propType.toLowerCase()} delivers an exceptional combination of capital appreciation and attractive rental liquidity.`;
      body = `Encompassing a high-efficiency footprint of ${formattedArea} with ${bedLong} and ${bathLong}, the asset is engineered for strong tenant attraction and durable long-term valuation in ${city}${state}.`;
      conclusion = `Competitively priced at ${formattedPrice}${rentSuffix} for ${listingType.toLowerCase()}, this asset offers immediate market readiness and compelling risk-adjusted yields for astute investors.`;
      break;

    case "concise":
      headline = `Prime ${bedText ? `${bedText} ` : ""}${propType} | ${city} | ${formattedPrice}`;
      lead = `Well-maintained ${propType.toLowerCase()} available for ${listingType.toLowerCase()} in a sought-after precinct of ${city}${state}.`;
      body = `Key specs include ${formattedArea} total area, ${bedLong}, ${bathLong}, and verified active status (${status}).`;
      conclusion = `Offered at ${formattedPrice}${rentSuffix}. Immediate inspection and acquisition available upon inquiry.`;
      break;

    case "luxury":
    default:
      headline = `Exclusive ${bedText ? `${bedText} ` : ""}${propType} in Prime ${city}`;
      lead = `Presenting an extraordinary opportunity to acquire this distinguished ${propType.toLowerCase()} located in ${city}${state}. Crafted for discerning occupants who value quality, elegance, and effortless urban connectivity.`;
      body = `Boasting an expansive ${formattedArea} floor plan, this fine property accommodates ${bedLong} and ${bathLong}. Contemporary finishes, abundant natural sunlight, and balanced proportions define every corner of the living space.`;
      conclusion = `Available for ${listingType.toLowerCase()} at ${formattedPrice}${rentSuffix}. Positioned moments away from premier business districts, transport links, and lifestyle destinations.`;
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
    tone,
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
}

/**
 * Integrated Master Function: Combines all 10 features into one unified payload
 */
function generateIntegratedPropertyIntelligence(targetProperty, comparables = [], userOptions = {}, rentalComps = [], saleComps = []) {
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
    rentalComps,
    saleComps
  );

  // 6. Investment Score (0-100)
  const investmentScore = calculateInvestmentScore(
    targetProperty,
    valuation,
    compStats,
    ppsfStats,
    rentalYield
  );

  // Realistic property asset valuation basis (avoids using monthly rent for rental listings)
  const propertyAssetVal =
    userOptions.propertyValue ||
    (targetProperty.listing_type === "Rent"
      ? rentalYield.propertyValue
      : Number(targetProperty.price) || 0);

  // 7. ROI Calculator
  const roi = calculateROI(targetProperty, {
    holdingYears: userOptions.holdingYears || 5,
    appreciationRate: userOptions.appreciationRate || 5.5,
    annualRentalIncome: rentalYield.annualRentalIncome,
    customInitialValue: propertyAssetVal,
  });

  // 8. Appreciation Forecast
  const appreciationForecast = calculateAppreciationForecast(targetProperty, {
    annualRate: userOptions.appreciationRate || 5.5,
    baseValue: propertyAssetVal,
  });

  // 9. Property Quality Score (0-100)
  const qualityScore = calculatePropertyQualityScore(targetProperty);

  // 10. AI Property Description Generator
  const aiDescription = generatePropertyDescription(targetProperty, {
    tone: userOptions.tone || "luxury",
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
    qualityScore,
    aiDescription,
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
  calculatePropertyQualityScore,
  generatePropertyDescription,
  generateIntegratedPropertyIntelligence,
};
