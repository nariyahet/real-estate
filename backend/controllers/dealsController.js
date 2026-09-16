const { pool } = require('../config/db');
const { logAudit } = require('../utils/auditLogger');
const { recordLifecycleTransition } = require('../models/operationsModel');

// ────────────────────────────────────────────────────────────────────
// PHASE 5: SALES & DEAL MANAGEMENT CONTROLLER
// Features: Deal Pipeline, Offers, Negotiation, Token/Booking, Milestones, Closures, Cancellations
// ────────────────────────────────────────────────────────────────────

// 1. Get Deals with Filter & Stage Summary
const getDeals = async (req, res) => {
  try {
    const { stage, agentId, propertyId, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let where = ['1=1'];
    let params = [];

    if (req.user?.role === 'agent') {
      const [agentRows] = await pool.execute(`SELECT id FROM agents WHERE user_id = ? LIMIT 1`, [req.user.id]);
      const myAgentId = agentRows[0]?.id;
      if (myAgentId) {
        where.push('d.agent_id = ?');
        params.push(myAgentId);
      }
    } else if (agentId) {
      where.push('d.agent_id = ?');
      params.push(Number(agentId));
    }

    if (stage && stage !== 'all') {
      where.push('d.stage = ?');
      params.push(stage);
    }
    if (propertyId) {
      where.push('d.property_id = ?');
      params.push(Number(propertyId));
    }

    const whereSql = where.join(' AND ');

    const [[{ total }]] = await pool.execute(
      `SELECT COUNT(*) as total FROM deals d WHERE ${whereSql}`,
      params
    );

    const [deals] = await pool.execute(
      `SELECT 
        d.*,
        p.title as property_title,
        p.price as listing_price,
        p.city as property_city,
        u.name as agent_name,
        u.email as agent_email
       FROM deals d
       JOIN properties p ON d.property_id = p.id
       LEFT JOIN agents a ON d.agent_id = a.id
       LEFT JOIN users u ON a.user_id = u.id
       WHERE ${whereSql}
       ORDER BY d.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, String(Number(limit)), String(offset)]
    );

    // Stage metrics for Pipeline View
    const [pipelineCounts] = await pool.execute(`
      SELECT stage, COUNT(*) as count, COALESCE(SUM(agreed_price), 0) as total_volume
      FROM deals
      GROUP BY stage
    `);

    return res.status(200).json({
      success: true,
      deals,
      pipelineCounts,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)) || 1
      }
    });
  } catch (error) {
    console.error('Get Deals Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve deals.' });
  }
};

// 2. Create Deal
const createDeal = async (req, res) => {
  try {
    const {
      property_id,
      lead_id,
      buyer_name,
      buyer_email,
      buyer_phone,
      agent_id,
      deal_title,
      agreed_price,
      token_amount,
      target_close_date,
      notes
    } = req.body;

    if (!property_id || !buyer_name || !agreed_price) {
      return res.status(400).json({ success: false, message: 'Property, buyer name, and agreed price are required.' });
    }

    const [prop] = await pool.execute(`SELECT * FROM properties WHERE id = ?`, [Number(property_id)]);
    if (!prop[0]) {
      return res.status(404).json({ success: false, message: 'Property not found.' });
    }

    const finalAgentId = agent_id ? Number(agent_id) : prop[0].agent_id;

    const [result] = await pool.execute(
      `INSERT INTO deals (
        property_id, lead_id, buyer_name, buyer_email, buyer_phone,
        agent_id, deal_title, stage, agreed_price, token_amount, target_close_date, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Prospect', ?, ?, ?, ?)`,
      [
        Number(property_id),
        lead_id ? Number(lead_id) : null,
        buyer_name,
        buyer_email || null,
        buyer_phone || null,
        finalAgentId,
        deal_title || `Deal for ${prop[0].title}`,
        Number(agreed_price),
        Number(token_amount) || 0.00,
        target_close_date || null,
        notes || null
      ]
    );

    const dealId = result.insertId;

    // Create standard payment milestones
    const price = Number(agreed_price);
    const milestones = [
      ['Booking Token Deposit', price * 0.10, 1],
      ['Agreement Signing & Document Verification', price * 0.40, 2],
      ['Final Consideration & Possession Transfer', price * 0.50, 3]
    ];

    for (const [name, amt, ord] of milestones) {
      await pool.execute(
        `INSERT INTO deal_milestones (deal_id, milestone_name, milestone_order, amount, status)
         VALUES (?, ?, ?, ?, 'Pending')`,
        [dealId, name, ord, amt]
      );
    }

    return res.status(201).json({
      success: true,
      message: 'Deal created and payment milestones generated.',
      dealId
    });
  } catch (error) {
    console.error('Create Deal Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create deal.' });
  }
};

// 3. Update Deal Stage with Cross-Module Consistency
const updateDealStage = async (req, res) => {
  try {
    const { id } = req.params;
    const { stage, notes } = req.body;
    const stageMap = {
      'Offer Made': 'Offer_Made',
      'Token Received': 'Token_Received',
      'Agreement Signed': 'Agreement_Signed',
      'Draft': 'Prospect',
      'Offer': 'Offer_Made',
      'Under Contract': 'Agreement_Signed',
      'Legal Review': 'Negotiation',
      'Closing': 'Agreement_Signed'
    };
    const finalStage = stageMap[stage] || stage;

    const validStages = ['Prospect', 'Offer_Made', 'Negotiation', 'Token_Received', 'Agreement_Signed', 'Closed', 'Cancelled'];
    if (!validStages.includes(finalStage)) {
      return res.status(400).json({ success: false, message: `Invalid stage. Must be: ${validStages.join(', ')}` });
    }

    const [deals] = await pool.execute(`SELECT * FROM deals WHERE id = ?`, [Number(id)]);
    const deal = deals[0];
    if (!deal) {
      return res.status(404).json({ success: false, message: 'Deal not found.' });
    }

    const prevStage = deal.stage;

    await pool.execute(
      `UPDATE deals 
       SET stage = ?, notes = COALESCE(?, notes), 
           actual_close_date = CASE WHEN ? = 'Closed' THEN NOW() ELSE actual_close_date END,
           updated_at = NOW() 
       WHERE id = ?`,
      [finalStage, notes || null, finalStage, Number(id)]
    );

    // CROSS-MODULE INTEGRATION 1: Token Received -> Reserve Property
    if (finalStage === 'Token_Received') {
      await pool.execute(`UPDATE properties SET status = 'Available' WHERE id = ?`, [deal.property_id]);
      try {
        await recordLifecycleTransition(deal.property_id, {
          from_state: 'Available',
          to_state: 'Reserved',
          notes: `Deal #${deal.id} token deposit of ₹${deal.token_amount} received from ${deal.buyer_name}`,
          changed_by: req.user.id
        });
      } catch (e) {
        // ignore transition error if already reserved
      }
    }

    // CROSS-MODULE INTEGRATION 2: Deal Closed -> Sold Property & Commission Ledger
    if (finalStage === 'Closed') {
      // 1. Update Property Status to Sold
      await pool.execute(`UPDATE properties SET status = 'Sold', updated_at = NOW() WHERE id = ?`, [deal.property_id]);

      // 2. Record Lifecycle Transition to Sold
      try {
        await recordLifecycleTransition(deal.property_id, {
          from_state: 'Reserved',
          to_state: 'Sold',
          notes: `Deal #${deal.id} successfully closed for ₹${deal.agreed_price}`,
          changed_by: req.user.id
        });
      } catch (e) {
        try {
          await recordLifecycleTransition(deal.property_id, {
            from_state: 'Available',
            to_state: 'Sold',
            notes: `Deal #${deal.id} closed for ₹${deal.agreed_price}`,
            changed_by: req.user.id
          });
        } catch (e2) {}
      }

      // 3. Auto-generate Commission for Agent
      if (deal.agent_id) {
        const commRate = 2.0;
        const totalComm = (Number(deal.agreed_price) * commRate) / 100;
        const agentShare = totalComm * 0.70;
        const brokerShare = totalComm * 0.30;

        await pool.execute(
          `INSERT INTO agent_commissions (
            agent_id, property_id, deal_id, deal_amount, commission_rate,
            commission_amount, brokerage_share, agent_share, status, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Approved', 'Auto-accrued upon Deal closure')`,
          [deal.agent_id, deal.property_id, deal.id, deal.agreed_price, commRate, totalComm, brokerShare, agentShare]
        );
      }

      // 4. Update Lead to 'Won' if associated
      if (deal.lead_id) {
        await pool.execute(`UPDATE crm_leads SET status = 'Won', updated_at = NOW() WHERE id = ?`, [deal.lead_id]);
      }

      // 5. Log in Audit Trail
      await logAudit({
        propertyId: deal.property_id,
        userId: req.user.id,
        userName: req.user.name,
        userRole: req.user.role,
        action: 'DEAL_CLOSED',
        entity: 'DEAL',
        entityId: deal.id,
        details: { agreedPrice: deal.agreed_price, buyer: deal.buyer_name }
      });
    }

    return res.status(200).json({
      success: true,
      message: `Deal stage updated from ${prevStage} to ${stage}.`,
      prevStage,
      newStage: stage
    });
  } catch (error) {
    console.error('Update Deal Stage Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update deal stage.' });
  }
};

