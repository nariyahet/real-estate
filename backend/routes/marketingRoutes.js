const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getCampaigns,
  createCampaign,
  getAutomations,
  createAutomation,
  toggleAutomation,
  deleteAutomation,
  getLandingPages,
  createLandingPage
} = require('../controllers/marketingController');

router.use(protect);

router.get('/campaigns', getCampaigns);
router.post('/campaigns', createCampaign);
router.get('/automations', getAutomations);
router.post('/automations', createAutomation);
router.put('/automations/:id/toggle', toggleAutomation);
router.delete('/automations/:id', deleteAutomation);
router.get('/landing-pages', getLandingPages);
router.post('/landing-pages', createLandingPage);

module.exports = router;
