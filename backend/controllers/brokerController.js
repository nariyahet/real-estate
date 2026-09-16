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
        COUNT(DISTINCT p.id) as total_listings,
        COUNT(DISTINCT l.id) as assigned_leads,
        COUNT(DISTINCT d.id) as closed_deals,
        COALESCE(SUM(d.agreed_price), 0) as total_sales_volume,
        COALESCE(SUM(c.agent_share), 0) as total_commission_earned,
        COALESCE(SUM(CASE WHEN c.status = 'Approved' THEN c.agent_share ELSE 0 END), 0) as commission_payable
      FROM agents a
      JOIN users u ON a.user_id = u.id
      LEFT JOIN properties p ON a.id = p.agent_id
      LEFT JOIN crm_leads l ON a.id = l.assigned_agent_id
      LEFT JOIN deals d ON a.id = d.agent_id AND d.stage = 'Closed'
      LEFT JOIN agent_commissions c ON a.id = c.agent_id AND c.status != 'Cancelled'
      ${whereAgent}
      GROUP BY a.id, a.agency_name, u.name, u.email, u.phone
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

// 4. Agent Leaderboard
const getAgentLeaderboard = async (req, res) => {
  try {
    const [leaderboard] = await pool.execute(`
      SELECT 
        a.id,
        a.agency_name,
        u.name,
        u.profile_image,
        COUNT(DISTINCT d.id) as deals_closed,
        COALESCE(SUM(d.agreed_price), 0) as total_volume,
        COALESCE(SUM(c.agent_share), 0) as total_earnings
      FROM agents a
      JOIN users u ON a.user_id = u.id
      LEFT JOIN deals d ON a.id = d.agent_id AND d.stage = 'Closed'
      LEFT JOIN agent_commissions c ON a.id = c.agent_id AND c.status = 'Paid'
      GROUP BY a.id, a.agency_name, u.name, u.profile_image
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

module.exports = {
  getAgentPerformance,
  getCommissions,
  createCommission,
  updateCommissionStatus,
  getAgentQuotas,
  setAgentQuota,
  getAgentLeaderboard,
  getTerritories,
  assignTerritory
};
