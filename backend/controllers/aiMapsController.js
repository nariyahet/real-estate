const { pool } = require('../config/db');

// ────────────────────────────────────────────────────────────────────
// PHASE 9 & 10: AI & SMART SEARCH + MAPS & LOCATION INTELLIGENCE
// ────────────────────────────────────────────────────────────────────

// Haversine distance calculator in KM
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

// 1. Natural Language Property Search Parser
const parseNaturalLanguageSearch = async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ success: false, message: 'Search query is required.' });

    const q = query.toLowerCase();
    const filters = {};

    // Bedrooms parser (e.g. 3 bhk, 2 bedroom, 4bhk)
    const bhkMatch = q.match(/(\d+)\s*(bhk|bed|bedroom)/);
    if (bhkMatch) filters.bedrooms = Number(bhkMatch[1]);

    // City parser
    const knownCities = ['surat', 'ahmedabad', 'mumbai', 'vadodara', 'pune', 'delhi', 'bangalore'];
    for (const city of knownCities) {
      if (q.includes(city)) {
        filters.city = city.charAt(0).toUpperCase() + city.slice(1);
        break;
      }
    }

    // Property Type
    if (q.includes('villa')) filters.property_type = 'Villa';
    else if (q.includes('apartment') || q.includes('flat')) filters.property_type = 'Apartment';
    else if (q.includes('office') || q.includes('commercial')) filters.property_type = 'Office';

    // Listing Type (Rent vs Sale)
    if (q.includes('rent') || q.includes('lease')) filters.listing_type = 'Rent';
    else if (q.includes('buy') || q.includes('sale') || q.includes('purchase')) filters.listing_type = 'Sale';

    // Budget Extractor (e.g. under 80 lakh, under 1 cr, 50000 rent)
    const crMatch = q.match(/(under|below|max|upto)?\s*(\d+(\.\d+)?)\s*(cr|crore)/);
    if (crMatch) {
      filters.maxPrice = Number(crMatch[2]) * 10000000;
    } else {
      const lakhMatch = q.match(/(under|below|max|upto)?\s*(\d+(\.\d+)?)\s*(lakh|lac|l)/);
      if (lakhMatch) {
        filters.maxPrice = Number(lakhMatch[2]) * 100000;
      }
    }

    // Execute matching query
    let where = ["p.status = 'Available'"];
    let params = [];

    if (filters.city) {
      where.push('p.city = ?');
      params.push(filters.city);
    }
    if (filters.bedrooms) {
      where.push('p.bedrooms = ?');
      params.push(filters.bedrooms);
    }
    if (filters.property_type) {
      where.push('p.property_type = ?');
      params.push(filters.property_type);
    }
    if (filters.listing_type) {
      where.push('p.listing_type = ?');
      params.push(filters.listing_type);
    }
    if (filters.maxPrice) {
      where.push('p.price <= ?');
      params.push(filters.maxPrice);
    }

    const [properties] = await pool.execute(
      `SELECT p.*, (SELECT image_url FROM property_images WHERE property_id = p.id LIMIT 1) as primary_image
       FROM properties p
       WHERE ${where.join(' AND ')}
       LIMIT 10`,
      params
    );

    // Save query log
    await pool.execute(
      `INSERT INTO ai_search_queries (user_id, query_text, parsed_filters, results_count)
       VALUES (?, ?, ?, ?)`,
      [req.user?.id || null, query, JSON.stringify(filters), properties.length]
    );

    return res.status(200).json({
      success: true,
      originalQuery: query,
      parsedFilters: filters,
      matchCount: properties.length,
      properties
    });
  } catch (error) {
    console.error('NL Search Error:', error);
    return res.status(500).json({ success: false, message: 'Natural language search failed.' });
  }
};

