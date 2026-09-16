-- ====================================================================
-- STAGE 1 ENTERPRISE REAL ESTATE PLATFORM — MASTER SCHEMA MIGRATIONS
-- PHASES 3 THROUGH 15 (SAFE, NON-DESTRUCTIVE, ADDITIVE)
-- ====================================================================

-- ────────────────────────────────────────────────────────────────────
-- PHASE 3: LEADS & CRM ENTERPRISE
-- ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS crm_leads (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL,
    phone VARCHAR(50) NULL,
    assigned_agent_id INT NULL,
    property_id INT NULL,
    budget_min DECIMAL(15,2) DEFAULT 0,
    budget_max DECIMAL(15,2) DEFAULT 0,
    preferred_type VARCHAR(50) DEFAULT 'Apartment',
    preferred_city VARCHAR(100) DEFAULT 'Surat',
    timeline VARCHAR(50) DEFAULT 'Within 3 Months',
    source VARCHAR(50) DEFAULT 'Website',
    status ENUM('New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost') DEFAULT 'New',
    priority ENUM('Low', 'Medium', 'High', 'Urgent') DEFAULT 'Medium',
    score INT DEFAULT 50,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_crm_leads_agent FOREIGN KEY (assigned_agent_id) REFERENCES agents(id) ON DELETE SET NULL,
    CONSTRAINT fk_crm_leads_property FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL,
    INDEX idx_crm_leads_status (status),
    INDEX idx_crm_leads_agent (assigned_agent_id),
    INDEX idx_crm_leads_score (score)
);

CREATE TABLE IF NOT EXISTS crm_lead_activities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lead_id INT NOT NULL,
    agent_id INT NULL,
    activity_type ENUM('Call', 'Email', 'Meeting', 'Note', 'Status_Change', 'Site_Visit') NOT NULL,
    summary VARCHAR(255) NOT NULL,
    details TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_crm_act_lead FOREIGN KEY (lead_id) REFERENCES crm_leads(id) ON DELETE CASCADE,
    CONSTRAINT fk_crm_act_agent FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE SET NULL,
    INDEX idx_crm_act_lead (lead_id)
);

CREATE TABLE IF NOT EXISTS crm_follow_ups (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lead_id INT NOT NULL,
    agent_id INT NULL,
    scheduled_at DATETIME NOT NULL,
    reminder_type ENUM('Call', 'Email', 'Meeting', 'Task') DEFAULT 'Call',
    agenda VARCHAR(255) NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at DATETIME NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_crm_fup_lead FOREIGN KEY (lead_id) REFERENCES crm_leads(id) ON DELETE CASCADE,
    CONSTRAINT fk_crm_fup_agent FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE SET NULL,
    INDEX idx_crm_fup_scheduled (scheduled_at),
    INDEX idx_crm_fup_completed (is_completed)
);

-- ────────────────────────────────────────────────────────────────────
-- PHASE 4: BROKER / AGENT ENTERPRISE
-- ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS agent_commissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    agent_id INT NOT NULL,
    property_id INT NULL,
    deal_id INT NULL,
    deal_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    commission_rate DECIMAL(5,2) NOT NULL DEFAULT 2.00,
    commission_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    brokerage_share DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    agent_share DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    status ENUM('Accrued', 'Approved', 'Paid', 'Cancelled') DEFAULT 'Accrued',
    approved_by INT NULL,
    paid_at DATETIME NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_comm_agent FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
    INDEX idx_comm_agent (agent_id),
    INDEX idx_comm_status (status)
);

CREATE TABLE IF NOT EXISTS agent_payouts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    agent_id INT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'Bank Transfer',
    transaction_ref VARCHAR(100) NULL,
    payout_date DATE NOT NULL,
    status ENUM('Pending', 'Processed', 'Failed') DEFAULT 'Processed',
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_payout_agent FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
    INDEX idx_payout_agent (agent_id)
);

CREATE TABLE IF NOT EXISTS agent_quotas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    agent_id INT NOT NULL,
    period_type ENUM('Monthly', 'Quarterly', 'Annual') DEFAULT 'Monthly',
    period_label VARCHAR(50) NOT NULL,
    target_amount DECIMAL(15,2) NOT NULL DEFAULT 5000000.00,
    target_deals INT NOT NULL DEFAULT 2,
    achieved_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    achieved_deals INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_quota_agent FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
    INDEX idx_quota_agent_period (agent_id, period_label)
);

