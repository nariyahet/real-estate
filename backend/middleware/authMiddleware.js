const jwt = require("jsonwebtoken");
const { findUserById } = require("../models/userModel");

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please login.",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication token is missing.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await findUserById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User no longer exists.",
      });
    }

    req.user = user;

    next();
  } catch (error) {
    console.error("Authentication Error:", error.message);

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired. Please login again.",
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Authentication failed.",
    });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to access this resource.",
      });
    }

    next();
  };
};

const optionalProtect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      req.user = null;
      return next();
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      req.user = null;
      return next();
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await findUserById(decoded.id);
      req.user = user || null;
    } catch {
      req.user = null;
    }

    next();
  } catch {
    req.user = null;
    next();
  }
};

const adminOnly = authorize("admin");

const agentOrAdmin = authorize("agent", "admin");

const checkPermission = (moduleName, actionName) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    if (req.user.role === "admin") {
      return next();
    }

    try {
      const { pool } = require("../config/db");
      const [permRows] = await pool.execute(
        `SELECT rp.permission_id 
         FROM role_permissions rp
         JOIN roles r ON rp.role_id = r.id
         JOIN permissions p ON rp.permission_id = p.id
         WHERE (r.role_name = ? OR r.id IN (SELECT role_id FROM org_memberships WHERE user_id = ?))
           AND p.module = ? AND p.action = ?
         LIMIT 1`,
        [req.user.role, req.user.id, moduleName, actionName]
      );

      if (permRows.length > 0) {
        return next();
      }

      const roleCapabilities = {
        agent: ["crm:read", "crm:write", "properties:read", "properties:write", "deals:read", "deals:write", "communications:read", "communications:write", "broker:read"],
        user: ["properties:read", "crm:read", "communications:read", "communications:write"]
      };

      const requestedKey = `${moduleName}:${actionName}`;
      if (roleCapabilities[req.user.role]?.includes(requestedKey)) {
        return next();
      }

      return res.status(403).json({
        success: false,
        message: `Forbidden: Insufficient privileges for action '${actionName}' on module '${moduleName}'.`
      });
    } catch (err) {
      console.error("Permission check error:", err);
      return res.status(500).json({ success: false, message: "Authorization verification failed." });
    }
  };
};

module.exports = {
  protect,
  optionalProtect,
  authorize,
  adminOnly,
  agentOrAdmin,
  checkPermission
};