// 2. Buyer-Property Match Engine (Deterministic Compatibility Score 0–100%)
const getBuyerPropertyMatch = async (req, res) => {
  try {
    const { leadId, propertyId } = req.query;

    const [leads] = await pool.execute(`SELECT * FROM crm_leads WHERE id = ?`, [Number(leadId)]);
    const [props] = await pool.execute(`SELECT * FROM properties WHERE id = ?`, [Number(propertyId)]);

    if (!leads[0] || !props[0]) {
      return res.status(404).json({ success: false, message: 'Lead or Property not found.' });
    }

    const lead = leads[0];
    const prop = props[0];

    let matchScore = 50; // base score
    let reasons = [];

    // City Match (20 pts)
    if (lead.preferred_city && prop.city && lead.preferred_city.toLowerCase() === prop.city.toLowerCase()) {
      matchScore += 20;
      reasons.push(`Target city matched (${prop.city})`);
    }

    // Property Type Match (15 pts)
    if (lead.preferred_type && prop.property_type && lead.preferred_type.toLowerCase() === prop.property_type.toLowerCase()) {
      matchScore += 15;
      reasons.push(`Property type aligned with ${prop.property_type}`);
    }

    // Budget Compatibility (15 pts)
    const price = Number(prop.price);
    const maxBudget = Number(lead.budget_max) || Number.MAX_SAFE_INTEGER;
    const minBudget = Number(lead.budget_min) || 0;

    if (price >= minBudget && price <= maxBudget) {
      matchScore += 15;
      reasons.push('Property price falls comfortably within buyer budget range');
    } else if (price > maxBudget && (price - maxBudget) / maxBudget <= 0.15) {
      matchScore += 5;
      reasons.push('Slightly above preferred budget (+15% stretch potential)');
    }

    const finalScore = Math.min(matchScore, 100);

    return res.status(200).json({
      success: true,
      compatibilityScore: finalScore,
      rating: finalScore >= 80 ? 'High Potential Match' : finalScore >= 65 ? 'Moderate Fit' : 'Low Alignment',
      reasons,
      lead: { id: lead.id, name: lead.name, budget_max: lead.budget_max },
      property: { id: prop.id, title: prop.title, price: prop.price, city: prop.city }
    });
  } catch (error) {
    console.error('Match Engine Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to calculate match score.' });
  }
};

// 3. AI Investment & Appreciation Recommendations
const getAIInvestmentInsights = async (req, res) => {
  try {
    const [properties] = await pool.execute(`
      SELECT p.*,
        ROUND((p.price / NULLIF(p.area, 0)), 2) as price_per_sqft,
        (SELECT image_url FROM property_images WHERE property_id = p.id LIMIT 1) as primary_image
      FROM properties p
      WHERE p.status = 'Available'
      ORDER BY p.price ASC
      LIMIT 8
    `);

    // Deterministic investment score model
    const scoredProperties = properties.map(p => {
      const price = Number(p.price);
      const isRent = p.listing_type === 'Rent';
      const estYield = isRent ? ((price * 12) / (price * 250)) * 100 : 4.5;
      const forecastGrowth = p.city === 'Surat' ? 9.2 : p.city === 'Ahmedabad' ? 8.5 : 7.0;

      return {
        ...p,
        estimatedAnnualYield: `${estYield.toFixed(1)}%`,
        threeYearAppreciationForecast: `+${(forecastGrowth * 3).toFixed(1)}%`,
        investmentRating: forecastGrowth > 8 ? 'Strong Buy / High Growth' : 'Stable Yield'
      };
    });

    return res.status(200).json({ success: true, recommendedPicks: scoredProperties });
  } catch (error) {
    console.error('AI Insights Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate investment insights.' });
  }
};

