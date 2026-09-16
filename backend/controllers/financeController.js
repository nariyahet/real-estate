const { pool } = require('../config/db');

// ────────────────────────────────────────────────────────────────────
// PHASE 6: FINANCE & ACCOUNTING CONTROLLER
// Features: Double-Entry Ledger, Invoicing, Receivables, Payables, Expenses, P&L, Cash Flow
// ────────────────────────────────────────────────────────────────────

// 1. Chart of Accounts
const getAccounts = async (req, res) => {
  try {
    const [accounts] = await pool.execute(`SELECT * FROM finance_accounts ORDER BY account_code ASC`);
    return res.status(200).json({ success: true, accounts });
  } catch (error) {
    console.error('Get Accounts Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch accounts.' });
  }
};

// 2. General Ledger Entries
const getLedgerEntries = async (req, res) => {
  try {
    const { accountId, dealId, page = 1, limit = 50 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let where = ['1=1'];
    let params = [];

    if (accountId) {
      where.push('l.account_id = ?');
      params.push(Number(accountId));
    }
    if (dealId) {
      where.push('l.deal_id = ?');
      params.push(Number(dealId));
    }

    const whereSql = where.join(' AND ');

    const [[{ total }]] = await pool.execute(
      `SELECT COUNT(*) as total FROM finance_ledger_entries l WHERE ${whereSql}`,
      params
    );

    const [entries] = await pool.execute(
      `SELECT l.*, a.account_code, a.account_name, a.account_type
       FROM finance_ledger_entries l
       JOIN finance_accounts a ON l.account_id = a.id
       WHERE ${whereSql}
       ORDER BY l.entry_date DESC, l.id DESC
       LIMIT ? OFFSET ?`,
      [...params, String(Number(limit)), String(offset)]
    );

    return res.status(200).json({
      success: true,
      entries,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)) || 1
      }
    });
  } catch (error) {
    console.error('Get Ledger Entries Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch ledger entries.' });
  }
};

// Record Double-Entry Journal Transaction
const createJournalEntry = async (req, res) => {
  try {
    const { transaction_ref, entry_date, description, lines, deal_id } = req.body;

    if (!transaction_ref || !description || !Array.isArray(lines) || lines.length < 2) {
      return res.status(400).json({ success: false, message: 'Transaction requires description and at least 2 lines (debit/credit).' });
    }

    // Verify Debits equal Credits (Double Entry Rule)
    let totalDebit = 0;
    let totalCredit = 0;
    for (const line of lines) {
      totalDebit += Number(line.debit || 0);
      totalCredit += Number(line.credit || 0);
    }

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return res.status(400).json({ success: false, message: `Journal entry out of balance! Total Debits (₹${totalDebit}) must equal Total Credits (₹${totalCredit}).` });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      for (const line of lines) {
        await connection.execute(
          `INSERT INTO finance_ledger_entries (transaction_ref, deal_id, entry_date, description, account_id, debit, credit, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            transaction_ref,
            deal_id ? Number(deal_id) : null,
            entry_date || new Date(),
            description,
            Number(line.account_id),
            Number(line.debit || 0),
            Number(line.credit || 0),
            req.user.id
          ]
        );

        // Update account balance
        const netChange = Number(line.debit || 0) - Number(line.credit || 0);
        await connection.execute(
          `UPDATE finance_accounts SET balance = balance + ? WHERE id = ?`,
          [netChange, Number(line.account_id)]
        );
      }

      await connection.commit();
      return res.status(201).json({ success: true, message: 'Journal transaction posted successfully.', transaction_ref });
    } catch (txErr) {
      await connection.rollback();
      throw txErr;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Create Journal Entry Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to post journal entry.' });
  }
};

// 3. Invoices & Receivables
const getInvoices = async (req, res) => {
  try {
    const { status } = req.query;
    let where = status && status !== 'all' ? `WHERE status = '${status}'` : '';
    const [invoices] = await pool.execute(`SELECT * FROM finance_invoices ${where} ORDER BY due_date ASC`);
    return res.status(200).json({ success: true, invoices });
  } catch (error) {
    console.error('Get Invoices Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load invoices.' });
  }
};

const createInvoice = async (req, res) => {
  try {
    const { deal_id, client_name, amount, tax_amount = 0, due_date } = req.body;
    const invNum = `INV-${Date.now().toString().slice(-6)}`;
    const total = Number(amount) + Number(tax_amount);

    const [result] = await pool.execute(
      `INSERT INTO finance_invoices (invoice_number, deal_id, client_name, amount, tax_amount, total_amount, due_date, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Sent')`,
      [invNum, deal_id ? Number(deal_id) : null, client_name, Number(amount), Number(tax_amount), total, due_date]
    );

    return res.status(201).json({ success: true, message: 'Invoice created.', invoiceId: result.insertId, invoiceNumber: invNum });
  } catch (error) {
    console.error('Create Invoice Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate invoice.' });
  }
};

// 4. Expenses & Payables
const getExpenses = async (req, res) => {
  try {
    const [expenses] = await pool.execute(`SELECT * FROM finance_expenses ORDER BY expense_date DESC`);
    return res.status(200).json({ success: true, expenses });
  } catch (error) {
    console.error('Get Expenses Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load expenses.' });
  }
};

