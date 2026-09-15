-- Migration: Create property_documents table
CREATE TABLE IF NOT EXISTS property_documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    property_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    document_type VARCHAR(100) NOT NULL DEFAULT 'Other',
    original_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    file_size INT UNSIGNED NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    uploaded_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_property_documents_property
        FOREIGN KEY (property_id)
        REFERENCES properties(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_property_documents_user
        FOREIGN KEY (uploaded_by)
        REFERENCES users(id)
        ON DELETE CASCADE,

    INDEX idx_property_documents_property (property_id),
    INDEX idx_property_documents_type (document_type),
    INDEX idx_property_documents_uploaded_by (uploaded_by)
);
