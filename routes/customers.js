const express = require("express");
const router = express.Router();
const pool = require("../db/pool");

router.get("/", async (req, res) => {
  const { contact } = req.query;

  try {
    if (contact) {
      const query = `
        SELECT CustomerID, Name, Address, PhoneNumber 
        FROM Customer 
        WHERE PhoneNumber LIKE $1 
        ORDER BY PhoneNumber ASC
      `;
      const result = await pool.query(query, [`${contact}%`]);
      return res.status(200).json({ customers: result.rows });
    }

    const result = await pool.query("SELECT * FROM Customer ORDER BY CustomerID ASC");
    res.status(200).json({ customers: result.rows });
  } catch (error) {
    console.error("Error fetching customers:", error);
    res.status(500).json({ error: "Failed to fetch customers." });
  }
});

router.post("/", async (req, res) => {
  const { name, contact, address } = req.body;

  if (!name || !contact || !address) {
    return res.status(400).json({ error: "All fields are required." });
  }

  try {
    const existingCustomerQuery = `
      SELECT CustomerID, Name, PhoneNumber, Address 
      FROM Customer 
      WHERE PhoneNumber = $1
    `;
    const existingCustomerResult = await pool.query(existingCustomerQuery, [contact]);

    if (existingCustomerResult.rows.length > 0) {
      return res.status(200).json({
        success: true,
        message: "Customer already exists.",
        customer: existingCustomerResult.rows[0],
      });
    }

    const insertQuery = `
      INSERT INTO Customer (Name, PhoneNumber, Address)
      VALUES ($1, $2, $3)
      RETURNING CustomerID, Name, PhoneNumber, Address;
    `;
    const insertResult = await pool.query(insertQuery, [name.trim(), contact.trim(), address.trim()]);

    res.status(201).json({
      success: true,
      message: "Customer created successfully.",
      customer: insertResult.rows[0],
    });
  } catch (error) {
    console.error("Error creating customer:", error);
    res.status(500).json({ error: "Failed to create customer." });
  }
});

module.exports = router;