const recordExpense = async (req, res) => {
  try {
    const { category, title, amount, expense_date, payment_method, paid_to, notes } = req.body;
    if (!title || !amount) {
      return res.status(400).json({ success: false, message: 'Expense title and amount are required.' });
    }

    const [result] = await pool.execute(
      `INSERT INTO finance_expenses (category, title, amount, expense_date, payment_method, paid_to, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [category || 'Operations', title, Number(amount), expense_date || new Date(), payment_method || 'Bank Transfer', paid_to || null, notes || null, req.user.id]
    );

    return res.status(201).json({ success: true, message: 'Expense logged.', expenseId: result.insertId });
  } catch (error) {
    console.error('Record Expense Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to log expense.' });
  }
};

// 5. Profit & Loss Statement (Real-Time Calculation)
const getPnLReport = async (req, res) => {
  try {
    // Total Revenue from Closed Deals & Invoices
    const [[revData]] = await pool.execute(`
      SELECT 
        COALESCE(SUM(c.brokerage_share), 0) as brokerage_revenue,
        COALESCE(SUM(i.total_amount), 0) as invoice_revenue
      FROM agent_commissions c
      LEFT JOIN finance_invoices i ON i.status = 'Paid'
      WHERE c.status IN ('Approved', 'Paid')
    `);

    // Total Operating Expenses
    const [[expData]] = await pool.execute(`
      SELECT 
        COALESCE(SUM(amount), 0) as total_expenses,
        COALESCE(SUM(CASE WHEN category = 'Marketing' THEN amount ELSE 0 END), 0) as marketing_expenses,
        COALESCE(SUM(CASE WHEN category = 'Operations' THEN amount ELSE 0 END), 0) as operations_expenses,
        COALESCE(SUM(CASE WHEN category = 'Legal' THEN amount ELSE 0 END), 0) as legal_expenses
      FROM finance_expenses
    `);

    // Commission Payouts to Agents
    const [[commData]] = await pool.execute(`
      SELECT COALESCE(SUM(agent_share), 0) as agent_commissions_paid
      FROM agent_commissions
      WHERE status = 'Paid'
    `);

    const grossRevenue = Number(revData.brokerage_revenue) + Number(revData.invoice_revenue);
    const totalExpenses = Number(expData.total_expenses) + Number(commData.agent_commissions_paid);
    const netProfit = grossRevenue - totalExpenses;
    const profitMargin = grossRevenue > 0 ? ((netProfit / grossRevenue) * 100).toFixed(1) : 0;

    return res.status(200).json({
      success: true,
      pnl: {
        grossRevenue,
        brokerageRevenue: Number(revData.brokerage_revenue),
        invoiceRevenue: Number(revData.invoice_revenue),
        totalExpenses,
        marketingExpenses: Number(expData.marketing_expenses),
        operationsExpenses: Number(expData.operations_expenses),
        agentCommissionsPaid: Number(commData.agent_commissions_paid),
        netProfit,
        profitMargin: `${profitMargin}%`
      }
    });
  } catch (error) {
    console.error('P&L Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to calculate P&L report.' });
  }
};

module.exports = {
  getAccounts,
  getLedgerEntries,
  createJournalEntry,
  getInvoices,
  createInvoice,
  getExpenses,
  recordExpense,
  getPnLReport
};