CREATE TABLE IF NOT EXISTS agent_territories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    agent_id INT NOT NULL,
    city VARCHAR(100) NOT NULL,
    zone_name VARCHAR(100) NOT NULL,
    is_exclusive BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_terr_agent FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
    INDEX idx_terr_city_zone (city, zone_name)
);

-- ────────────────────────────────────────────────────────────────────
-- PHASE 5: SALES & DEAL MANAGEMENT
-- ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS deals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    property_id INT NOT NULL,
    lead_id INT NULL,
    buyer_name VARCHAR(150) NOT NULL,
    buyer_email VARCHAR(150) NULL,
    buyer_phone VARCHAR(50) NULL,
    agent_id INT NULL,
    deal_title VARCHAR(200) NOT NULL,
    stage ENUM('Prospect', 'Offer_Made', 'Negotiation', 'Token_Received', 'Agreement_Signed', 'Closed', 'Cancelled') DEFAULT 'Prospect',
    agreed_price DECIMAL(15,2) NOT NULL,
    token_amount DECIMAL(12,2) DEFAULT 0.00,
    target_close_date DATE NULL,
    actual_close_date DATE NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_deals_property FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE RESTRICT,
    CONSTRAINT fk_deals_agent FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE SET NULL,
    INDEX idx_deals_stage (stage),
    INDEX idx_deals_agent (agent_id),
    INDEX idx_deals_property (property_id)
);

CREATE TABLE IF NOT EXISTS deal_offers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    deal_id INT NOT NULL,
    property_id INT NOT NULL,
    offered_by_name VARCHAR(150) NOT NULL,
    offered_by_role ENUM('Buyer', 'Seller', 'Agent') DEFAULT 'Buyer',
    offer_amount DECIMAL(15,2) NOT NULL,
    status ENUM('Pending', 'Accepted', 'Rejected', 'Countered') DEFAULT 'Pending',
    counter_amount DECIMAL(15,2) NULL,
    terms TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_offers_deal FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE,
    INDEX idx_offers_deal (deal_id)
);

CREATE TABLE IF NOT EXISTS deal_milestones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    deal_id INT NOT NULL,
    milestone_name VARCHAR(150) NOT NULL,
    milestone_order INT DEFAULT 1,
    due_date DATE NULL,
    amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    status ENUM('Pending', 'Due', 'Paid', 'Overdue') DEFAULT 'Pending',
    paid_date DATE NULL,
    payment_reference VARCHAR(100) NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_milestones_deal FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE,
    INDEX idx_milestones_deal (deal_id)
);

CREATE TABLE IF NOT EXISTS deal_cancellations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    deal_id INT NOT NULL,
    reason VARCHAR(255) NOT NULL,
    penalty_amount DECIMAL(12,2) DEFAULT 0.00,
    refund_amount DECIMAL(12,2) DEFAULT 0.00,
    processed_by INT NULL,
    cancelled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_cancel_deal FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE
);

-- ────────────────────────────────────────────────────────────────────
-- PHASE 6: FINANCE & ACCOUNTING
-- ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS finance_accounts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    account_code VARCHAR(20) NOT NULL UNIQUE,
    account_name VARCHAR(100) NOT NULL,
    account_type ENUM('Asset', 'Liability', 'Equity', 'Revenue', 'Expense') NOT NULL,
    balance DECIMAL(15,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS finance_ledger_entries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_ref VARCHAR(100) NOT NULL,
    deal_id INT NULL,
    entry_date DATE NOT NULL,
    description VARCHAR(255) NOT NULL,
    account_id INT NOT NULL,
    debit DECIMAL(15,2) DEFAULT 0.00,
    credit DECIMAL(15,2) DEFAULT 0.00,
    created_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_ledger_account FOREIGN KEY (account_id) REFERENCES finance_accounts(id) ON DELETE RESTRICT,
    INDEX idx_ledger_entry_date (entry_date),
    INDEX idx_ledger_deal (deal_id),
    INDEX idx_ledger_account (account_id)
);

CREATE TABLE IF NOT EXISTS finance_invoices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    deal_id INT NULL,
    client_name VARCHAR(150) NOT NULL,
    amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    due_date DATE NOT NULL,
    status ENUM('Draft', 'Sent', 'Paid', 'Overdue', 'Cancelled') DEFAULT 'Sent',
    paid_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_invoices_status (status)
);

