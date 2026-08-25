require("dotenv").config();

const { pool } = require("./config/db");

const properties = [
  [10, "Premium 3 BHK Apartment", "Modern apartment with spacious rooms and excellent connectivity.", "Apartment", "Sale", 6800000, 3, 2, 1550, "Vesu", "Surat", "Gujarat", "India", "Available", 1],
  [10, "Elegant 4 BHK Villa", "Luxury villa with garden, parking and premium interiors.", "Villa", "Sale", 14500000, 4, 4, 3200, "Piplod", "Surat", "Gujarat", "India", "Available", 1],
  [10, "Family 2 BHK Apartment", "Comfortable family apartment near schools and shopping areas.", "Apartment", "Sale", 5200000, 2, 2, 1150, "Adajan", "Surat", "Gujarat", "India", "Available", 0],
  [10, "Modern 3 BHK House", "Independent house with spacious living area and private parking.", "House", "Sale", 8500000, 3, 3, 2100, "Pal", "Surat", "Gujarat", "India", "Available", 1],
  [10, "Commercial Retail Shop", "Prime commercial shop suitable for retail and business.", "Shop", "Rent", 35000, 0, 1, 850, "Ring Road", "Surat", "Gujarat", "India", "Available", 0],
  [10, "Premium Office Space", "Fully furnished office space in a prime commercial location.", "Office", "Sale", 9500000, 0, 2, 1800, "City Light", "Surat", "Gujarat", "India", "Available", 1],
  [10, "Residential Land Plot", "Well-located residential plot suitable for a custom home.", "Land", "Sale", 6200000, 0, 0, 2400, "Dumas Road", "Surat", "Gujarat", "India", "Available", 0],
  [10, "Spacious 5 BHK Villa", "Large luxury villa with modern design and garden.", "Villa", "Sale", 22000000, 5, 5, 4500, "Vesu", "Surat", "Gujarat", "India", "Available", 1],
  [10, "2 BHK Rental Home", "Well-maintained home in a peaceful residential area.", "House", "Rent", 25000, 2, 2, 1250, "Athwa", "Surat", "Gujarat", "India", "Available", 0],
  [10, "Industrial Warehouse", "Large warehouse suitable for storage and logistics.", "Warehouse", "Rent", 85000, 0, 2, 5000, "Sachin GIDC", "Surat", "Gujarat", "India", "Available", 0]
];

(async () => {
  try {
    const sql = `
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
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    for (const property of properties) {
      await pool.query(sql, property);
    }

    console.log("✅ 10 properties added successfully");
  } catch (error) {
    console.error("❌ ERROR:", error.message);
  } finally {
    await pool.end();
  }
})();