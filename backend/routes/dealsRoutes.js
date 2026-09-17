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

// Support both canonical routes (/api/deals/...) and legacy prefix routes (/api/deals/deals/...)
router.get('/', getDeals);
router.get('/deals', getDeals);

router.get('/:id', getDealById);
router.get('/deals/:id', getDealById);

router.post('/', createDeal);
router.post('/deals', createDeal);

router.put('/:id/stage', updateDealStage);
router.put('/deals/:id/stage', updateDealStage);

router.get('/:id/offers', getDealOffers);
router.get('/deals/:id/offers', getDealOffers);

router.post('/:id/offers', createDealOffer);
router.post('/deals/:id/offers', createDealOffer);

router.get('/:id/milestones', getDealMilestones);
router.get('/deals/:id/milestones', getDealMilestones);

router.put('/milestones/:milestoneId', updateMilestone);
router.put('/milestones/:milestoneId/status', updateMilestone);
router.put('/deals/milestones/:milestoneId', updateMilestone);
router.put('/deals/milestones/:milestoneId/status', updateMilestone);

module.exports = router;
