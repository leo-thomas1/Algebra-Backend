const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

// Fetch Materials Endpoint
router.get('/', async (req, res) => {
  try {
    const query = 'SELECT * FROM material';
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching materials:', error);
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

module.exports = router;
