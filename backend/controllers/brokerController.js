const { pool } = require('../config/db');

// ────────────────────────────────────────────────────────────────────
// PHASE 4: BROKER / AGENT ENTERPRISE CONTROLLER
// Features: Performance KPIs, Commission Engine, Payouts, Quotas, Leaderboard, Territories
// ────────────────────────────────────────────────────────────────────

// 1. Agent Performance Dashboard & KPIs
const getAgentPerformance = async (req, res) => {
  try {
    const { agentId } = req.query;

    let targetAgentId = agentId;
    if (req.user?.role === 'agent') {
      const [agentRows] = await pool.execute(`SELECT id FROM agents WHERE user_id = ? LIMIT 1`, [req.user.id]);
      targetAgentId = agentRows[0]?.id;
    }

    const whereAgent = targetAgentId ? `WHERE a.id = ${Number(targetAgentId)}` : '';

    const [performance] = await pool.execute(`
      SELECT 
        a.id as agent_id,
        a.agency_name,
        u.name as agent_name,
        u.email as agent_email,
        u.phone as agent_phone,
        COALESCE(p_sub.total_listings, 0) as total_listings,
        COALESCE(p_sub.total_listings, 0) as totalListings,
        COALESCE(p_sub.total_listings, 0) as activeListings,
        COALESCE(l_sub.assigned_leads, 0) as assigned_leads,
        COALESCE(l_sub.assigned_leads, 0) as assignedLeads,
        COALESCE(d_sub.closed_deals, 0) as closed_deals,
        COALESCE(d_sub.closed_deals, 0) as closedDeals,
        COALESCE(d_sub.closed_deals, 0) as dealsClosed,
        COALESCE(d_sub.total_sales_volume, 0) as total_sales_volume,
        COALESCE(d_sub.total_sales_volume, 0) as totalSalesVolume,
        COALESCE(c_sub.total_commission_earned, 0) as total_commission_earned,
        COALESCE(c_sub.total_commission_earned, 0) as totalCommissionEarned,
        COALESCE(c_sub.commission_payable, 0) as commission_payable,
        COALESCE(c_sub.commission_payable, 0) as commissionPayable
      FROM agents a
      JOIN users u ON a.user_id = u.id
      LEFT JOIN (
        SELECT agent_id, COUNT(*) as total_listings
        FROM properties
        GROUP BY agent_id
      ) p_sub ON a.id = p_sub.agent_id
      LEFT JOIN (
        SELECT assigned_agent_id, COUNT(*) as assigned_leads
        FROM crm_leads
        GROUP BY assigned_agent_id
      ) l_sub ON a.id = l_sub.assigned_agent_id
      LEFT JOIN (
        SELECT agent_id, COUNT(*) as closed_deals, SUM(agreed_price) as total_sales_volume
        FROM deals
        WHERE stage = 'Closed'
        GROUP BY agent_id
      ) d_sub ON a.id = d_sub.agent_id
      LEFT JOIN (
        SELECT 
          agent_id, 
          SUM(agent_share) as total_commission_earned,
          SUM(CASE WHEN status = 'Approved' THEN agent_share ELSE 0 END) as commission_payable
        FROM agent_commissions
        WHERE status != 'Cancelled'
        GROUP BY agent_id
      ) c_sub ON a.id = c_sub.agent_id
      ${whereAgent}
      ORDER BY a.id ASC
    `);

    return res.status(200).json({
      success: true,
      performance: targetAgentId ? performance[0] || null : performance
    });
  } catch (error) {
    console.error('Agent Performance Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve agent performance.' });
  }
};

