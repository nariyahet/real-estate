const { pool } = require('../config/db');
const { logAudit } = require('../utils/auditLogger');

// ────────────────────────────────────────────────────────────────────
// PHASE 3: LEADS & CRM CONTROLLER
// Features: Lead CRUD, Pipeline Kanban, Scoring, Distribution, Activities, Follow-ups
// ────────────────────────────────────────────────────────────────────

// Deterministic Lead Scoring Algorithm (0 - 100)
function calculateLeadScore({ budget_max, timeline, phone, email, preferred_type }) {
  let score = 30; // base score

  // Budget qualification
  if (Number(budget_max) >= 10000000) score += 25;
  else if (Number(budget_max) >= 5000000) score += 20;
  else if (Number(budget_max) > 0) score += 10;

  // Timeline readiness
  if (timeline === 'Immediate' || timeline === 'Within 1 Month') score += 25;
  else if (timeline === 'Within 3 Months') score += 15;
  else score += 5;

  // Contact completeness
  if (phone && phone.trim().length >= 10) score += 10;
  if (email && email.includes('@')) score += 5;
  if (preferred_type) score += 5;

  return Math.min(score, 100);
}

// 1. Get All Leads with Filtering & Search
const getLeads = async (req, res) => {
  try {
    const { status, stage, priority, search, agentId, page = 1, limit = 20 } = req.query;
    const filterStage = status || stage;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClauses = ['1=1'];
    let params = [];

    // RBAC: If user is agent, show assigned leads or unassigned
    if (req.user?.role === 'agent') {
      const [agentRows] = await pool.execute(`SELECT id FROM agents WHERE user_id = ? LIMIT 1`, [req.user.id]);
      const myAgentId = agentRows[0]?.id;
      if (myAgentId) {
        whereClauses.push('(l.assigned_agent_id = ? OR l.assigned_agent_id IS NULL)');
        params.push(myAgentId);
      }
    } else if (agentId) {
      whereClauses.push('l.assigned_agent_id = ?');
      params.push(Number(agentId));
    }

    if (filterStage && filterStage !== 'all') {
      whereClauses.push('l.status = ?');
      params.push(filterStage);
    }
    if (priority && priority !== 'all') {
      whereClauses.push('l.priority = ?');
      params.push(priority);
    }
    if (search) {
      whereClauses.push('(l.name LIKE ? OR l.email LIKE ? OR l.phone LIKE ? OR l.preferred_city LIKE ?)');
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    const whereSql = whereClauses.join(' AND ');

    const [[{ total }]] = await pool.execute(
      `SELECT COUNT(*) as total FROM crm_leads l WHERE ${whereSql}`,
      params
    );

    const [leads] = await pool.execute(
      `SELECT 
        l.*,
        l.score as lead_score,
        l.status as pipeline_stage,
        a.agency_name,
        u.name as agent_name,
        u.email as agent_email,
        p.title as property_title,
        p.price as property_price
       FROM crm_leads l
       LEFT JOIN agents a ON l.assigned_agent_id = a.id
       LEFT JOIN users u ON a.user_id = u.id
       LEFT JOIN properties p ON l.property_id = p.id
       WHERE ${whereSql}
       ORDER BY l.score DESC, l.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, String(Number(limit)), String(offset)]
    );

    return res.status(200).json({
      success: true,
      leads,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)) || 1
      }
    });
  } catch (error) {
    console.error('Get Leads Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve CRM leads.' });
  }
};

// 2. Create Lead
const createLead = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      property_id,
      assigned_agent_id,
      budget_min,
      budget_max,
      preferred_type,
      preferred_city,
      timeline,
      source,
      priority,
      notes
    } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Lead name and email are required.' });
    }

    const score = calculateLeadScore({ budget_max, timeline, phone, email, preferred_type });

    // Automatic Round-Robin Assignment if no agent specified
    let finalAgentId = assigned_agent_id ? Number(assigned_agent_id) : null;
    if (!finalAgentId) {
      const [availableAgents] = await pool.execute(
        `SELECT a.id, COUNT(l.id) as active_leads
         FROM agents a
         LEFT JOIN crm_leads l ON a.id = l.assigned_agent_id AND l.status NOT IN ('Won', 'Lost')
         GROUP BY a.id
         ORDER BY active_leads ASC, a.id ASC
         LIMIT 1`
      );
      if (availableAgents.length > 0) {
        finalAgentId = availableAgents[0].id;
      }
    }

    const [result] = await pool.execute(
      `INSERT INTO crm_leads (
        name, email, phone, assigned_agent_id, property_id, budget_min, budget_max,
        preferred_type, preferred_city, timeline, source, status, priority, score, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'New', ?, ?, ?)`,
      [
        name,
        email,
        phone || null,
        finalAgentId,
        property_id ? Number(property_id) : null,
        Number(budget_min) || 0,
        Number(budget_max) || 0,
        preferred_type || 'Apartment',
        preferred_city || 'Surat',
        timeline || 'Within 3 Months',
        source || 'Website',
        priority || 'Medium',
        score,
        notes || null
      ]
    );

    const leadId = result.insertId;

    // Log initial activity
    await pool.execute(
      `INSERT INTO crm_lead_activities (lead_id, agent_id, activity_type, summary, details)
       VALUES (?, ?, 'Status_Change', 'Lead Created', 'Lead captured and assigned to pipeline')`,
      [leadId, finalAgentId]
    );

    return res.status(201).json({
      success: true,
      message: 'Lead created successfully.',
      leadId,
      score,
      leadScore: score,
      assignedAgentId: finalAgentId
    });
  } catch (error) {
    console.error('Create Lead Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create lead.' });
  }
};

// 3. Update Lead Status & Pipeline Kanban Stage
const updateLeadStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, stage, notes } = req.body;
    let targetStage = status || stage;
    if (targetStage === 'Showing') targetStage = 'Proposal';

    const validStages = ['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost'];
    if (!validStages.includes(targetStage)) {
      return res.status(400).json({ success: false, message: `Invalid stage. Must be one of: ${validStages.join(', ')}` });
    }

    const [current] = await pool.execute(`SELECT * FROM crm_leads WHERE id = ?`, [Number(id)]);
    if (!current[0]) {
      return res.status(404).json({ success: false, message: 'Lead not found.' });
    }

    const prevStage = current[0].status;

    await pool.execute(
      `UPDATE crm_leads SET status = ?, updated_at = NOW() WHERE id = ?`,
      [targetStage, Number(id)]
    );

    await pool.execute(
      `INSERT INTO crm_lead_activities (lead_id, agent_id, activity_type, summary, details)
       VALUES (?, ?, 'Status_Change', ?, ?)`,
      [
        Number(id),
        current[0].assigned_agent_id,
        `Stage moved from ${prevStage} to ${targetStage}`,
        notes || `Pipeline stage transitioned to ${targetStage}`
      ]
    );

    return res.status(200).json({
      success: true,
      message: `Lead stage successfully transitioned to ${targetStage}.`,
      prevStage,
      newStage: targetStage
    });
  } catch (error) {
    console.error('Update Lead Status Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update lead status.' });
  }
};

// 4. Add Lead Activity / Log Call / Meeting / Note
const addLeadActivity = async (req, res) => {
  try {
    const { id } = req.params;
    const { activity_type, summary, details } = req.body;

    if (!activity_type || !summary) {
      return res.status(400).json({ success: false, message: 'Activity type and summary are required.' });
    }

    const [result] = await pool.execute(
      `INSERT INTO crm_lead_activities (lead_id, agent_id, activity_type, summary, details)
       VALUES (?, ?, ?, ?, ?)`,
      [Number(id), req.user?.id || null, activity_type, summary, details || null]
    );

    return res.status(201).json({
      success: true,
      message: 'Activity recorded.',
      activityId: result.insertId
    });
  } catch (error) {
    console.error('Add Activity Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to record lead activity.' });
  }
};

// 5. Schedule & Complete Follow-Ups
const scheduleFollowUp = async (req, res) => {
  try {
    const { id } = req.params;
    const { scheduled_at, reminder_type, agenda, notes } = req.body;

    if (!scheduled_at || !agenda) {
      return res.status(400).json({ success: false, message: 'Scheduled date/time and agenda are required.' });
    }

    const [result] = await pool.execute(
      `INSERT INTO crm_follow_ups (lead_id, agent_id, scheduled_at, reminder_type, agenda, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [Number(id), req.user?.id || null, scheduled_at, reminder_type || 'Call', agenda, notes || null]
    );

    return res.status(201).json({
      success: true,
      message: 'Follow-up scheduled.',
      followUpId: result.insertId
    });
  } catch (error) {
    console.error('Schedule Follow-Up Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to schedule follow-up.' });
  }
};

const completeFollowUp = async (req, res) => {
  try {
    const { followUpId } = req.params;
    const { notes } = req.body;

    await pool.execute(
      `UPDATE crm_follow_ups 
       SET is_completed = TRUE, completed_at = NOW(), notes = COALESCE(?, notes)
       WHERE id = ?`,
      [notes || null, Number(followUpId)]
    );

    return res.status(200).json({ success: true, message: 'Follow-up marked as completed.' });
  } catch (error) {
    console.error('Complete Follow-Up Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to complete follow-up.' });
  }
};

