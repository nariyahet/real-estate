const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });
const { pool } = require('../backend/config/db');

async function runMigration() {
  console.log('🚀 Starting Phase 2 (Features #2 - #10) Database Migration...');
  const conn = await pool.getConnection();

  try {
    // 1. Feature #2: Add issue_date and expiry_date to property_documents if not present
    console.log('Checking property_documents columns...');
    const [cols] = await conn.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'property_documents'
        AND COLUMN_NAME IN ('issue_date', 'expiry_date')
    `);

    const colNames = cols.map(c => c.COLUMN_NAME);
    if (!colNames.includes('issue_date')) {
      console.log('Adding issue_date to property_documents...');
      await conn.query(`ALTER TABLE property_documents ADD COLUMN issue_date DATE NULL AFTER mime_type`);
    }
    if (!colNames.includes('expiry_date')) {
      console.log('Adding expiry_date to property_documents...');
      await conn.query(`ALTER TABLE property_documents ADD COLUMN expiry_date DATE NULL AFTER issue_date`);
      try {
        await conn.query(`ALTER TABLE property_documents ADD INDEX idx_property_documents_expiry (expiry_date)`);
      } catch (idxErr) {
        // index might already exist
      }
    }
    console.log('✅ property_documents table updated successfully.');

    // 2. Feature #3: Ownership Verification
    console.log('Creating property_verifications tables...');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS property_verifications (
          id INT AUTO_INCREMENT PRIMARY KEY,
          property_id INT NOT NULL,
          status ENUM('Pending', 'Verified', 'Rejected') NOT NULL DEFAULT 'Pending',
          verified_by INT NULL,
          verification_date DATETIME NULL,
          notes TEXT NULL,
          ownership_document_id INT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_verifications_property FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
          CONSTRAINT fk_verifications_user FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL,
          CONSTRAINT fk_verifications_document FOREIGN KEY (ownership_document_id) REFERENCES property_documents(id) ON DELETE SET NULL,
          INDEX idx_verifications_property (property_id),
          INDEX idx_verifications_status (status)
      ) ENGINE=InnoDB;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS property_verification_history (
          id INT AUTO_INCREMENT PRIMARY KEY,
          property_id INT NOT NULL,
          status ENUM('Pending', 'Verified', 'Rejected') NOT NULL,
          notes TEXT NULL,
          verified_by INT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT fk_verif_hist_property FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
          CONSTRAINT fk_verif_hist_user FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL,
          INDEX idx_verif_hist_property (property_id)
      ) ENGINE=InnoDB;
    `);

    // 3. Feature #4: Property Verification Checklist
    console.log('Creating property_checklists table...');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS property_checklists (
          id INT AUTO_INCREMENT PRIMARY KEY,
          property_id INT NOT NULL,
          item_key VARCHAR(50) NOT NULL,
          item_label VARCHAR(150) NOT NULL,
          is_completed BOOLEAN NOT NULL DEFAULT FALSE,
          completed_by INT NULL,
          completed_at DATETIME NULL,
          notes TEXT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_checklists_property FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
          CONSTRAINT fk_checklists_user FOREIGN KEY (completed_by) REFERENCES users(id) ON DELETE SET NULL,
          UNIQUE KEY uk_property_checklist_item (property_id, item_key),
          INDEX idx_checklists_property (property_id)
      ) ENGINE=InnoDB;
    `);

    // 4. Feature #5: Property Inspection Management
    console.log('Creating property_inspections table...');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS property_inspections (
          id INT AUTO_INCREMENT PRIMARY KEY,
          property_id INT NOT NULL,
          inspector_name VARCHAR(150) NOT NULL,
          inspection_type VARCHAR(100) NOT NULL DEFAULT 'Routine',
          scheduled_date DATETIME NOT NULL,
          status ENUM('Scheduled', 'In Progress', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Scheduled',
          condition_rating ENUM('Excellent', 'Good', 'Fair', 'Poor') NULL,
          findings TEXT NULL,
          notes TEXT NULL,
          document_id INT NULL,
          created_by INT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_inspections_property FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
          CONSTRAINT fk_inspections_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
          CONSTRAINT fk_inspections_document FOREIGN KEY (document_id) REFERENCES property_documents(id) ON DELETE SET NULL,
          INDEX idx_inspections_property (property_id),
          INDEX idx_inspections_status (status),
          INDEX idx_inspections_scheduled (scheduled_date)
      ) ENGINE=InnoDB;
    `);

    // 5. Feature #6: Maintenance Management
    console.log('Creating property_maintenance table...');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS property_maintenance (
          id INT AUTO_INCREMENT PRIMARY KEY,
          property_id INT NOT NULL,
          title VARCHAR(200) NOT NULL,
          description TEXT NULL,
          category VARCHAR(100) NOT NULL DEFAULT 'General',
          priority ENUM('Low', 'Medium', 'High', 'Urgent') NOT NULL DEFAULT 'Medium',
          status ENUM('Open', 'Assigned', 'In Progress', 'On Hold', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Open',
          assigned_to VARCHAR(150) NULL,
          estimated_cost DECIMAL(12,2) NOT NULL DEFAULT 0.00,
          actual_cost DECIMAL(12,2) NOT NULL DEFAULT 0.00,
          scheduled_date DATE NULL,
          completed_date DATE NULL,
          notes TEXT NULL,
          created_by INT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_maintenance_property FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
          CONSTRAINT fk_maintenance_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_maintenance_property (property_id),
          INDEX idx_maintenance_status (status),
          INDEX idx_maintenance_priority (priority),
          INDEX idx_maintenance_category (category)
      ) ENGINE=InnoDB;
    `);

    // 6. Feature #7: Property Lifecycle Tracking
    console.log('Creating property_lifecycle_transitions table...');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS property_lifecycle_transitions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          property_id INT NOT NULL,
          from_state VARCHAR(50) NULL,
          to_state VARCHAR(50) NOT NULL,
          notes TEXT NULL,
          changed_by INT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT fk_lifecycle_property FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
          CONSTRAINT fk_lifecycle_user FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_lifecycle_property (property_id),
          INDEX idx_lifecycle_created (created_at)
      ) ENGINE=InnoDB;
    `);

    // 7. Feature #8: Property Audit Trail
    console.log('Creating property_audit_logs table...');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS property_audit_logs (
          id INT AUTO_INCREMENT PRIMARY KEY,
          property_id INT NULL,
          user_id INT NOT NULL,
          user_name VARCHAR(150) NOT NULL,
          user_role VARCHAR(50) NOT NULL,
          action VARCHAR(100) NOT NULL,
          entity VARCHAR(100) NOT NULL,
          entity_id INT NULL,
          details JSON NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_audit_property (property_id),
          INDEX idx_audit_user (user_id),
          INDEX idx_audit_action (action),
          INDEX idx_audit_created (created_at)
      ) ENGINE=InnoDB;
    `);

    // 8. Feature #9: Advanced Saved Properties
    console.log('Creating saved_properties table...');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS saved_properties (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          property_id INT NOT NULL,
          personal_notes TEXT NULL,
          tags VARCHAR(255) NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_saved_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          CONSTRAINT fk_saved_property FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
          UNIQUE KEY uk_user_saved_property (user_id, property_id),
          INDEX idx_saved_user (user_id),
          INDEX idx_saved_property (property_id)
      ) ENGINE=InnoDB;
    `);

    // 9. Feature #10: Saved Searches & Property Collections
    console.log('Creating saved_searches & property_collections tables...');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS saved_searches (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          search_name VARCHAR(150) NOT NULL,
          filters JSON NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_searches_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_searches_user (user_id)
      ) ENGINE=InnoDB;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS property_collections (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          name VARCHAR(150) NOT NULL,
          description TEXT NULL,
          color VARCHAR(30) NOT NULL DEFAULT '#3b82f6',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_collections_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_collections_user (user_id)
      ) ENGINE=InnoDB;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS property_collection_items (
          id INT AUTO_INCREMENT PRIMARY KEY,
          collection_id INT NOT NULL,
          property_id INT NOT NULL,
          notes TEXT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT fk_collection_items_collection FOREIGN KEY (collection_id) REFERENCES property_collections(id) ON DELETE CASCADE,
          CONSTRAINT fk_collection_items_property FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
          UNIQUE KEY uk_collection_item (collection_id, property_id),
          INDEX idx_collection_items_collection (collection_id),
          INDEX idx_collection_items_property (property_id)
      ) ENGINE=InnoDB;
    `);

    console.log('🎉 All Phase 2 (Features #2-#10) tables created successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    conn.release();
    await pool.end();
  }
}

runMigration();
