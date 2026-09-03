
INSERT INTO users
(name, email, password, phone, role)
VALUES
(
    'Admin User',
    'admin@realestate.com',
    '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    '+91 9000000001',
    'admin'
),
(
    'John Agent',
    'john@realestate.com',
    '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    '+91 9000000002',
    'agent'
),
(
    'Demo User',
    'user@realestate.com',
    '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
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
),
(
    1,
    'Premium 3 BHK Flat',
    'Spacious premium apartment with modern kitchen, balcony and covered parking.',
    'Apartment',
    'Sale',
    6800000,
    3,
    2,
    1550,
    'Piplod',
    'Surat',
    'Gujarat',
    'India',
    'Available',
    TRUE
),
(
    1,
    'Elegant 5 BHK Villa',
    'Large luxury villa with landscaped garden, spacious bedrooms and private parking.',
    'Villa',
    'Sale',
    18500000,
    5,
    4,
    3600,
    'City Light',
    'Surat',
    'Gujarat',
    'India',
    'Available',
    TRUE
),
(
    1,
    'Affordable 1 BHK Apartment',
    'Affordable and well-connected apartment ideal for individuals and small families.',
    'Apartment',
    'Sale',
    3200000,
    1,
    1,
    750,
    'Katargam',
    'Surat',
    'Gujarat',
    'India',
    'Available',
    FALSE
),
(
    1,
    'Retail Shop Space',
    'Prime commercial shop located in a busy market area with excellent customer visibility.',
    'Shop',
    'Rent',
    35000,
    0,
    1,
    650,
    'Varachha Road',
    'Surat',
    'Gujarat',
    'India',
    'Available',
    FALSE
),
(
    1,
    'Spacious 4 BHK Residence',
    'Well-designed family residence with large living spaces and modern amenities.',
    'Apartment',
    'Sale',
    9800000,
    4,
    3,
    2200,
    'Athwa',
    'Surat',
    'Gujarat',
    'India',
    'Sold',
    TRUE
),
(
    1,
    'Corporate Office Building',
    'Modern commercial office building suitable for corporate companies and businesses.',
    'Office',
    'Sale',
    22000000,
    0,
    4,
    4200,
    'Dumas Road',
    'Surat',
    'Gujarat',
    'India',
    'Available',
    TRUE
);


INSERT INTO property_images
(property_id, image_url, is_primary)
VALUES
(1, 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c', TRUE),
(2, 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c', TRUE),
(3, 'https://images.unsplash.com/photo-1497366754035-f200968a6e72', TRUE),
(4, 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3', TRUE),
(5, 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d', TRUE),
(6, 'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde', TRUE),
(7, 'https://images.unsplash.com/photo-1600585154526-990dced4db0d', TRUE),
(8, 'https://images.unsplash.com/photo-1497366811353-6870744d04b2', TRUE),
(9, 'https://images.unsplash.com/photo-1600607688969-a5bfcd646154', TRUE),
(10, 'https://images.unsplash.com/photo-1497366216548-37526070297c', TRUE);


INSERT INTO inquiries
(property_id, user_id, agent_id, name, email, phone, message, status, agent_notes)
VALUES
(
    1,
    3,
    1,
    'Demo User',
    'user@realestate.com',
    '+91 9000000003',
    'Hello, I am interested in this 3 BHK apartment. Is it possible to schedule a site visit this Saturday afternoon?',
    'Pending',
    NULL
),
(
    2,
    3,
    1,
    'Demo User',
    'user@realestate.com',
    '+91 9000000003',
    'Can you provide more details about the maintenance charges and parking facilities for this villa?',
    'Contacted',
    'Called client on Thursday. Shared brochure and scheduled a meeting for Sunday 11 AM.'
);


SELECT id, name, email, role
FROM users;

SELECT id, user_id, agency_name
FROM agents;

SELECT id, title, city, status, price
FROM properties;

SELECT id, property_id, image_url
FROM property_images;

SELECT id, property_id, user_id, agent_id, name, status
FROM inquiries;