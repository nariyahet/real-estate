const { pool } = require('../config/db');

// ────────────────────────────────────────────────────────────────────
// PHASE 7: MARKETING AUTOMATION CONTROLLER
// Features: Campaigns, Multi-Channel Attribution, Nurturing Triggers, Landing Pages, Marketing ROI
// ────────────────────────────────────────────────────────────────────

// 1. Get Campaigns with ROI Metrics
const getCampaigns = async (req, res) => {
  try {
    const [campaigns] = await pool.execute(`
      SELECT 
        c.*,
        COUNT(DISTINCT l.id) as generated_leads,
        COUNT(DISTINCT CASE WHEN l.status = 'Won' THEN l.id END) as won_leads,
        COALESCE(SUM(d.agreed_price), 0) as attributed_revenue
      FROM marketing_campaigns c
      LEFT JOIN crm_leads l ON l.source = c.name OR l.source = c.campaign_type
      LEFT JOIN deals d ON d.lead_id = l.id AND d.stage = 'Closed'
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `);

    // Calculate ROI per campaign
    const campaignsWithRoi = campaigns.map(c => {
      const spent = Number(c.spent) || 1;
      const revenue = Number(c.attributed_revenue) || 0;
      const roi = spent > 0 ? (((revenue - spent) / spent) * 100).toFixed(1) : 0;
      return { ...c, roi: `${roi}%` };
    });

    return res.status(200).json({ success: true, campaigns: campaignsWithRoi });
  } catch (error) {
    console.error('Get Campaigns Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch campaigns.' });
  }
};

const createCampaign = async (req, res) => {
  try {
    const { name, campaign_type, budget, start_date, end_date, target_leads } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Campaign name is required.' });

    const [result] = await pool.execute(
      `INSERT INTO marketing_campaigns (name, campaign_type, budget, start_date, end_date, target_leads, status)
       VALUES (?, ?, ?, ?, ?, ?, 'Active')`,
      [name, campaign_type || 'Email', Number(budget) || 0, start_date || null, end_date || null, Number(target_leads) || 0]
    );

    return res.status(201).json({ success: true, message: 'Campaign launched.', campaignId: result.insertId });
  } catch (error) {
    console.error('Create Campaign Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to launch campaign.' });
  }
};

// 2. Marketing Automation Drip Triggers
const getAutomations = async (req, res) => {
  try {
    const [automations] = await pool.execute(`
      SELECT a.*, c.name as campaign_name
      FROM marketing_automations a
      LEFT JOIN marketing_campaigns c ON a.campaign_id = c.id
      ORDER BY a.created_at DESC
    `);
    return res.status(200).json({ success: true, automations });
  } catch (error) {
    console.error('Get Automations Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load automations.' });
  }
};

const createAutomation = async (req, res) => {
  try {
    const { campaign_id, trigger_event, channel, template_subject, template_body, delay_minutes } = req.body;
    if (!trigger_event || !template_subject) {
      return res.status(400).json({ success: false, message: 'Trigger event and template subject are required.' });
    }

    const [result] = await pool.execute(
      `INSERT INTO marketing_automations (campaign_id, trigger_event, channel, template_subject, template_body, delay_minutes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [campaign_id ? Number(campaign_id) : null, trigger_event, channel || 'Email', template_subject, template_body, Number(delay_minutes) || 0]
    );

    return res.status(201).json({ success: true, message: 'Automation rule created.', automationId: result.insertId });
  } catch (error) {
    console.error('Create Automation Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create automation rule.' });
  }
};

// 3. Dynamic Property Landing Pages
const getLandingPages = async (req, res) => {
  try {
    const [pages] = await pool.execute(`
      SELECT lp.*, p.title as property_title, p.price, p.city, p.property_type
      FROM marketing_landing_pages lp
      LEFT JOIN properties p ON lp.property_id = p.id
      ORDER BY lp.created_at DESC
    `);
    return res.status(200).json({ success: true, landingPages: pages });
  } catch (error) {
    console.error('Get Landing Pages Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load landing pages.' });
  }
};

const createLandingPage = async (req, res) => {
  try {
    const { title, property_id, hero_tagline, custom_content } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'Page title is required.' });

    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now().toString().slice(-4);

    const [result] = await pool.execute(
      `INSERT INTO marketing_landing_pages (title, slug, property_id, hero_tagline, custom_content)
       VALUES (?, ?, ?, ?, ?)`,
      [title, slug, property_id ? Number(property_id) : null, hero_tagline || null, custom_content || null]
    );

    return res.status(201).json({ success: true, message: 'Landing page published.', landingPageId: result.insertId, slug });
  } catch (error) {
    console.error('Create Landing Page Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to publish landing page.' });
  }
};

module.exports = {
  getCampaigns,
  createCampaign,
  getAutomations,
  createAutomation,
  getLandingPages,
  createLandingPage
};
