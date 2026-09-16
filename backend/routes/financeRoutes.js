const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getAccounts,
  getLedgerEntries,
  createJournalEntry,
  getInvoices,
  createInvoice,
  getExpenses,
  recordExpense,
  getPnLReport
} = require('../controllers/financeController');

router.use(protect);

router.get('/accounts', getAccounts);
router.get('/ledger', getLedgerEntries);
router.post('/ledger/entry', createJournalEntry);
router.get('/invoices', getInvoices);
router.post('/invoices', createInvoice);
router.get('/expenses', getExpenses);
router.post('/expenses', recordExpense);
router.get('/reports/pnl', getPnLReport);

module.exports = router;
