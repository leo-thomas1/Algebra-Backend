const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

// Fetch payment details by OrderID
router.get("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const query = `
      SELECT 
        o.WastageCharge, 
        p.AdvancePaymentOnline, 
        p.AdvancePaymentCash, 
        p.FinalSettlementOnline, 
        p.FinalSettlementCash, 
        p.OutstandingAmount,
        p.AdvancePaymentOnlineDate,
        p.AdvancePaymentCashDate,
        p.FinalSettlementOnlineDate,
        p.FinalSettlementCashDate
      FROM Orders o
      LEFT JOIN Payment p ON o.OrderID = p.OrderID
      WHERE o.OrderID = $1;
    `;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Payment details not found." });
    }

    res.status(200).json({
      ...result.rows[0],
      paymentDates: {
        advancePaymentOnlineDate: result.rows[0]?.advancepaymentonlinedate || null,
        advancePaymentCashDate: result.rows[0]?.advancepaymentcashdate || null,
        finalSettlementOnlineDate: result.rows[0]?.finalsettlementonlinedate || null,
        finalSettlementCashDate: result.rows[0]?.finalsettlementcashdate || null,
      },
    });
  } catch (error) {
    console.error("Error fetching payment details:", error);
    res.status(500).json({ error: "Failed to fetch payment details." });
  }
});

// Update payment details and calculate outstanding amount
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const {
    wastageCharge,
    advancePaymentOnline,
    advancePaymentCash,
    finalSettlementOnline,
    finalSettlementCash,
  } = req.body;

  try {
    // Calculate outstanding amount
    const calculateOutstandingQuery = `
      SELECT TotalAmount - 
        (COALESCE($1, 0) + COALESCE($2, 0) + COALESCE($3, 0) + COALESCE($4, 0) + COALESCE(o.WastageCharge, 0)) AS OutstandingAmount
      FROM Orders o
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

    // Update payment details
    const updatePaymentQuery = `
      INSERT INTO Payment (OrderID, AdvancePaymentOnline, AdvancePaymentCash, FinalSettlementOnline, FinalSettlementCash, OutstandingAmount)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (OrderID)
      DO UPDATE SET 
        AdvancePaymentOnline = $2,
        AdvancePaymentCash = $3,
        FinalSettlementOnline = $4,
        FinalSettlementCash = $5,
        OutstandingAmount = $6;
    `;

    await pool.query(updatePaymentQuery, [
      id,
      advancePaymentOnline || 0,
      advancePaymentCash || 0,
      finalSettlementOnline || 0,
      finalSettlementCash || 0,
      outstandingAmount,
    ]);

    res.status(200).json({
      success: true,
      message: 'Payment details updated successfully.',
      outstandingAmount,
    });
  } catch (error) {
    console.error('Error updating payment details:', error);
    res.status(500).json({ error: 'Failed to update payment details.' });
  }
});

module.exports = router;
