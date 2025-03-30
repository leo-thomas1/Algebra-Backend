const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

// ✅ Get all materials with wastagecharge
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT materialid, materialname, ratepersqft, wastagecharge
      FROM material
      ORDER BY materialid ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching materials:', error);
    res.status(500).json({ error: 'Failed to fetch materials.' });
  }
});

// ✅ Get a specific material by ID (with wastagecharge)
router.get('/:materialId', async (req, res) => {
  const { materialId } = req.params;

  try {
    const result = await pool.query(`
      SELECT materialid, materialname, ratepersqft, wastagecharge
      FROM material
      WHERE materialid = $1
    `, [materialId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Material not found.' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching material by ID:', error);
    res.status(500).json({ error: 'Failed to fetch material.' });
  }
});

module.exports = router;
