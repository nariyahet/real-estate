const express = require('express');
const router = express.Router();
const {
  parseNaturalLanguageSearch,
  getBuyerPropertyMatch,
  getAIInvestmentInsights,
  getMapProperties,
  getPropertyAmenities,
  getMarketStats
} = require('../controllers/aiMapsController');

router.post('/ai/search', parseNaturalLanguageSearch);
router.get('/ai/match', getBuyerPropertyMatch);
router.get('/ai/insights', getAIInvestmentInsights);

router.get('/maps/properties', getMapProperties);
router.get('/maps/amenities/:propertyId', getPropertyAmenities);
router.get('/maps/market-stats', getMarketStats);

module.exports = router;