// 6. Lead Conversion & CRM Analytics Summary
const getCRMAnalytics = async (req, res) => {
  try {
    const [[counts]] = await pool.execute(`
      SELECT 
        COUNT(*) as total_leads,
        SUM(CASE WHEN status = 'New' THEN 1 ELSE 0 END) as new_leads,
        SUM(CASE WHEN status = 'Qualified' THEN 1 ELSE 0 END) as qualified_leads,
        SUM(CASE WHEN status = 'Won' THEN 1 ELSE 0 END) as won_leads,
        SUM(CASE WHEN status = 'Lost' THEN 1 ELSE 0 END) as lost_leads,
        AVG(score) as avg_score
      FROM crm_leads
    `);

    const [stageBreakdown] = await pool.execute(`
      SELECT status, COUNT(*) as count 
      FROM crm_leads 
      GROUP BY status
    `);

    const [sourceBreakdown] = await pool.execute(`
      SELECT source, COUNT(*) as count 
      FROM crm_leads 
      GROUP BY source
    `);

    const conversionRate = counts.total_leads > 0 
      ? ((counts.won_leads / counts.total_leads) * 100).toFixed(1) 
      : 0;

    return res.status(200).json({
      success: true,
      summary: {
        totalLeads: counts.total_leads || 0,
        newLeads: counts.new_leads || 0,
        qualifiedLeads: counts.qualified_leads || 0,
        wonLeads: counts.won_leads || 0,
        lostLeads: counts.lost_leads || 0,
        avgScore: Math.round(counts.avg_score || 0),
        conversionRate: `${conversionRate}%`
      },
      stageBreakdown,
      sourceBreakdown
    });
  } catch (error) {
    console.error('CRM Analytics Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load CRM analytics.' });
  }
};

