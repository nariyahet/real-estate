-- =====================================================================
-- STAGE 2: SAAS MULTI-TENANT SCHEMA (ORGANIZATION-SCOPED)
-- Safe, purely additive migration. Idempotent via IF NOT EXISTS.
-- =====================================================================

CREATE TABLE IF NOT EXISTS saas_plans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    tagline VARCHAR(255),
    price_monthly DECIMAL(10,2) NOT NULL DEFAULT 0,
    price_yearly DECIMAL(10,2) NOT NULL DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'INR',
    max_properties INT DEFAULT 5,       -- -1 for unlimited
    max_agents INT DEFAULT 1,           -- -1 for unlimited
    features JSON NOT NULL,
    is_popular BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT NOT NULL,
    plan_id INT NOT NULL,
    billing_cycle ENUM('monthly', 'yearly') DEFAULT 'monthly',
    status ENUM('active', 'trialing', 'past_due', 'canceled') DEFAULT 'active',
    current_period_start DATETIME NOT NULL,
    current_period_end DATETIME NOT NULL,
    auto_renew BOOLEAN DEFAULT TRUE,
    payment_method VARCHAR(50) DEFAULT 'Simulated Card',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_sub_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT fk_sub_plan FOREIGN KEY (plan_id) REFERENCES saas_plans(id)
);

CREATE TABLE IF NOT EXISTS subscription_invoices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT NOT NULL,
    subscription_id INT NOT NULL,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'INR',
    status ENUM('paid', 'pending', 'failed') DEFAULT 'paid',
    billing_reason VARCHAR(100) DEFAULT 'Subscription Creation',
    payment_method VARCHAR(50) DEFAULT 'Simulated Card',
    invoice_date DATETIME NOT NULL,
    paid_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_sub_inv_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT fk_sub_inv_sub FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE
);
