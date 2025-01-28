const express = require("express");
const pool = require("../db/pool"); // Ensure correct path to your database connection
const router = express.Router();

// Route to search customers by phone number
router.get("/search", async (req, res) => {
  const { phone } = req.query;

  if (!phone) {
    return res.status(400).json({ error: "Phone number is required." });
  }

  try {
    const query = `
      SELECT CustomerID, Name, Address, PhoneNumber
      FROM Customer
      WHERE PhoneNumber LIKE $1
      ORDER BY PhoneNumber ASC;
    `;
    const values = [`${phone}%`];
    const result = await pool.query(query, values);

    // Return the results or an empty array
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching customers:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

// Route to submit a customer (insert or fetch existing customer)
router.post("/submit", async (req, res) => {
  const { phone, name, address } = req.body;

  if (!phone || !name || !address) {
    return res.status(400).json({ error: "All fields are required." });
  }

  try {
    // Check if the customer already exists
    const checkQuery = `
      SELECT CustomerID
      FROM Customer
      WHERE PhoneNumber = $1
    `;
    const checkResult = await pool.query(checkQuery, [phone]);

    if (checkResult.rows.length > 0) {
      // Customer exists, return the CustomerID
      return res.status(200).json({
        message: "Customer already exists.",
        customerid: checkResult.rows[0].customerid,
      });
    }

    // Insert a new customer
    const insertQuery = `
      INSERT INTO Customer (Name, Address, PhoneNumber)
      VALUES ($1, $2, $3)
      RETURNING CustomerID
    `;
    const insertValues = [name, address, phone];
    const insertResult = await pool.query(insertQuery, insertValues);

    res.status(201).json({
      message: "Customer added successfully.",
      customerid: insertResult.rows[0].customerid,
    });
  } catch (error) {
    console.error("Error submitting customer:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

module.exports = router;