CREATE TABLE IF NOT EXISTS finance_expenses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category VARCHAR(100) NOT NULL DEFAULT 'Operations',
    title VARCHAR(200) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    expense_date DATE NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'Bank Transfer',
    paid_to VARCHAR(150) NULL,
    notes TEXT NULL,
    created_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_expenses_category (category),
    INDEX idx_expenses_date (expense_date)
);

-- ────────────────────────────────────────────────────────────────────
-- PHASE 7: MARKETING AUTOMATION
-- ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS marketing_campaigns (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    campaign_type ENUM('Email', 'Social', 'Search', 'Portal', 'Event', 'SMS') DEFAULT 'Email',
    status ENUM('Draft', 'Active', 'Paused', 'Completed') DEFAULT 'Draft',
    budget DECIMAL(12,2) DEFAULT 0.00,
    spent DECIMAL(12,2) DEFAULT 0.00,
    target_leads INT DEFAULT 0,
    start_date DATE NULL,
    end_date DATE NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_campaigns_status (status)
);

CREATE TABLE IF NOT EXISTS marketing_automations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    campaign_id INT NULL,
    trigger_event VARCHAR(100) NOT NULL,
    channel ENUM('Email', 'SMS', 'WhatsApp') DEFAULT 'Email',
    template_subject VARCHAR(200) NOT NULL,
    template_body TEXT NOT NULL,
    delay_minutes INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_mkt_auto_camp FOREIGN KEY (campaign_id) REFERENCES marketing_campaigns(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS marketing_landing_pages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    property_id INT NULL,
    hero_tagline VARCHAR(255) NULL,
    custom_content TEXT NULL,
    visits_count INT DEFAULT 0,
    inquiries_count INT DEFAULT 0,
    is_published BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_lp_property FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL,
    INDEX idx_lp_slug (slug)
);

-- ────────────────────────────────────────────────────────────────────
-- PHASE 8: COMMUNICATION & COLLABORATION
-- ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS comm_threads (
    id INT AUTO_INCREMENT PRIMARY KEY,
    thread_type ENUM('Internal', 'Customer') DEFAULT 'Internal',
    title VARCHAR(150) NOT NULL,
    property_id INT NULL,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_threads_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_threads_type (thread_type)
);

CREATE TABLE IF NOT EXISTS comm_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    thread_id INT NOT NULL,
    sender_id INT NOT NULL,
    message_text TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_msg_thread FOREIGN KEY (thread_id) REFERENCES comm_threads(id) ON DELETE CASCADE,
    CONSTRAINT fk_msg_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_msg_thread (thread_id)
);

CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'general',
    reference_url VARCHAR(255) NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_notif_user_read (user_id, is_read)
);

CREATE TABLE IF NOT EXISTS appointments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    property_id INT NOT NULL,
    client_name VARCHAR(150) NOT NULL,
    client_email VARCHAR(150) NULL,
    client_phone VARCHAR(50) NULL,
    agent_id INT NULL,
    scheduled_time DATETIME NOT NULL,
    appointment_type ENUM('In_Person_Tour', 'Virtual_Meeting', 'Consultation') DEFAULT 'In_Person_Tour',
    status ENUM('Scheduled', 'Completed', 'Cancelled', 'No_Show') DEFAULT 'Scheduled',
    meeting_link VARCHAR(255) NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_appt_property FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    CONSTRAINT fk_appt_agent FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE SET NULL,
    INDEX idx_appt_time (scheduled_time)
);

-- ────────────────────────────────────────────────────────────────────
-- PHASE 9 & 10: AI, SMART SEARCH, MAPS & LOCATION INTELLIGENCE
-- ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ai_search_queries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    query_text VARCHAR(255) NOT NULL,
    parsed_filters JSON NULL,
    results_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS location_amenities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    property_id INT NOT NULL,
    amenity_type ENUM('School', 'Hospital', 'Metro', 'Mall', 'Airport', 'Park') NOT NULL,
    name VARCHAR(150) NOT NULL,
    distance_km DECIMAL(4,2) NOT NULL DEFAULT 1.00,
    travel_time_mins INT DEFAULT 5,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_amenities_property FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    INDEX idx_amenities_property (property_id)
);

