const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getDeals,
  getDealById,
  createDeal,
  updateDealStage,
  getDealOffers,
  createDealOffer,
  getDealMilestones,
  updateMilestone
} = require('../controllers/dealsController');

router.use(protect);

router.get('/deals', getDeals);
router.get('/deals/:id', getDealById);
router.post('/deals', createDeal);
router.put('/deals/:id/stage', updateDealStage);
router.get('/deals/:id/offers', getDealOffers);
router.post('/deals/:id/offers', createDealOffer);
router.get('/deals/:id/milestones', getDealMilestones);
router.put('/milestones/:milestoneId', updateMilestone);

module.exports = router;
