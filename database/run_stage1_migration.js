const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });
const { pool } = require('../backend/config/db');

async function runMigration() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🚀 EXECUTING STAGE 1 ENTERPRISE DATABASE MIGRATION (PHASES 3–15)');
  console.log('═══════════════════════════════════════════════════════════════\n');

  try {
    const sqlPath = path.join(__dirname, 'migrations/create_stage1_enterprise_features.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    // Remove line comments and split SQL by semicolon
    const cleanSql = sqlContent
      .split('\n')
      .map(line => line.trim().startsWith('--') ? '' : line)
      .join('\n');

    const statements = cleanSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    console.log(`Found ${statements.length} migration statements to execute...`);

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      if (stmt.trim()) {
        await pool.execute(stmt);
      }
    }
    console.log('✅ All Stage 1 Enterprise tables created successfully.\n');

    // ─────────────────────────────────────────────────────────────
    // SEED ENTERPRISE REFERENCE DATA (Chart of accounts, default roles, org)
    // ─────────────────────────────────────────────────────────────
    console.log('🌱 Seeding initial Enterprise Reference Data...');

    // 1. Finance Accounts
    const defaultAccounts = [
      ['1000', 'Bank Operating Account', 'Asset'],
      ['1010', 'Client Escrow / Token Account', 'Asset'],
      ['1100', 'Accounts Receivable', 'Asset'],
      ['2000', 'Accounts Payable', 'Liability'],
      ['2010', 'Accrued Agent Commissions', 'Liability'],
      ['3000', 'Retained Earnings', 'Equity'],
      ['4000', 'Brokerage Commission Income', 'Revenue'],
      ['4010', 'Property Management & Inspection Fees', 'Revenue'],
      ['5000', 'Marketing & Advertising Expenses', 'Expense'],
      ['5010', 'Office & Operational Expenses', 'Expense'],
      ['5020', 'Legal & Regulatory Compliance Expenses', 'Expense'],
    ];

    for (const [code, name, type] of defaultAccounts) {
      await pool.execute(
        `INSERT IGNORE INTO finance_accounts (account_code, account_name, account_type, balance)
         VALUES (?, ?, ?, 0.00)`,
        [code, name, type]
      );
    }
    console.log('  ✅ Standard Chart of Accounts seeded.');

    // 2. Enterprise Organization
    await pool.execute(
      `INSERT IGNORE INTO organizations (id, name, slug, logo_url, tax_id, primary_phone, primary_email, currency, fiscal_year_start, settings)
       VALUES (1, 'EstateElite Enterprise Global', 'estate-elite', 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=100', 'GSTIN24AAACE0123M1Z5', '+91 98765 43210', 'enterprise@estateelite.com', 'INR', 'April', '{"theme": "dark", "autoAssignLeads": true, "defaultCommissionRate": 2.0}')`
    );
    console.log('  ✅ Default Enterprise Organization seeded.');

    // 3. System Roles & Branches
    await pool.execute(
      `INSERT IGNORE INTO roles (id, role_name, description, is_system)
       VALUES 
        (1, 'Administrator', 'Full unrestricted enterprise control', TRUE),
        (2, 'Branch Manager', 'Regional branch manager with oversight on agents & deals', TRUE),
        (3, 'Listing Agent', 'Real estate broker handling properties, inquiries & deals', TRUE),
        (4, 'Finance Controller', 'Access to transaction ledgers, invoicing & P&L reports', TRUE),
        (5, 'Legal Counsel', 'Access to agreement drafting, e-signatures & compliance', TRUE)`
    );

    await pool.execute(
      `INSERT IGNORE INTO branches (id, name, code, address, city, state, phone, is_active)
       VALUES
        (1, 'Surat Central Hub', 'BR-SURAT-01', 'Ring Road Business Centre', 'Surat', 'Gujarat', '+91 261 223344', TRUE),
        (2, 'Ahmedabad Corporate Hub', 'BR-AHM-02', 'SG Highway Tech Park', 'Ahmedabad', 'Gujarat', '+91 79 234567', TRUE)`
    );
    console.log('  ✅ System Roles and Regional Branches seeded.');

    // 4. Default Legal Templates
    await pool.execute(
      `INSERT IGNORE INTO legal_templates (id, template_name, agreement_type, template_body)
       VALUES
        (1, 'Standard Residential Sale Agreement', 'Sale_Deed', 'AGREEMENT TO SELL\\n\\nThis Agreement is made between the Seller and Buyer for the sale of {{property_title}} located at {{property_address}}, {{property_city}} for the agreed consideration of INR {{agreed_price}}.\\n\\n1. The Buyer has deposited an advance token of INR {{token_amount}}.\\n2. The balance payment will follow milestone schedule.\\n3. Possession shall be delivered upon clear title transfer.'),
        (2, 'Standard Commercial Lease Agreement', 'Lease_Agreement', 'COMMERCIAL LEASE CONTRACT\\n\\nThis Lease Contract is executed between the Lessor and Lessee for premises {{property_title}} at {{property_address}}.\\n\\n1. The lease shall commence on {{start_date}} for an initial term of 36 months.\\n2. The monthly lease rental is INR {{agreed_price}}.\\n3. Maintenance and utility charges are payable separately.')`
    );
    console.log('  ✅ Standard Legal Agreement Templates seeded.');

    // 5. Default Location Market Statistics
    await pool.execute(
      `INSERT IGNORE INTO location_market_stats (city, locality, avg_price_sqft, price_growth_yoy, rental_yield_avg, demand_score)
       VALUES
        ('Surat', 'Vesu', 5200.00, 8.40, 4.50, 88),
        ('Surat', 'Adajan', 4400.00, 6.20, 4.10, 80),
        ('Surat', 'Piplod', 6100.00, 9.10, 4.80, 92),
        ('Ahmedabad', 'SG Highway', 6800.00, 10.50, 5.20, 95),
        ('Mumbai', 'Bandra West', 28000.00, 5.80, 3.20, 90)`
    );
    console.log('  ✅ Locality Market Statistics seeded.');

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('🎉 STAGE 1 ENTERPRISE DATABASE MIGRATION COMPLETED SUCCESSFULLY');
    console.log('═══════════════════════════════════════════════════════════════');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration Error:', err);
    process.exit(1);
  }
}

runMigration();
