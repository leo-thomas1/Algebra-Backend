// Editorder.js
const express = require('express');
const router = express.Router();
const pool = require('../db'); // Assuming you have a db.js file to handle PostgreSQL connection

// Update an order
router.put('/:orderNo', async (req, res) => {
  const {
    customerName,
    address,
    contactNo,
    materialId,
    printingType,
    sqftRequired,
    totalAmount,
    paymentByCash,
    paymentByOnline,
    totalOutstanding,
    wastageCharge,
    length,
    breadth,
  } = req.body;
  const { orderNo } = req.params;

  const query = `
    UPDATE ordertable
    SET customer_name = $1, address = $2, contact_no = $3, material_id = $4, printing_type = $5,
        sqft_required = $6, total_amount = $7, payment_by_cash = $8, payment_via_online = $9, 
        total_outstanding = $10, wastage_charge = $11, length = $12, breadth = $13
    WHERE order_no = $14
  `;
  const values = [
    customerName,
    address,
    contactNo,
    materialId,
    printingType,
    sqftRequired,
    totalAmount,
    paymentByCash,
    paymentByOnline,
    totalOutstanding,
    wastageCharge,
    length,
    breadth,
    orderNo,
  ];

  try {
    const result = await pool.query(query, values);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.json({ message: 'Order updated successfully' });
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ message: 'An error occurred while updating the order' });
  }
});

module.exports = router;

