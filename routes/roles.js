// routes/roles.js
const express = require("express");
const pool = require("../db/pool"); // Ensure this points to your database connection
const router = express.Router();

// Route to fetch roles
router.get("/", async (req, res) => {
    try {
        // Query to fetch all roles from the 'Role' table
        const query = "SELECT roleid, rolename FROM role ORDER BY roleid ASC;";
        const result = await pool.query(query);
        res.status(200).json(result.rows); // Return roles as JSON response
    } catch (error) {
        console.error("Error fetching roles:", error);
        res.status(500).json({ error: "Failed to fetch roles." });
    }
});

module.exports = router;
