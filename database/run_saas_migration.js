const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });
const { pool } = require('../backend/config/db');

/**
 * Stage 2: Purely Additive SaaS Multi-Tenant Migration
 *
 * Strict Production Guarantees:
 * - Does NOT drop, truncate, or alter any existing tables.
 * - Does NOT modify existing organizations, users, agents, memberships, properties, or Phase 1-15 data.
 * - Does NOT insert or modify any rows in `org_memberships`.
 * - Does NOT create a subscription for Organization 1 or any existing tenant.
 * - ONLY creates new schema tables (`saas_plans`, `subscriptions`, `subscription_invoices`) using IF NOT EXISTS.
 * - Seeds default plan definitions using TRUE NO-OP ON EXISTING ROWS (`INSERT IGNORE INTO saas_plans ...`).
 * - Completely safe, idempotent, and repeatable.
 */
async function runSaaSMigration() {
  console.log('🚀 Running Purely Additive SaaS Schema Migration (Zero tenant/user mutations)...');

  try {
    // 1. Create saas_plans table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS saas_plans (
        id INT AUTO_INCREMENT PRIMARY KEY,
        slug VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        tagline VARCHAR(255),
        price_monthly DECIMAL(10,2) NOT NULL DEFAULT 0,
        price_yearly DECIMAL(10,2) NOT NULL DEFAULT 0,
        currency VARCHAR(10) DEFAULT 'INR',
        max_properties INT DEFAULT 5,
        max_agents INT DEFAULT 1,
        features JSON NOT NULL,
        is_popular BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Created or verified `saas_plans` table.');

    // 2. Create subscriptions table (strictly scoped to organizations)
    await pool.query(`
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
      )
    `);
    console.log('✓ Created or verified `subscriptions` table.');

    // 3. Create subscription_invoices table (strictly scoped to organizations)
    await pool.query(`
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
      )
    `);
    console.log('✓ Created or verified `subscription_invoices` table.');

    // 4. Seed default SaaS plan definitions using true no-op (INSERT IGNORE)
    const plansData = [
      {
        slug: 'starter',
        name: 'Starter',
        tagline: 'Ideal for independent brokers and boutique listings',
        price_monthly: 0,
        price_yearly: 0,
        currency: 'INR',
        max_properties: 5,
        max_agents: 1,
        features: JSON.stringify([
          'Up to 5 active property listings',
          '1 dedicated agent seat',
          'Standard lead inquiry forms',
          'Basic property photo gallery',
          'Standard email support'
        ]),
        is_popular: false
      },
      {
        slug: 'pro',
        name: 'Professional',
        tagline: 'High-velocity growth suite for growing brokerages',
        price_monthly: 2499.00,
        price_yearly: 24990.00, // 2 months free on annual
        currency: 'INR',
        max_properties: 50,
        max_agents: 5,
        features: JSON.stringify([
          'Up to 50 active property listings',
          'Up to 5 collaborative agent seats',
          'Full CRM Pipeline with Kanban board',
          'Deal escrow & milestone tracking',
          'Digital legal contracts & e-signatures',
          'Automated commission calculation',
          'Priority agency badge & support'
        ]),
        is_popular: true
      },
      {
        slug: 'enterprise',
        name: 'Enterprise',
        tagline: 'Unrestricted enterprise scale for real estate conglomerates',
        price_monthly: 7999.00,
        price_yearly: 79990.00,
        currency: 'INR',
        max_properties: -1, // Unlimited
        max_agents: -1,     // Unlimited
        features: JSON.stringify([
          'Unlimited property listings',
          'Unlimited agent & broker seats',
          'AI Buyer-Property Match & NL Search',
          'Multi-branch management & territories',
          'Advanced Financial P&L & Chart of Accounts',
          'Developer API Keys & Webhook events',
          'Executive BI Analytics & Audit Logs',
          'Custom brand styling & dedicated SLA'
        ]),
        is_popular: false
      }
    ];

    for (const plan of plansData) {
      await pool.query(`
        INSERT IGNORE INTO saas_plans (slug, name, tagline, price_monthly, price_yearly, currency, max_properties, max_agents, features, is_popular)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        plan.slug, plan.name, plan.tagline, plan.price_monthly, plan.price_yearly,
        plan.currency, plan.max_properties, plan.max_agents, plan.features, plan.is_popular
      ]);
    }
    console.log('✓ Seeded SaaS plan definitions using INSERT IGNORE (no-op on existing rows).');

    console.log('\n🎉 Migration script finished successfully with ZERO modifications to existing tenant/user/property records.');
    process.exit(0);
  } catch (error) {
    console.error('Migration Error:', error);
    process.exit(1);
  }
}

runSaaSMigration();
