USE real_estate_db;

INSERT INTO users
(name, email, password, phone, role)
VALUES
(
    'Admin User',
    'admin@realestate.com',
    '$2b$10$exampleAdminHashedPassword',
    '+91 9000000001',
    'admin'
),
(
    'John Agent',
    'john@realestate.com',
    '$2b$10$exampleAgentHashedPassword',
    '+91 9000000002',
    'agent'
),
(
    'Demo User',
    'user@realestate.com',
    '$2b$10$exampleUserHashedPassword',
    '+91 9000000003',
    'user'
);

INSERT INTO agents
(user_id, agency_name, bio, experience, location)
VALUES
(
    2,
    'Prime Properties',
    'Professional real estate agent helping clients find residential and commercial properties.',
    5,
    'Surat'
);

INSERT INTO properties
(
    agent_id,
    title,
    description,
    property_type,
    listing_type,
    price,
    bedrooms,
    bathrooms,
    area,
    address,
    city,
    state,
    country,
    status,
    featured
)
VALUES
(
    1,
    'Modern 3 BHK Apartment',
    'Beautiful modern apartment with spacious rooms, parking and excellent city connectivity.',
    'Apartment',
    'Sale',
    7500000,
    3,
    2,
    1450,
    'Vesu Main Road',
    'Surat',
    'Gujarat',
    'India',
    'Available',
    TRUE
),
(
    1,
    'Luxury 4 BHK Villa',
    'Premium independent villa with modern interiors, private parking and garden.',
    'Villa',
    'Sale',
    12500000,
    4,
    3,
    2800,
    'Adajan',
    'Surat',
    'Gujarat',
    'India',
    'Available',
    TRUE
),
(
    1,
    'Commercial Office Space',
    'Fully furnished commercial office suitable for startups and professional businesses.',
    'Office',
    'Rent',
    45000,
    0,
    2,
    1200,
    'Ring Road',
    'Surat',
    'Gujarat',
    'India',
    'Available',
    FALSE
),
(
    1,
    '2 BHK Family Apartment',
    'Comfortable apartment located near schools, shopping areas and public transport.',
    'Apartment',
    'Rent',
    22000,
    2,
    2,
    1100,
    'Pal',
    'Surat',
    'Gujarat',
    'India',
    'Available',
    FALSE
);

INSERT INTO property_images
(property_id, image_url, is_primary)
VALUES
(
    1,
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c',
    TRUE
),
(
    2,
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c',
    TRUE
),
(
    3,
    'https://images.unsplash.com/photo-1497366754035-f200968a6e72',
    TRUE
),
(
    4,
    'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3',
    TRUE
);