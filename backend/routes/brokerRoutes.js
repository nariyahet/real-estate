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
  assignTerritory,
  getAgentPayouts,
  recordAgentPayout
} = require('../controllers/brokerController');

router.use(protect);

router.get('/performance', getAgentPerformance);
router.get('/commissions', getCommissions);
router.post('/commissions', createCommission);
router.put('/commissions/:id/status', updateCommissionStatus);
router.get('/payouts', getAgentPayouts);
router.post('/payouts', recordAgentPayout);
router.get('/quotas', getAgentQuotas);
router.post('/quotas', setAgentQuota);
router.get('/leaderboard', getAgentLeaderboard);
router.get('/territories', getTerritories);
router.post('/territories', assignTerritory);

module.exports = router;