// 2. Commission Management & Calculation
const getCommissions = async (req, res) => {
  try {
    const { agentId, status } = req.query;
    let where = ['1=1'];
    let params = [];

    if (req.user?.role === 'agent') {
      const [a] = await pool.execute(`SELECT id FROM agents WHERE user_id = ?`, [req.user.id]);
      if (a[0]) {
        where.push('c.agent_id = ?');
        params.push(a[0].id);
      }
    } else if (agentId) {
      where.push('c.agent_id = ?');
      params.push(Number(agentId));
    }

    if (status && status !== 'all') {
      where.push('c.status = ?');
      params.push(status);
    }

    const [commissions] = await pool.execute(
      `SELECT c.*, a.agency_name, u.name as agent_name, p.title as property_title
       FROM agent_commissions c
       JOIN agents a ON c.agent_id = a.id
       JOIN users u ON a.user_id = u.id
       LEFT JOIN properties p ON c.property_id = p.id
       WHERE ${where.join(' AND ')}
       ORDER BY c.created_at DESC`,
      params
    );

    return res.status(200).json({ success: true, commissions });
  } catch (error) {
    console.error('Get Commissions Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch commissions.' });
  }
};

const createCommission = async (req, res) => {
  try {
    const { agent_id, property_id, deal_id, deal_amount, commission_rate = 2.0, split_agent_pct = 70.0, notes } = req.body;

    if (!agent_id || !deal_amount) {
      return res.status(400).json({ success: false, message: 'Agent ID and deal amount are required.' });
    }

    const totalComm = (Number(deal_amount) * Number(commission_rate)) / 100;
    const agentShare = (totalComm * Number(split_agent_pct)) / 100;
    const brokerageShare = totalComm - agentShare;

    const [result] = await pool.execute(
      `INSERT INTO agent_commissions (
        agent_id, property_id, deal_id, deal_amount, commission_rate,
        commission_amount, brokerage_share, agent_share, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Accrued', ?)`,
      [
        Number(agent_id),
        property_id ? Number(property_id) : null,
        deal_id ? Number(deal_id) : null,
        Number(deal_amount),
        Number(commission_rate),
        totalComm,
        brokerageShare,
        agentShare,
        notes || null
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Commission calculated and recorded.',
      commissionId: result.insertId,
      commissionAmount: totalComm,
      agentShare,
      brokerageShare
    });
  } catch (error) {
    console.error('Create Commission Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create commission record.' });
  }
};

const updateCommissionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    if (!['Accrued', 'Approved', 'Paid', 'Cancelled'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid commission status.' });
    }

    await pool.execute(
      `UPDATE agent_commissions 
       SET status = ?, notes = COALESCE(?, notes), approved_by = ?, paid_at = CASE WHEN ? = 'Paid' THEN NOW() ELSE paid_at END
       WHERE id = ?`,
      [status, notes || null, req.user.id, status, Number(id)]
    );

    return res.status(200).json({ success: true, message: `Commission updated to ${status}.` });
  } catch (error) {
    console.error('Update Commission Status Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update commission.' });
  }
};

// 3. Agent Quotas & Targets
const getAgentQuotas = async (req, res) => {
  try {
    const [quotas] = await pool.execute(`
      SELECT q.*, a.agency_name, u.name as agent_name,
        ROUND((q.achieved_amount / q.target_amount) * 100, 1) as achievement_pct
      FROM agent_quotas q
      JOIN agents a ON q.agent_id = a.id
      JOIN users u ON a.user_id = u.id
      ORDER BY q.created_at DESC
    `);

    return res.status(200).json({ success: true, quotas });
  } catch (error) {
    console.error('Get Quotas Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load quotas.' });
  }
};

const setAgentQuota = async (req, res) => {
  try {
    const { agent_id, period_type, period_label, target_amount, target_deals } = req.body;

    await pool.execute(
      `INSERT INTO agent_quotas (agent_id, period_type, period_label, target_amount, target_deals)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE target_amount = VALUES(target_amount), target_deals = VALUES(target_deals)`,
      [Number(agent_id), period_type || 'Monthly', period_label, Number(target_amount), Number(target_deals)]
    );

    return res.status(200).json({ success: true, message: 'Agent quota set successfully.' });
  } catch (error) {
    console.error('Set Quota Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to set quota.' });
  }
};

