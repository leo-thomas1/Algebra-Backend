const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

// Input Validation function (simple)
const validateOrder = (order) => {
  const requiredFields = [
    'customerName', 'address', 'contactNo', 'material', 'printingType',
    'ratePerSqft', 'length', 'breadth', 'totalAmount',
    'paymentByCash', 'paymentByOnline', 'wastageCharge', 'outstanding'
  ];

  for (let field of requiredFields) {
    if (!order[field] && order[field] !== 0) {
      return `${field} is required`;
    }
  }

  return null;
};

// Create Order Endpoint
router.post('/', async (req, res) => {
  const {
    customerName,
    address,
    contactNo,
    materialId,        // Corresponding to material_id in table
    printingType,
    length,
    breadth,
    totalAmount,
    paymentByCash,
    paymentByOnline,
    wastageCharge,
    outstanding,
  } = req.body;

  // Validate order data
  const validationError = validateOrder(req.body);
  if (validationError) {
    return res.status(400).json({ success: false, error: validationError });
  }

  // Calculate derived fields
  const sqftRequired = parseFloat(length) * parseFloat(breadth);
  const recalculatedTotalAmount = sqftRequired * parseFloat(ratePerSqft);
  const recalculatedOutstanding = recalculatedTotalAmount - 
    (parseFloat(paymentByCash) + parseFloat(paymentByOnline) + parseFloat(wastageCharge));

  // Check consistency of input
  if (Math.abs(recalculatedTotalAmount - totalAmount) > 0.01) {
    return res.status(400).json({
      success: false,
      error: 'Total amount does not match the calculated value based on sqft and rate per sqft.'
    });
  }
  if (Math.abs(recalculatedOutstanding - outstanding) > 0.01) {
    return res.status(400).json({
      success: false,
      error: 'Outstanding does not match the calculated value.'
    });
  }

  try {
    // Insert new order into the ordertable
    const query = `
      INSERT INTO ordertable (
        customer_name, address, contact_no, material_id, printing_type,
        sqft_required, total_amount, payment_by_cash, payment_via_online, 
        total_outstanding, wastage_charge, length, breadth
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    `;
    const values = [
      customerName,
      address,
      contactNo,
      materialId,  // Using materialId from the request body
      printingType,
      sqftRequired,
      recalculatedTotalAmount,
      paymentByCash,
      paymentByOnline,
      recalculatedOutstanding,
      wastageCharge,
      length,
      breadth,
    ];

    await pool.query(query, values);
    res.json({ success: true, message: 'Order created successfully' });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ success: false, error: 'Database error' });
  }
});
module.exports = router;
