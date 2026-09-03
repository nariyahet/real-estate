const { pool } = require("../config/db");

const getDashboardStats = async (req, res) => {
  try {
    const [[usersResult]] = await pool.execute(
      "SELECT COUNT(*) AS totalUsers FROM users",
    );

    const [[agentsResult]] = await pool.execute(
      "SELECT COUNT(*) AS totalAgents FROM users WHERE role = 'agent'",
    );

    const [[propertiesResult]] = await pool.execute(
      "SELECT COUNT(*) AS totalProperties FROM properties",
    );

    const [[availableResult]] = await pool.execute(
      "SELECT COUNT(*) AS availableProperties FROM properties WHERE status = 'Available'",
    );

    const [[soldResult]] = await pool.execute(
      "SELECT COUNT(*) AS soldProperties FROM properties WHERE status = 'Sold'",
    );

    const [[rentedResult]] = await pool.execute(
      "SELECT COUNT(*) AS rentedProperties FROM properties WHERE status = 'Rented'",
    );

    const [[inactiveResult]] = await pool.execute(
      "SELECT COUNT(*) AS inactiveProperties FROM properties WHERE status = 'Inactive'",
    );

    return res.status(200).json({
      success: true,
      stats: {
        totalUsers: Number(usersResult.totalUsers),
        totalAgents: Number(agentsResult.totalAgents),
        totalProperties: Number(propertiesResult.totalProperties),
        availableProperties: Number(availableResult.availableProperties),
        soldProperties: Number(soldResult.soldProperties),
        rentedProperties: Number(rentedResult.rentedProperties),
        inactiveProperties: Number(inactiveResult.inactiveProperties),
      },
    });
  } catch (error) {
    console.error("Admin Dashboard Stats Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard statistics.",
      error: error.message,
    });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const [users] = await pool.execute(`
      SELECT
        id,
        name,
        email,
        phone,
        role,
        profile_image,
        created_at,
        updated_at
      FROM users
      ORDER BY created_at DESC
    `);

    return res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    console.error("Admin Get Users Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch users.",
      error: error.message,
    });
  }
};

const getAllAgents = async (req, res) => {
  try {
    const [agents] = await pool.execute(`
      SELECT
        a.id AS agent_id,
        a.user_id,
        u.name,
        u.email,
        u.phone,
        u.role,
        a.agency_name,
        a.bio,
        a.experience,
        a.location,
        u.profile_image,
        a.created_at
      FROM agents a
      INNER JOIN users u ON a.user_id = u.id
      WHERE u.role = 'agent'
      ORDER BY a.created_at DESC
    `);

    return res.status(200).json({
      success: true,
      agents,
    });
  } catch (error) {
    console.error("Admin Get Agents Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch agents.",
      error: error.message,
    });
  }
};

const updateUserRole = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID.",
      });
    }

    const allowedRoles = ["user", "agent", "admin"];

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user role.",
      });
    }

    const userId = Number(id);

    const [users] = await connection.execute(
      `
      SELECT id, name, email, role
      FROM users
      WHERE id = ?
      LIMIT 1
      `,
      [userId],
    );

    if (!users[0]) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    if (userId === Number(req.user.id) && role !== "admin") {
      return res.status(400).json({
        success: false,
        message: "You cannot remove your own admin role.",
      });
    }

    await connection.beginTransaction();

    await connection.execute(
      `
      UPDATE users
      SET role = ?
      WHERE id = ?
      `,
      [role, userId],
    );

    if (role === "agent") {
      const [agentRows] = await connection.execute(
        `
        SELECT id
        FROM agents
        WHERE user_id = ?
        LIMIT 1
        `,
        [userId],
      );

      if (!agentRows[0]) {
        await connection.execute(
          `
          INSERT INTO agents
          (
            user_id,
            agency_name,
            bio,
            experience,
            location
          )
          VALUES (?, NULL, NULL, 0, NULL)
          `,
          [userId],
        );
      }
    }

    if (role !== "agent") {
      await connection.execute(
        `
        DELETE FROM agents
        WHERE user_id = ?
        `,
        [userId],
      );
    }

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: "User role updated successfully.",
    });
  } catch (error) {
    await connection.rollback();

    console.error("Admin Update User Role Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update user role.",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

const getAllAdminProperties = async (req, res) => {
  try {
    const [properties] = await pool.execute(`
      SELECT
        p.*,
        u.name AS agent_name,
        u.email AS agent_email,
        u.phone AS agent_phone
      FROM properties p
      LEFT JOIN agents a ON p.agent_id = a.id
      LEFT JOIN users u ON a.user_id = u.id
      ORDER BY p.created_at DESC
    `);

    return res.status(200).json({
      success: true,
      properties,
    });
  } catch (error) {
    console.error("Admin Get Properties Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch admin properties.",
      error: error.message,
    });
  }
};

const updateAdminPropertyStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid property ID.",
      });
    }

    const allowedStatuses = ["Available", "Sold", "Rented", "Inactive"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid property status.",
      });
    }

    const [result] = await pool.execute(
      `
      UPDATE properties
      SET status = ?
      WHERE id = ?
      `,
      [status, Number(id)],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Property not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Property status updated successfully.",
    });
  } catch (error) {
    console.error("Admin Update Property Status Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update property status.",
      error: error.message,
    });
  }
};

const deleteAdminProperty = async (req, res) => {
  try {
    const { id } = req.params;

    if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid property ID.",
      });
    }

    const propertyId = Number(id);

    const [imageRows] = await pool.execute(
      `
      SELECT id
      FROM property_images
      WHERE property_id = ?
      `,
      [propertyId],
    );

    if (imageRows.length > 0) {
      await pool.execute(
        `
        DELETE FROM property_images
        WHERE property_id = ?
        `,
        [propertyId],
      );
    }

    const [result] = await pool.execute(
      `
      DELETE FROM properties
      WHERE id = ?
      `,
      [propertyId],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Property not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Property deleted successfully.",
    });
  } catch (error) {
    console.error("Admin Delete Property Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete property.",
      error: error.message,
    });
  }
};

module.exports = {
  getDashboardStats,
  getAllUsers,
  getAllAgents,
  updateUserRole,
  getAllAdminProperties,
  updateAdminPropertyStatus,
  deleteAdminProperty,
};
