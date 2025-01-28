const express = require("express");
const pool = require("../db/pool");
const router = express.Router();

// Fetch all users (with optional search query)
// routes/users.js
router.get("/", async (req, res) => {
  try {
      const query = `
          SELECT 
              u.userid, u.name, u.contactno, u.roleid, u.status, r.rolename
          FROM users u
          JOIN role r ON u.roleid = r.roleid
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
      const result = await pool.query("SELECT * FROM role ORDER BY roleid ASC");
      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching roles:", error);
      res.status(500).json({ error: "Failed to fetch roles." });
    }
  });

// Add a new user
router.post("/", async (req, res) => {
  try {
    const { name, contact_no, role_id, password } = req.body;
    const result = await pool.query(
      "INSERT INTO users (name, contact_no, roleid, password) VALUES ($1, $2, $3, $4) RETURNING *",
      [name, contact_no, role_id, password]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Edit an existing user
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, contact_no, role_id, password } = req.body;
    const result = await pool.query(
      "UPDATE users SET name = $1, contact_no = $2, roleid = $3, password = $4 WHERE userid = $5 RETURNING *",
      [name, contact_no, role_id, password, id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a user
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM users WHERE userid = $1", [id]);
    res.json({ message: "User deleted successfully!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
