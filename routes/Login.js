require("dotenv").config();
const express = require("express");
const pool = require("../db/pool");
const router = express.Router();

const jwt = require("jsonwebtoken");
require("dotenv").config();

const SECRET_KEY = process.env.SECRET_KEY;

router.post("/", async (req, res) => {
  const { username, password } = req.body;

  try {
    const query = `
      SELECT u.UserID, u.Name, u.ContactNo, u.Password, u.RoleID, r.RoleName, u.Status
      FROM Users u
      JOIN Role r ON u.RoleID = r.RoleID
      WHERE u.ContactNo = $1
    `;
    const result = await pool.query(query, [username]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid username or password." });
    }

    const user = result.rows[0];

    // Check if the user's status is disabled
    if (user.status === "disabled") {
      return res.status(403).json({ error: "Your account is disabled." });
    }

    // Check if the password is correct
    if (password !== user.password) {
      return res.status(401).json({ error: "Invalid username or password." });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.userid, role: user.rolename },
      SECRET_KEY,
      { expiresIn: "1h" }
    );

    res.status(200).json({
      token,
      userId: user.userid,
      role: user.rolename,
    });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ error: "Internal server error. Please try again later." });
  }
});

module.exports = router;
