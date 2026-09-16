const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getAgentPerformance,
  getCommissions,
  createCommission,
  updateCommissionStatus,
  getAgentQuotas,
  setAgentQuota,
  getAgentLeaderboard,
  getTerritories,
  assignTerritory
} = require('../controllers/brokerController');

router.use(protect);

router.get('/performance', getAgentPerformance);
router.get('/commissions', getCommissions);
router.post('/commissions', createCommission);
router.put('/commissions/:id/status', updateCommissionStatus);
router.get('/quotas', getAgentQuotas);
router.post('/quotas', setAgentQuota);
router.get('/leaderboard', getAgentLeaderboard);
router.get('/territories', getTerritories);
router.post('/territories', assignTerritory);

module.exports = router;
