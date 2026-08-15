CREATE DATABASE real_estate_db;

USE real_estate_db;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role ENUM('user', 'agent', 'admin') DEFAULT 'user',
    profile_image VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
);

UPDATE users
SET password = '$2b$10$zaJX5O08K4xgGdeEvHB4M.RVLqq0H0.CA2ju0q68NYCiE0UvpGrfm'
WHERE id = 2
  AND email = 'john@realestate.com';

CREATE TABLE agents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    agency_name VARCHAR(150),
    bio TEXT,
    experience INT DEFAULT 0,
    location VARCHAR(150),
    profile_image VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_agents_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

INSERT INTO agents
(
    user_id,
    agency_name,
    bio,
    experience,
    location,
    profile_image
)
VALUES
(
    2,
    'Surat Prime Realty',
    'Professional real estate agent helping clients find residential and commercial properties in Surat.',
    5,
    'Surat, Gujarat',
    NULL
);

SELECT
    id,
    agent_id,
    title,
    property_type,
    listing_type,
    price,
    city,
    status
FROM properties
ORDER BY id DESC
LIMIT 5;

SELECT id, name, email, role
FROM users
WHERE email = 'john@realestate.com';

SELECT *
FROM agents
WHERE user_id = 2;

SELECT id, name, email, role
FROM users
WHERE id = 2;

DELETE FROM agents
WHERE id = 1
AND user_id = 2;

SELECT *
FROM agents
WHERE user_id = 2;

ALTER TABLE agents
ADD UNIQUE (user_id);

SHOW COLUMNS FROM agents;

CREATE TABLE properties (
    id INT AUTO_INCREMENT PRIMARY KEY,
    agent_id INT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    property_type ENUM(
        'Apartment',
        'House',
        'Villa',
        'Office',
        'Shop',
        'Land',
        'Warehouse') NOT NULL,
    listing_type ENUM(
        'Sale',
        'Rent') NOT NULL,		
	price DECIMAL(15,2) NOT NULL,
	bedrooms INT DEFAULT 0,
    bathrooms INT DEFAULT 0,
    area DECIMAL(10,2),
    address VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100) DEFAULT 'India',
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),

    status ENUM(
        'Available',
        'Sold',
        'Rented',
        'Inactive'
    ) DEFAULT 'Available',
	featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_properties_agent
        FOREIGN KEY (agent_id)
        REFERENCES agents(id)
        ON DELETE SET NULL
);

CREATE TABLE property_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    property_id INT NOT NULL,
    image_url VARCHAR(500) NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_property_images_property
        FOREIGN KEY (property_id)
        REFERENCES properties(id)
        ON DELETE CASCADE
);


CREATE TABLE favorites (
    id INT AUTO_INCREMENT PRIMARY KEY,
	user_id INT NOT NULL,
    property_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_favorite (user_id, property_id),
    CONSTRAINT fk_favorites_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_favorites_property
        FOREIGN KEY (property_id)
        REFERENCES properties(id)
        ON DELETE CASCADE
);

CREATE TABLE inquiries (
    id INT AUTO_INCREMENT PRIMARY KEY,
	user_id INT NULL,
    property_id INT NOT NULL,
    agent_id INT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    phone VARCHAR(20),
    message TEXT NOT NULL,

    status ENUM(
        'Pending',
        'Contacted',
        'Closed'
    ) DEFAULT 'Pending',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_inquiries_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_inquiries_property
        FOREIGN KEY (property_id)
        REFERENCES properties(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_inquiries_agent
        FOREIGN KEY (agent_id)
        REFERENCES agents(id)
        ON DELETE SET NULL
);

DESCRIBE properties;