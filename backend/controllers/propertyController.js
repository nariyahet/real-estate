const {
  getAllProperties,
  getPropertyById,
  createProperty,
  updateProperty: updatePropertyModel,
  deleteProperty: deletePropertyModel,
  getPropertiesByAgent,
} = require("../models/propertyModel");

const { pool } = require("../config/db");

const getProperties = async (req, res) => {
  try {
    const {
      search,
      city,
      propertyType,
      listingType,
      minPrice,
      maxPrice,
      bedrooms,
      status,
      featured,
      page,
      limit,
    } = req.query;

    const result = await getAllProperties({
      search,
      city,
      propertyType,
      listingType,
      minPrice,
      maxPrice,
      bedrooms,
      status,
      featured,
      page,
      limit,
    });

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Get Properties Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch properties.",
    });
  }
};

const getProperty = async (req, res) => {
  try {
    const { id } = req.params;

    if (!Number.isInteger(Number(id))) {
      return res.status(400).json({
        success: false,
        message: "Invalid property ID.",
      });
    }

    const property = await getPropertyById(Number(id));

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found.",
      });
    }

    return res.status(200).json({
      success: true,
      property,
    });
  } catch (error) {
    console.error("Get Property Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch property.",
    });
  }
};

const addProperty = async (req, res) => {
  try {
    if (!req.user || !["admin", "agent"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Only admin or agent can create properties.",
      });
    }

    const {
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
      featured,
    } = req.body;

    if (
      !title ||
      !property_type ||
      !listing_type ||
      price === undefined ||
      price === null ||
      price === ""
    ) {
      return res.status(400).json({
        success: false,
        message: "Title, property type, listing type and price are required.",
      });
    }

    if (Number.isNaN(Number(price)) || Number(price) < 0) {
      return res.status(400).json({
        success: false,
        message: "Price must be a valid positive number.",
      });
    }

    const allowedPropertyTypes = [
      "Apartment",
      "Villa",
      "House",
      "Office",
      "Shop",
      "Land",
      "Warehouse",
    ];

    if (!allowedPropertyTypes.includes(property_type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid property type.",
      });
    }

    if (!["Sale", "Rent"].includes(listing_type)) {
      return res.status(400).json({
        success: false,
        message: "Listing type must be Sale or Rent.",
      });
    }

    const allowedStatuses = ["Available", "Sold", "Rented", "Inactive"];

    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid property status.",
      });
    }

    let agentId = null;

    if (req.user.role === "agent") {
      const [agentRows] = await pool.execute(
        `
        SELECT id
        FROM agents
        WHERE user_id = ?
        LIMIT 1
        `,
        [req.user.id],
      );

      if (!agentRows[0]) {
        return res.status(400).json({
          success: false,
          message: "Agent profile not found.",
        });
      }

      agentId = agentRows[0].id;
    }

    if (req.user.role === "admin" && req.body.agent_id) {
      agentId = Number(req.body.agent_id);

      if (!Number.isInteger(agentId) || agentId <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid agent ID.",
        });
      }
    }

    const property = await createProperty({
      agent_id: agentId,
      title: title.trim(),
      description: description || null,
      property_type,
      listing_type,
      price: Number(price),
      bedrooms: Number(bedrooms) || 0,
      bathrooms: Number(bathrooms) || 0,
      area:
        area !== undefined && area !== null && area !== ""
          ? Number(area)
          : null,
      address: address || null,
      city: city || null,
      state: state || null,
      country: country || "India",
      latitude:
        latitude !== undefined && latitude !== null && latitude !== ""
          ? Number(latitude)
          : null,
      longitude:
        longitude !== undefined && longitude !== null && longitude !== ""
          ? Number(longitude)
          : null,
      status: status || "Available",
      featured: req.user.role === "admin" ? Boolean(featured) : false,
    });

    return res.status(201).json({
      success: true,
      message: "Property created successfully.",
      property,
    });
  } catch (error) {
    console.error("Add Property Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create property.",
    });
  }
};