// 4. Agent Leaderboard (Zero JOIN multiplication via derived tables)
const getAgentLeaderboard = async (req, res) => {
  try {
    const [leaderboard] = await pool.execute(`
      SELECT 
        a.id,
        a.agency_name,
        u.name,
        u.profile_image,
        COALESCE(d_sub.deals_closed, 0) as deals_closed,
        COALESCE(d_sub.total_volume, 0) as total_volume,
        COALESCE(c_sub.total_earnings, 0) as total_earnings
      FROM agents a
      JOIN users u ON a.user_id = u.id
      LEFT JOIN (
        SELECT agent_id, COUNT(*) as deals_closed, SUM(agreed_price) as total_volume
        FROM deals
        WHERE stage = 'Closed'
        GROUP BY agent_id
      ) d_sub ON a.id = d_sub.agent_id
      LEFT JOIN (
        SELECT agent_id, SUM(agent_share) as total_earnings
        FROM agent_commissions
        WHERE status = 'Paid'
        GROUP BY agent_id
      ) c_sub ON a.id = c_sub.agent_id
      ORDER BY total_volume DESC, deals_closed DESC
      LIMIT 10
    `);

    return res.status(200).json({ success: true, leaderboard });
  } catch (error) {
    console.error('Leaderboard Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate leaderboard.' });
  }
};

// 5. Territory Management
const getTerritories = async (req, res) => {
  try {
    const [territories] = await pool.execute(`
      SELECT t.*, a.agency_name, u.name as agent_name
      FROM agent_territories t
      JOIN agents a ON t.agent_id = a.id
      JOIN users u ON a.user_id = u.id
      ORDER BY t.city, t.zone_name
    `);
    return res.status(200).json({ success: true, territories });
  } catch (error) {
    console.error('Get Territories Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load territories.' });
  }
};

const assignTerritory = async (req, res) => {
  try {
    const { agent_id, city, zone_name, is_exclusive } = req.body;
    await pool.execute(
      `INSERT INTO agent_territories (agent_id, city, zone_name, is_exclusive)
       VALUES (?, ?, ?, ?)`,
      [Number(agent_id), city, zone_name, Boolean(is_exclusive)]
    );
    return res.status(201).json({ success: true, message: 'Territory assigned successfully.' });
  } catch (error) {
    console.error('Assign Territory Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to assign territory.' });
  }
};

// 6. Agent Payout Tracking & Processing
const getAgentPayouts = async (req, res) => {
  try {
    const { agentId } = req.query;
    let where = ['1=1'];
    let params = [];

    if (req.user?.role === 'agent') {
      const [a] = await pool.execute(`SELECT id FROM agents WHERE user_id = ?`, [req.user.id]);
      if (a[0]) {
        where.push('p.agent_id = ?');
        params.push(a[0].id);
      }
    } else if (agentId) {
      where.push('p.agent_id = ?');
      params.push(Number(agentId));
    }

    const [payouts] = await pool.execute(
      `SELECT p.*, a.agency_name, u.name as agent_name, u.email as agent_email
       FROM agent_payouts p
       JOIN agents a ON p.agent_id = a.id
       JOIN users u ON a.user_id = u.id
       WHERE ${where.join(' AND ')}
       ORDER BY p.payout_date DESC, p.id DESC`,
      params
    );

    return res.status(200).json({ success: true, payouts });
  } catch (error) {
    console.error('Get Payouts Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load agent payouts.' });
  }
};

const recordAgentPayout = async (req, res) => {
  try {
    const { agent_id, amount, payment_method, transaction_ref, payout_date, notes } = req.body;
    if (!agent_id || !amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Valid Agent ID and positive payout amount are required.' });
    }

    const ref = transaction_ref || `PAY-${Date.now()}`;
    const [result] = await pool.execute(
      `INSERT INTO agent_payouts (agent_id, amount, payment_method, transaction_ref, payout_date, status, notes)
       VALUES (?, ?, ?, ?, ?, 'Processed', ?)`,
      [Number(agent_id), Number(amount), payment_method || 'Bank Transfer', ref, payout_date || new Date(), notes || null]
    );

    return res.status(201).json({
      success: true,
      message: 'Agent payout processed and recorded successfully.',
      payoutId: result.insertId,
      transactionRef: ref
    });
  } catch (error) {
    console.error('Record Payout Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to record agent payout.' });
  }
};

module.exports = {
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
};
