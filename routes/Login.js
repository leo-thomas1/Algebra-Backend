const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

// Login Endpoint
router.post('/', async (req, res) => {
  const { contact_no, password } = req.body;

  try {
    const query = 'SELECT * FROM users WHERE contact_no = $1 AND password = $2';
    const values = [contact_no, password];
    const result = await pool.query(query, values);

    if (result.rows.length > 0) {
      res.json({ success: true });
    } else {
      res.json({ success: false });
    }
  } catch (error) {
    console.error('Error querying database:', error);
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

module.exports = router;