const editProperty = async (req, res) => {
  try {
    if (!req.user || !["admin", "agent"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Only admin or agent can update properties.",
      });
    }

    const { id } = req.params;

    if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid property ID.",
      });
    }

    const propertyId = Number(id);

    const existingProperty = await getPropertyById(propertyId);

    if (!existingProperty) {
      return res.status(404).json({
        success: false,
        message: "Property not found.",
      });
    }

    if (req.user.role === "agent") {
      const [agentRows] = await pool.execute(
        `
        SELECT id
        FROM agents
        WHERE user_id = ?
        LIMIT 1
        `,
        [req.user.id],
      );

      const agentId = agentRows[0]?.id;

      if (!agentId) {
        return res.status(403).json({
          success: false,
          message: "Agent profile not found.",
        });
      }

      if (Number(existingProperty.agent_id) !== Number(agentId)) {
        return res.status(403).json({
          success: false,
          message: "You can only update your own properties.",
        });
      }
    }

    if (req.body.title !== undefined && !String(req.body.title).trim()) {
      return res.status(400).json({
        success: false,
        message: "Property title cannot be empty.",
      });
    }

    if (
      req.body.price !== undefined &&
      (Number.isNaN(Number(req.body.price)) || Number(req.body.price) < 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid property price.",
      });
    }

    const allowedPropertyTypes = [
      "Apartment",
      "Villa",
      "House",
      "Office",
      "Shop",
      "Land",
      "Warehouse",
    ];

    if (
      req.body.property_type !== undefined &&
      !allowedPropertyTypes.includes(req.body.property_type)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid property type.",
      });
    }

    if (
      req.body.listing_type !== undefined &&
      !["Sale", "Rent"].includes(req.body.listing_type)
    ) {
      return res.status(400).json({
        success: false,
        message: "Listing type must be Sale or Rent.",
      });
    }

    const allowedStatuses = ["Available", "Sold", "Rented", "Inactive"];

    if (
      req.body.status !== undefined &&
      !allowedStatuses.includes(req.body.status)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid property status.",
      });
    }

    const allowedFields = [
      "title",
      "description",
      "property_type",
      "listing_type",
      "price",
      "bedrooms",
      "bathrooms",
      "area",
      "address",
      "city",
      "state",
      "country",
      "latitude",
      "longitude",
      "status",
      "featured",
    ];

    const updateData = {};

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    if (updateData.title !== undefined) {
      updateData.title = String(updateData.title).trim();
    }

    if (updateData.price !== undefined) {
      updateData.price = Number(updateData.price);
    }

    if (updateData.bedrooms !== undefined) {
      updateData.bedrooms = Number(updateData.bedrooms) || 0;
    }

    if (updateData.bathrooms !== undefined) {
      updateData.bathrooms = Number(updateData.bathrooms) || 0;
    }

    if (
      updateData.area !== undefined &&
      updateData.area !== null &&
      updateData.area !== ""
    ) {
      updateData.area = Number(updateData.area);
    }

    if (
      updateData.latitude !== undefined &&
      updateData.latitude !== null &&
      updateData.latitude !== ""
    ) {
      updateData.latitude = Number(updateData.latitude);
    }

    if (
      updateData.longitude !== undefined &&
      updateData.longitude !== null &&
      updateData.longitude !== ""
    ) {
      updateData.longitude = Number(updateData.longitude);
    }

    if (req.user.role === "agent") {
      delete updateData.featured;
    } else if (updateData.featured !== undefined) {
      updateData.featured = Boolean(updateData.featured);
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields provided for update.",
      });
    }

    const property = await updatePropertyModel(propertyId, updateData);

    return res.status(200).json({
      success: true,
      message: "Property updated successfully.",
      property,
    });
  } catch (error) {
    console.error("Edit Property Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update property.",
    });
  }
};

const removeProperty = async (req, res) => {
  try {
    if (!req.user || !["admin", "agent"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Only admin or agent can delete properties.",
      });
    }

    const { id } = req.params;

    if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid property ID.",
      });
    }

    const propertyId = Number(id);

    const existingProperty = await getPropertyById(propertyId);

    if (!existingProperty) {
      return res.status(404).json({
        success: false,
        message: "Property not found.",
      });
    }

    if (req.user.role === "agent") {
      const [agentRows] = await pool.execute(
        `
        SELECT id
        FROM agents
        WHERE user_id = ?
        LIMIT 1
        `,
        [req.user.id],
      );

      const agentId = agentRows[0]?.id;

      if (!agentId) {
        return res.status(403).json({
          success: false,
          message: "Agent profile not found.",
        });
      }

      if (Number(existingProperty.agent_id) !== Number(agentId)) {
        return res.status(403).json({
          success: false,
          message: "You can only delete your own properties.",
        });
      }
    }

    const deleted = await deletePropertyModel(propertyId);

    if (!deleted) {
      return res.status(500).json({
        success: false,
        message: "Property could not be deleted.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Property deleted successfully.",
    });
  } catch (error) {
    console.error("Remove Property Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete property.",
    });
  }
};

const getMyProperties = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "agent") {
      return res.status(403).json({
        success: false,
        message: "Only agents can access their properties.",
      });
    }

    const [agentRows] = await pool.execute(
      `
      SELECT id
      FROM agents
      WHERE user_id = ?
      LIMIT 1
      `,
      [req.user.id],
    );

    if (!agentRows[0]) {
      return res.status(404).json({
        success: false,
        message: "Agent profile not found.",
      });
    }

    const properties = await getPropertiesByAgent(agentRows[0].id);

    return res.status(200).json({
      success: true,
      properties,
    });
  } catch (error) {
    console.error("Get My Properties Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch your properties.",
    });
  }
};

module.exports = {
  getProperties,
  getProperty,
  addProperty,
  editProperty,
  removeProperty,
  getMyProperties,
};
