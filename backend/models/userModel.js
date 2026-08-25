const { pool } = require("../config/db");

const findUserByEmail = async (email) => {
  const [rows] = await pool.execute(
    `
      SELECT
        id,
        name,
        email,
        password,
        phone,
        role,
        profile_image,
        created_at,
        updated_at
      FROM users
      WHERE email = ?
      LIMIT 1
    `,
    [email],
  );

  return rows[0] || null;
};

const findUserById = async (id) => {
  const [rows] = await pool.execute(
    `
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
      WHERE id = ?
      LIMIT 1
    `,
    [id],
  );

  return rows[0] || null;
};

const createUser = async ({ name, email, password, phone, role = "user" }) => {
  const [result] = await pool.execute(
    `
      INSERT INTO users
      (
        name,
        email,
        password,
        phone,
        role
      )
      VALUES (?, ?, ?, ?, ?)
    `,
    [name, email, password, phone || null, role],
  );

  return findUserById(result.insertId);
};

const updateUser = async (id, { name, phone, profile_image }) => {
  const [result] = await pool.execute(
    `
      UPDATE users
      SET
        name = ?,
        phone = ?,
        profile_image = ?
      WHERE id = ?
    `,
    [name, phone || null, profile_image || null, id],
  );

  if (result.affectedRows === 0) {
    return null;
  }

  return findUserById(id);
};

module.exports = {
  findUserByEmail,
  findUserById,
  createUser,
  updateUser,
};
