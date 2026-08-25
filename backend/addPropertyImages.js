require("dotenv").config();

const { pool } = require("./config/db");

const images = [
  [10, "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c", 1],
  [11, "https://images.unsplash.com/photo-1600585154340-be6161a56a0c", 1],
  [12, "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3", 1],
  [13, "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d", 1],
  [14, "https://images.unsplash.com/photo-1497366754035-f200968a6e72", 1],
  [15, "https://images.unsplash.com/photo-1497366811353-6870744d04b2", 1],
  [16, "https://images.unsplash.com/photo-1500382017468-9049fed747ef", 1],
  [17, "https://images.unsplash.com/photo-1600585154526-990dced4db0d", 1],
  [18, "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea", 1],
  [19, "https://images.unsplash.com/photo-1586528116493-da8f8e0e5f6e", 1]
];

(async () => {
  try {
    const sql = `
      INSERT INTO property_images
      (property_id, image_url, is_primary)
      VALUES (?, ?, ?)
    `;

    for (const image of images) {
      await pool.query(sql, image);
    }

    console.log("✅ 10 property images added successfully");
  } catch (error) {
    console.error("❌ ERROR:", error.message);
  } finally {
    await pool.end();
  }
})();