// 4. Interactive Property Map Geo-Coordinates & Radius Search
const getMapProperties = async (req, res) => {
  try {
    const { city, lat, lng, radiusKm = 20 } = req.query;

    let [properties] = await pool.execute(`
      SELECT 
        p.id, p.title, p.price, p.property_type, p.listing_type,
        p.bedrooms, p.bathrooms, p.area, p.city, p.latitude, p.longitude,
        p.status,
        (SELECT image_url FROM property_images WHERE property_id = p.id LIMIT 1) as primary_image
      FROM properties p
      WHERE p.status = 'Available'
    `);

    // Assign fallback deterministic coordinates for seed cities if NULL
    const cityCoords = {
      'Surat': { lat: 21.1702, lng: 72.8311 },
      'Ahmedabad': { lat: 23.0225, lng: 72.5714 },
      'Mumbai': { lat: 19.0760, lng: 72.8777 }
    };

    properties = properties.map((p, idx) => {
      const defaultCoord = cityCoords[p.city] || cityCoords['Surat'];
      const latitude = p.latitude ? Number(p.latitude) : defaultCoord.lat + (idx * 0.008) - 0.02;
      const longitude = p.longitude ? Number(p.longitude) : defaultCoord.lng + (idx * 0.008) - 0.02;

      let distance = null;
      if (lat && lng) {
        distance = calculateDistanceKm(Number(lat), Number(lng), latitude, longitude);
      }

      return { ...p, latitude, longitude, distanceKm: distance };
    });

    if (lat && lng) {
      properties = properties.filter(p => p.distanceKm <= Number(radiusKm));
      properties.sort((a, b) => a.distanceKm - b.distanceKm);
    }

    return res.status(200).json({ success: true, count: properties.length, properties });
  } catch (error) {
    console.error('Map Properties Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load map properties.' });
  }
};

// 5. Nearby Amenities & Proximity Score
const getPropertyAmenities = async (req, res) => {
  try {
    const { propertyId } = req.params;

    const [amenities] = await pool.execute(
      `SELECT * FROM location_amenities WHERE property_id = ? ORDER BY distance_km ASC`,
      [Number(propertyId)]
    );

    // If none seeded yet, provide calculated defaults for the property
    let finalAmenities = amenities;
    if (finalAmenities.length === 0) {
      finalAmenities = [
        { id: 1, amenity_type: 'School', name: 'Delhi Public School International', distance_km: 1.2, travel_time_mins: 4 },
        { id: 2, amenity_type: 'Hospital', name: 'Sunshine Multi-Speciality Hospital', distance_km: 1.8, travel_time_mins: 6 },
        { id: 3, amenity_type: 'Metro', name: 'City Central Metro Terminal', distance_km: 0.9, travel_time_mins: 3 },
        { id: 4, amenity_type: 'Mall', name: 'VR Lifestyle Mall & Multiplex', distance_km: 2.4, travel_time_mins: 8 },
        { id: 5, amenity_type: 'Airport', name: 'Surat International Airport', distance_km: 6.5, travel_time_mins: 15 }
      ];
    }

    // Proximity score: closer average distance = higher score out of 10
    const avgDist = finalAmenities.reduce((acc, curr) => acc + Number(curr.distance_km), 0) / finalAmenities.length;
    const proximityScore = Math.max(1, Math.min(10, Math.round(10 - avgDist))).toFixed(1);

    return res.status(200).json({
      success: true,
      proximityScore: `${proximityScore}/10`,
      amenities: finalAmenities
    });
  } catch (error) {
    console.error('Amenities Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch amenities.' });
  }
};

// 6. Micro-Market Statistics & Heatmap Data
const getMarketStats = async (req, res) => {
  try {
    const [stats] = await pool.execute(`SELECT * FROM location_market_stats ORDER BY demand_score DESC`);
    return res.status(200).json({ success: true, stats });
  } catch (error) {
    console.error('Market Stats Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load market statistics.' });
  }
};

module.exports = {
  parseNaturalLanguageSearch,
  getBuyerPropertyMatch,
  getAIInvestmentInsights,
  getMapProperties,
  getPropertyAmenities,
  getMarketStats
};