// 4. Offers & Negotiations
const getDealOffers = async (req, res) => {
  try {
    const { id } = req.params;
    const [offers] = await pool.execute(
      `SELECT * FROM deal_offers WHERE deal_id = ? ORDER BY created_at DESC`,
      [Number(id)]
    );
    return res.status(200).json({ success: true, offers });
  } catch (error) {
    console.error('Get Offers Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load offers.' });
  }
};

const createDealOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const { offered_by_name, offered_by_role, offer_amount, terms } = req.body;

    const [deals] = await pool.execute(`SELECT property_id FROM deals WHERE id = ?`, [Number(id)]);
    if (!deals[0]) return res.status(404).json({ success: false, message: 'Deal not found.' });

    const [result] = await pool.execute(
      `INSERT INTO deal_offers (deal_id, property_id, offered_by_name, offered_by_role, offer_amount, terms)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [Number(id), deals[0].property_id, offered_by_name, offered_by_role || 'Buyer', Number(offer_amount), terms || null]
    );

    return res.status(201).json({
      success: true,
      message: 'Offer recorded.',
      offerId: result.insertId
    });
  } catch (error) {
    console.error('Create Offer Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to record offer.' });
  }
};

// 5. Payment Milestones
const getDealMilestones = async (req, res) => {
  try {
    const { id } = req.params;
    const [milestones] = await pool.execute(
      `SELECT * FROM deal_milestones WHERE deal_id = ? ORDER BY milestone_order ASC`,
      [Number(id)]
    );
    return res.status(200).json({ success: true, milestones });
  } catch (error) {
    console.error('Get Milestones Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load milestones.' });
  }
};

const updateMilestone = async (req, res) => {
  try {
    const { milestoneId } = req.params;
    const { status, payment_reference, notes } = req.body;

    await pool.execute(
      `UPDATE deal_milestones 
       SET status = ?, payment_reference = COALESCE(?, payment_reference),
           notes = COALESCE(?, notes), paid_date = CASE WHEN ? = 'Paid' THEN NOW() ELSE paid_date END,
           updated_at = NOW()
       WHERE id = ?`,
      [status, payment_reference || null, notes || null, status, Number(milestoneId)]
    );

    return res.status(200).json({ success: true, message: 'Milestone updated.' });
  } catch (error) {
    console.error('Update Milestone Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update milestone.' });
  }
};

// 6. Get Deal Details & Timeline
const getDealById = async (req, res) => {
  try {
    const { id } = req.params;
    const [deals] = await pool.execute(
      `SELECT 
        d.*,
        p.title as property_title,
        p.price as listing_price,
        p.address as property_address,
        p.city as property_city,
        p.status as property_status,
        u.name as agent_name,
        u.email as agent_email,
        u.phone as agent_phone
       FROM deals d
       JOIN properties p ON d.property_id = p.id
       LEFT JOIN agents a ON d.agent_id = a.id
       LEFT JOIN users u ON a.user_id = u.id
       WHERE d.id = ?`,
      [Number(id)]
    );

    if (!deals[0]) return res.status(404).json({ success: false, message: 'Deal not found.' });

    const [milestones] = await pool.execute(
      `SELECT * FROM deal_milestones WHERE deal_id = ? ORDER BY milestone_order ASC`,
      [Number(id)]
    );

    const [offers] = await pool.execute(
      `SELECT * FROM deal_offers WHERE deal_id = ? ORDER BY created_at DESC`,
      [Number(id)]
    );

    return res.status(200).json({
      success: true,
      deal: deals[0],
      milestones,
      offers
    });
  } catch (error) {
    console.error('Get Deal Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load deal details.' });
  }
};

module.exports = {
  getDeals,
  getDealById,
  createDeal,
  updateDealStage,
  getDealOffers,
  createDealOffer,
  getDealMilestones,
  updateMilestone
};