// 7. Get Lead Details with Activities and Follow-ups
const getLeadById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.execute(
      `SELECT 
        l.*,
        a.agency_name,
        u.name as agent_name,
        u.email as agent_email,
        p.title as property_title,
        p.price as property_price
       FROM crm_leads l
       LEFT JOIN agents a ON l.assigned_agent_id = a.id
       LEFT JOIN users u ON a.user_id = u.id
       LEFT JOIN properties p ON l.property_id = p.id
       WHERE l.id = ? LIMIT 1`,
      [Number(id)]
    );

    if (!rows[0]) {
      return res.status(404).json({ success: false, message: 'Lead not found.' });
    }

    const [activities] = await pool.execute(
      `SELECT act.*, u.name as actor_name
       FROM crm_lead_activities act
       LEFT JOIN agents ag ON act.agent_id = ag.id
       LEFT JOIN users u ON ag.user_id = u.id
       WHERE act.lead_id = ?
       ORDER BY act.created_at DESC`,
      [Number(id)]
    );

    const [followUps] = await pool.execute(
      `SELECT * FROM crm_follow_ups WHERE lead_id = ? ORDER BY scheduled_at ASC`,
      [Number(id)]
    );

    return res.status(200).json({
      success: true,
      lead: rows[0],
      activities,
      followUps
    });
  } catch (error) {
    console.error('Get Lead Details Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve lead details.' });
  }
};

const getLeadActivities = async (req, res) => {
  try {
    const { id } = req.params;
    const [activities] = await pool.execute(
      `SELECT act.*, u.name as actor_name
       FROM crm_lead_activities act
       LEFT JOIN agents ag ON act.agent_id = ag.id
       LEFT JOIN users u ON ag.user_id = u.id
       WHERE act.lead_id = ?
       ORDER BY act.created_at DESC`,
      [Number(id)]
    );
    return res.status(200).json({ success: true, activities });
  } catch (error) {
    console.error('Get Activities Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve lead activities.' });
  }
};

const getLeadFollowUps = async (req, res) => {
  try {
    const { id } = req.params;
    const [followUps] = await pool.execute(
      `SELECT * FROM crm_follow_ups WHERE lead_id = ? ORDER BY scheduled_at ASC`,
      [Number(id)]
    );
    return res.status(200).json({ success: true, followUps });
  } catch (error) {
    console.error('Get FollowUps Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve lead follow-ups.' });
  }
};

module.exports = {
  getLeads,
  getLeadById,
  createLead,
  updateLeadStatus,
  addLeadActivity,
  getLeadActivities,
  scheduleFollowUp,
  getLeadFollowUps,
  completeFollowUp,
  getCRMAnalytics
};
