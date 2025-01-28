const express = require("express");
const pool = require("../db/pool"); // Ensure this points to your database connection pool
const router = express.Router();

// Fetch all users
router.get("/users", async (req, res) => {
  try {
    const query = `
      SELECT 
        u.userid, 
        u.name, 
        u.contactno, 
        u.roleid, 
        u.status, 
        r.rolename 
      FROM users u 
      INNER JOIN role r ON u.roleid = r.roleid
      ORDER BY u.userid ASC;
    `;
    const result = await pool.query(query);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users." });
  }
});

// Fetch all roles
router.get("/roles", async (req, res) => {
    try {
        const result = await pool.query("SELECT roleid, rolename FROM role ORDER BY roleid ASC;");
        res.status(200).json(result.rows);
    } catch (error) {
        console.error("Error fetching roles:", error);
        res.status(500).json({ error: "Failed to fetch roles." });
    }
});


// Add a new user
router.post("/users", async (req, res) => {
  const { name, contactNo, roleID, password } = req.body;
  try {
    const query = `
      INSERT INTO users (name, contactno, roleid, password) 
      VALUES ($1, $2, $3, $4) RETURNING *;
    `;
    const values = [name, contactNo, roleID, password];
    const result = await pool.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error adding user:", error);
    res.status(500).json({ error: "Failed to add user." });
  }
});

// Update user status
router.put("/users/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const query = `
      UPDATE users 
      SET status = $1 
      WHERE userid = $2 
      RETURNING *;
    `;
    const result = await pool.query(query, [status, id]);
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Error updating user status:", error);
    res.status(500).json({ error: "Failed to update user status." });
  }
});

// Reset user password
router.put("/users/:id/reset-password", async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;
  try {
    const query = `
      UPDATE users 
      SET password = $1 
      WHERE userid = $2 
      RETURNING *;
    `;
    const result = await pool.query(query, [password, id]);
    res.status(200).json({ message: "Password reset successfully." });
  } catch (error) {
    console.error("Error resetting password:", error);
    res.status(500).json({ error: "Failed to reset password." });
  }
});

// Change user role
router.put("/users/:id/role", async (req, res) => {
  const { id } = req.params;
  const { roleID } = req.body;
  try {
    const query = `
      UPDATE users 
      SET roleid = $1 
      WHERE userid = $2 
      RETURNING *;
    `;
    const result = await pool.query(query, [roleID, id]);
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Error changing user role:", error);
    res.status(500).json({ error: "Failed to change user role." });
  }
});

module.exports = router;
