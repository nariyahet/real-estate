const { pool } = require("../config/db");

const getAllProperties = async ({
  search = "",
  city = "",
  propertyType = "",
  listingType = "",
  minPrice = "",
  maxPrice = "",
  bedrooms = "",
  status = "Available",
  featured = "",
  page = 1,
  limit = 10,
} = {}) => {
  const conditions = [];
  const values = [];

  if (status) {
    conditions.push("p.status = ?");
    values.push(status);
  }

  if (search) {
    conditions.push(`
            (
                p.title LIKE ?
                OR p.description LIKE ?
                OR p.address LIKE ?
                OR p.city LIKE ?
            )
        `);

    const searchValue = `%${search}%`;

    values.push(searchValue, searchValue, searchValue, searchValue);
  }

  if (city) {
    conditions.push("p.city = ?");
    values.push(city);
  }

  if (propertyType) {
    conditions.push("p.property_type = ?");
    values.push(propertyType);
  }

  if (listingType) {
    conditions.push("p.listing_type = ?");
    values.push(listingType);
  }

  if (minPrice !== "" && minPrice !== undefined) {
    conditions.push("p.price >= ?");
    values.push(Number(minPrice));
  }

  if (maxPrice !== "" && maxPrice !== undefined) {
    conditions.push("p.price <= ?");
    values.push(Number(maxPrice));
  }

  if (bedrooms !== "" && bedrooms !== undefined) {
    conditions.push("p.bedrooms >= ?");
    values.push(Number(bedrooms));
  }

  if (featured !== "" && featured !== undefined) {
    conditions.push("p.featured = ?");
    values.push(
      featured === true ||
        featured === "true" ||
        featured === 1 ||
        featured === "1"
        ? 1
        : 0,
    );
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const currentPage = Math.max(Number(page) || 1, 1);

  const pageLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);

  const offset = (currentPage - 1) * pageLimit;

  const countValues = [...values];

  const [countRows] = await pool.execute(
    `
        SELECT COUNT(*) AS total
        FROM properties p
        ${whereClause}
        `,
    countValues,
  );

  const total = Number(countRows[0]?.total || 0);

  const [properties] = await pool.execute(
    `
    SELECT
        p.id,
        p.agent_id,
        p.title,
        p.description,
        p.property_type,
        p.listing_type,
        p.price,
        p.bedrooms,
        p.bathrooms,
        p.area,
        p.address,
        p.city,
        p.state,
        p.country,
        p.latitude,
        p.longitude,
        p.status,
        p.featured,
        p.created_at,
        p.updated_at,

        a.agency_name,
        u.name AS agent_name,
        u.email AS agent_email,
        u.phone AS agent_phone

    FROM properties p

    LEFT JOIN agents a
        ON p.agent_id = a.id

    LEFT JOIN users u
        ON a.user_id = u.id

    ${whereClause}

    ORDER BY p.created_at DESC

    LIMIT ${pageLimit} OFFSET ${offset}
    `,
    values,
  );

  return {
    properties,
    pagination: {
      page: currentPage,
      limit: pageLimit,
      total,
      totalPages: Math.ceil(total / pageLimit),
    },
  };
};

const getPropertyById = async (id) => {
  const [rows] = await pool.execute(
    `
        SELECT
            p.id,
            p.agent_id,
            p.title,
            p.description,
            p.property_type,
            p.listing_type,
            p.price,
            p.bedrooms,
            p.bathrooms,
            p.area,
            p.address,
            p.city,
            p.state,
            p.country,
            p.latitude,
            p.longitude,
            p.status,
            p.featured,
            p.created_at,
            p.updated_at,

            a.agency_name,
            a.bio AS agent_bio,
            a.experience AS agent_experience,
            a.location AS agent_location,

            u.id AS agent_user_id,
            u.name AS agent_name,
            u.email AS agent_email,
            u.phone AS agent_phone,
            u.profile_image AS agent_profile_image

        FROM properties p

        LEFT JOIN agents a
            ON p.agent_id = a.id

        LEFT JOIN users u
            ON a.user_id = u.id

        WHERE p.id = ?

        LIMIT 1
        `,
    [id],
  );

  if (!rows[0]) {
    return null;
  }

  const [images] = await pool.execute(
    `
        SELECT
            id,
            image_url,
            is_primary,
            created_at
        FROM property_images
        WHERE property_id = ?
        ORDER BY is_primary DESC, id ASC
        `,
    [id],
  );

  return {
    ...rows[0],
    images,
  };
};

const createProperty = async ({
  agent_id,
  title,
  description,
  property_type,
  listing_type,
  price,
  bedrooms = 0,
  bathrooms = 0,
  area = null,
  address,
  city,
  state,
  country = "India",
  latitude = null,
  longitude = null,
  status = "Available",
  featured = false,
}) => {
  const [result] = await pool.execute(
    `
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
            latitude,
            longitude,
            status,
            featured
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
    [
      agent_id || null,
      title,
      description || null,
      property_type,
      listing_type,
      Number(price),
      Number(bedrooms) || 0,
      Number(bathrooms) || 0,
      area !== null && area !== undefined && area !== "" ? Number(area) : null,
      address || null,
      city || null,
      state || null,
      country || "India",
      latitude !== null && latitude !== undefined && latitude !== ""
        ? Number(latitude)
        : null,
      longitude !== null && longitude !== undefined && longitude !== ""
        ? Number(longitude)
        : null,
      status || "Available",
      featured ? 1 : 0,
    ],
  );

  return getPropertyById(result.insertId);
};

const updateProperty = async (id, data) => {
  const allowedFields = {
    title: "title",
    description: "description",
    property_type: "property_type",
    listing_type: "listing_type",
    price: "price",
    bedrooms: "bedrooms",
    bathrooms: "bathrooms",
    area: "area",
    address: "address",
    city: "city",
    state: "state",
    country: "country",
    latitude: "latitude",
    longitude: "longitude",
    status: "status",
    featured: "featured",
  };

  const updates = [];
  const values = [];

  Object.keys(data).forEach((key) => {
    if (allowedFields[key] && data[key] !== undefined) {
      updates.push(`${allowedFields[key]} = ?`);

      values.push(data[key]);
    }
  });

  if (updates.length === 0) {
    return getPropertyById(id);
  }

  values.push(id);

  const [result] = await pool.execute(
    `
        UPDATE properties
        SET
            ${updates.join(", ")}
        WHERE id = ?
        `,
    values,
  );

  if (result.affectedRows === 0) {
    return null;
  }

  return getPropertyById(id);
};

const deleteProperty = async (id) => {
  const [result] = await pool.execute(
    `
        DELETE FROM properties
        WHERE id = ?
        `,
    [id],
  );

  return result.affectedRows > 0;
};

const getPropertiesByAgent = async (agentId) => {
  const [rows] = await pool.execute(
    `
        SELECT
            p.id,
            p.title,
            p.property_type,
            p.listing_type,
            p.price,
            p.bedrooms,
            p.bathrooms,
            p.area,
            p.city,
            p.status,
            p.featured,
            p.created_at
        FROM properties p
        WHERE p.agent_id = ?
        ORDER BY p.created_at DESC
        `,
    [agentId],
  );

  return rows;
};

module.exports = {
  getAllProperties,
  getPropertyById,
  createProperty,
  updateProperty,
  deleteProperty,
  getPropertiesByAgent,
};
