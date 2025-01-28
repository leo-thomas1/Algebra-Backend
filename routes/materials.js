const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

// Fetch all materials
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT MaterialID, MaterialName, RatePerSqFt FROM Material ORDER BY MaterialID ASC');
    res.json(result.rows); // Ensure MaterialName and RatePerSqFt are returned correctly
  } catch (error) {
    console.error('Error fetching materials:', error);
    res.status(500).json({ error: 'Failed to fetch materials.' });
  }
});

module.exports = router;