CREATE TABLE IF NOT EXISTS location_market_stats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    city VARCHAR(100) NOT NULL,
    locality VARCHAR(100) NOT NULL,
    avg_price_sqft DECIMAL(10,2) NOT NULL DEFAULT 4500.00,
    price_growth_yoy DECIMAL(5,2) NOT NULL DEFAULT 7.50,
    rental_yield_avg DECIMAL(5,2) NOT NULL DEFAULT 4.20,
    demand_score INT DEFAULT 75,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uk_city_locality (city, locality)
);

-- ────────────────────────────────────────────────────────────────────
-- PHASE 11 & 12: ANALYTICS, BI, ENTERPRISE ADMIN & SECURITY
-- ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS custom_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    report_type VARCHAR(100) NOT NULL,
    filters JSON NULL,
    metrics JSON NULL,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(200) NULL,
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    module VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    description VARCHAR(150) NULL,
    UNIQUE KEY uk_mod_action (module, action)
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INT NOT NULL,
    permission_id INT NOT NULL,
    PRIMARY KEY(role_id, permission_id),
    CONSTRAINT fk_rp_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    CONSTRAINT fk_rp_perm FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS branches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    address VARCHAR(255) NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    phone VARCHAR(50) NULL,
    manager_id INT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token_hash VARCHAR(100) NOT NULL,
    ip_address VARCHAR(50) NULL,
    user_agent VARCHAR(255) NULL,
    last_activity DATETIME NOT NULL,
    is_revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_sessions_user (user_id)
);

CREATE TABLE IF NOT EXISTS security_audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    event_type VARCHAR(100) NOT NULL,
    severity ENUM('Info', 'Warning', 'Critical') DEFAULT 'Info',
    details JSON NULL,
    ip_address VARCHAR(50) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_sec_audit_event (event_type),
    INDEX idx_sec_audit_time (created_at)
);

-- ────────────────────────────────────────────────────────────────────
-- PHASE 13, 14 & 15: LEGAL, INTEGRATIONS & PLATFORM FOUNDATION
-- ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS legal_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    template_name VARCHAR(150) NOT NULL,
    agreement_type ENUM('Sale_Deed', 'Lease_Agreement', 'MOU', 'Agent_Brokerage') DEFAULT 'Sale_Deed',
    template_body MEDIUMTEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS legal_agreements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    deal_id INT NULL,
    property_id INT NULL,
    template_id INT NULL,
    agreement_title VARCHAR(200) NOT NULL,
    agreement_content MEDIUMTEXT NOT NULL,
    status ENUM('Draft', 'Under_Legal_Review', 'Approved', 'Pending_Signature', 'Executed', 'Rejected') DEFAULT 'Draft',
    e_signature_buyer BOOLEAN DEFAULT FALSE,
    e_signature_seller BOOLEAN DEFAULT FALSE,
    signed_date DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_legal_status (status)
);

CREATE TABLE IF NOT EXISTS legal_approvals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    agreement_id INT NOT NULL,
    approver_id INT NOT NULL,
    approver_role VARCHAR(50) NOT NULL,
    status ENUM('Approved', 'Rejected') DEFAULT 'Approved',
    comments TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_legal_appr_agr FOREIGN KEY (agreement_id) REFERENCES legal_agreements(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS api_keys (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    key_label VARCHAR(100) NOT NULL,
    api_key VARCHAR(64) NOT NULL UNIQUE,
    permissions_scope JSON NULL,
    rate_limit_rpm INT DEFAULT 60,
    is_active BOOLEAN DEFAULT TRUE,
    last_used_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_apikeys_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_apikeys_key (api_key)
);

CREATE TABLE IF NOT EXISTS webhook_subscriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    target_url VARCHAR(255) NOT NULL,
    event_types JSON NOT NULL,
    secret VARCHAR(64) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS webhook_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    webhook_id INT NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSON NOT NULL,
    response_status INT NULL,
    response_body TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_wh_logs_sub FOREIGN KEY (webhook_id) REFERENCES webhook_subscriptions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS organizations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    logo_url TEXT NULL,
    tax_id VARCHAR(50) NULL,
    primary_phone VARCHAR(50) NULL,
    primary_email VARCHAR(150) NULL,
    currency VARCHAR(10) DEFAULT 'INR',
    fiscal_year_start VARCHAR(10) DEFAULT 'April',
    settings JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS org_memberships (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT NOT NULL,
    user_id INT NOT NULL,
    branch_id INT NULL,
    role_id INT NULL,
    is_primary BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_orgm_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT fk_orgm_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
