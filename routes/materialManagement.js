const express = require("express");
const pool = require("../db/pool"); // Your PostgreSQL connection
const router = express.Router();

// Fetch all materials
router.get("/", async (req, res) => {
    try {
        const query = "SELECT * FROM Material ORDER BY MaterialID ASC;";
        const result = await pool.query(query);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error("Error fetching materials:", error);
        res.status(500).json({ error: "Failed to fetch materials." });
    }
});

// Add a new material
router.post("/", async (req, res) => {
    try {
        const { materialName, ratePerSqFt } = req.body;
        const query = `
            INSERT INTO Material (MaterialName, RatePerSqFt)
            VALUES ($1, $2) RETURNING *;
        `;
        const result = await pool.query(query, [materialName, ratePerSqFt]);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error("Error adding material:", error);
        res.status(500).json({ error: "Failed to add material." });
    }
});

// Update an existing material
router.put("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { materialName, ratePerSqFt } = req.body;
        const query = `
            UPDATE Material
            SET MaterialName = $1, RatePerSqFt = $2
            WHERE MaterialID = $3 RETURNING *;
        `;
        const result = await pool.query(query, [materialName, ratePerSqFt, id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Material not found." });
        }
        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error("Error updating material:", error);
        res.status(500).json({ error: "Failed to update material." });
    }
});

// Delete a material
router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const query = `
            DELETE FROM Material
            WHERE MaterialID = $1;
        `;
        const result = await pool.query(query, [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Material not found." });
        }
        res.status(200).json({ message: "Material deleted successfully." });
    } catch (error) {
        console.error("Error deleting material:", error);
        res.status(500).json({ error: "Failed to delete material." });
    }
});

module.exports = router;
