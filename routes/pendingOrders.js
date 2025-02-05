const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const authenticateUser = require('../middleware/auth');

// Fetch all pending orders
router.get("/", authenticateUser, async (req, res) => {
  try {
    const query = `
      SELECT 
    o.OrderID, 
    o.CustomerID, 
    c.Name AS CustomerName, 
    o.InvoiceNumber, 
    o.PrintingType, 
    m.MaterialName AS MaterialName, 
    o.TotalArea, 
    o.TotalAmount as totalamount, 
    p.totalamount as total,
    COALESCE(p.OutstandingAmount, o.TotalAmount) AS OutstandingAmount,
    o.OrderStatus
FROM Orders o
LEFT JOIN Customer c ON o.CustomerID = c.CustomerID
LEFT JOIN Payment p ON o.OrderID = p.OrderID
LEFT JOIN Material m ON o.MaterialID = m.MaterialID
WHERE o.OrderStatus IN ('Pending', 'Printed')
ORDER BY 
    CASE 
        WHEN o.OrderStatus = 'Printed' THEN 1
        WHEN o.OrderStatus = 'Pending' THEN 2
    END,
    o.OrderID DESC;

    `;
    const result = await pool.query(query);
    res.status(200).json(result.rows);
    console.log(result.rows);
  } catch (error) {
    console.error("Error fetching pending orders:", error);
    res.status(500).json({ error: "Failed to fetch pending orders." });
  }
});

// Fetch details of a specific order
router.get('/:id', authenticateUser, async (req, res) => {
  const { id } = req.params;

  try {
    const query = `
      SELECT 
        o.OrderID, 
        c.Name AS CustomerName, 
        c.PhoneNumber AS CustomerPhone, 
        c.Address AS CustomerAddress, 
        o.InvoiceNumber, 
        o.BillDate, 
        o.PrintingType, 
        m.MaterialName AS Material, 
        o.Length, 
        o.Height, 
        o.Quantity, 
        o.TotalArea, 
        o.TotalAmount, 
        COALESCE(p.WastageCharge, 0) AS WastageCharge
      FROM Orders o
      LEFT JOIN Customer c ON o.CustomerID = c.CustomerID
      LEFT JOIN Material m ON o.MaterialID = m.MaterialID
      LEFT JOIN Payment p ON o.OrderID = p.OrderID
      WHERE o.OrderID = $1;
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching order details:', error);
    res.status(500).json({ error: 'Failed to fetch order details.' });
  }
});

// Update payment details and order status for an order
router.put('/:id/payment', authenticateUser, async (req, res) => {
  const { id } = req.params;
  const {
    wastageCharge,
    advancePaymentOnline,
    advancePaymentCash,
    finalSettlementOnline,
    finalSettlementCash,
    orderStatus,
  } = req.body;

  try {
    // Calculate Outstanding Amount
    const calculateOutstandingQuery = `
      SELECT TotalAmount - 
        (COALESCE($1, 0) + COALESCE($2, 0) + COALESCE($3, 0) + COALESCE($4, 0) + COALESCE(p.WastageCharge, 0)) AS OutstandingAmount
      FROM Orders o
      LEFT JOIN Payment p ON o.OrderID = p.OrderID
      WHERE o.OrderID = $5;
    `;

    const outstandingResult = await pool.query(calculateOutstandingQuery, [
      advancePaymentOnline,
      advancePaymentCash,
      finalSettlementOnline,
      finalSettlementCash,
      id,
    ]);

    const outstandingAmount = outstandingResult.rows[0]?.outstandingamount || 0;

    // Update Payment Details
    const updatePaymentQuery = `
      INSERT INTO Payment (OrderID, WastageCharge, AdvancePaymentOnline, AdvancePaymentCash, FinalSettlementOnline, FinalSettlementCash, OutstandingAmount)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (OrderID)
      DO UPDATE SET 
        WastageCharge = COALESCE(Payment.WastageCharge, 0) + $2,
        AdvancePaymentOnline = COALESCE(Payment.AdvancePaymentOnline, 0) + $3,
        AdvancePaymentCash = COALESCE(Payment.AdvancePaymentCash, 0) + $4,
        FinalSettlementOnline = COALESCE(Payment.FinalSettlementOnline, 0) + $5,
        FinalSettlementCash = COALESCE(Payment.FinalSettlementCash, 0) + $6,
        OutstandingAmount = $7;
    `;
    const paymentValues = [
      id,
      wastageCharge || 0,
      advancePaymentOnline || 0,
      advancePaymentCash || 0,
      finalSettlementOnline || 0,
      finalSettlementCash || 0,
      outstandingAmount,
    ];

    await pool.query(updatePaymentQuery, paymentValues);

    // Update Order Status
    const updateOrderStatusQuery = `
      UPDATE Orders
      SET OrderStatus = $1
      WHERE OrderID = $2;
    `;
    await pool.query(updateOrderStatusQuery, [orderStatus, id]);

    res.status(200).json({
      success: true,
      message: 'Payment details and order status updated successfully.',
      outstandingAmount,
    });
  } catch (error) {
    console.error('Error updating payment details and order status:', error);
    res.status(500).json({ error: 'Failed to update payment details and order status.' });
  }
});

module.exports = router;
