const express = require("express");
const router = express.Router();
const pool = require("../db/pool");
const authenticateUser = require("../middleware/auth");

// Fetch master order, child orders, and outstanding amount
router.get("/master/:orderId", authenticateUser, async (req, res) => {
  const { orderId } = req.params;

  try {
    // Fetch master order details
    const masterQuery = `
      SELECT om.*, c.name AS customername, c.phonenumber, c.address
      FROM Order_master om
      JOIN Customer c ON om.customerid = c.customerid
      WHERE om.orderid = $1;
    `;

    // Fetch child orders under the master order
    const childQuery = `
      SELECT oc.*, m.materialname
      FROM Order_child oc
      JOIN Material m ON oc.materialid = m.materialid
      WHERE oc.orderid = $1;
    `;

    // Fetch total payments made
    const paymentsQuery = `
      SELECT SUM(amount) AS total_payments
      FROM Payment_child pc
      JOIN Payment_master pm ON pc.paymentid = pm.paymentid
      WHERE pm.orderid = $1;
    `;

    // Fetch all payment history
    const paymentHistoryQuery = `
      SELECT pc.payment_cid, pc.payment_type, pc.payment_method, pc.amount, pc.date, u.name AS billed_by
      FROM Payment_child pc
      JOIN Payment_master pm ON pc.paymentid = pm.paymentid
      JOIN Users u ON pc.billedby = u.userid
      WHERE pm.orderid = $1
      ORDER BY pc.date DESC;
    `;

    // Calculate Grand Total from child orders
    const grandTotalQuery = `
      SELECT SUM(oc.wastagecharge) AS total_wastagecharge, SUM(oc.amount) AS total_amount
      FROM Order_child oc
      WHERE oc.orderid = $1;
    `;

    const [
      masterResult,
      childResult,
      paymentsResult,
      paymentHistoryResult,
      grandTotalResult,
    ] = await Promise.all([
      pool.query(masterQuery, [orderId]),
      pool.query(childQuery, [orderId]),
      pool.query(paymentsQuery, [orderId]),
      pool.query(paymentHistoryQuery, [orderId]),
      pool.query(grandTotalQuery, [orderId]),
    ]);

    if (masterResult.rows.length === 0) {
      return res.status(404).json({ error: "Master order not found." });
    }

    const masterOrder = masterResult.rows[0];
    const childOrders = childResult.rows;
    const totalPayments = parseFloat(paymentsResult.rows[0]?.total_payments || 0);

    const totalWastageCharge = parseFloat(grandTotalResult.rows[0]?.total_wastagecharge || 0);
    const totalAmount = parseFloat(grandTotalResult.rows[0]?.total_amount || 0);
    const grandTotal = totalWastageCharge + totalAmount;

    const outstandingAmount = grandTotal - totalPayments;

    res.status(200).json({
      masterOrder,
      childOrders,
      outstandingAmount,
      paymentHistory: paymentHistoryResult.rows,
    });
  } catch (error) {
    console.error("Error fetching billing data:", error);
    res.status(500).json({ error: "Database error" });
  }
});


// Add payment
// Add payment and return payment history with outstanding amount
router.post("/payments", authenticateUser, async (req, res) => {
  const { orderId, paymentType, paymentMethod, amount } = req.body;
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(400).json({ error: "Authenticated user not found." });
  }

  try {
    // Check if Payment_master exists for the order
    const checkPaymentQuery = `SELECT paymentid FROM Payment_master WHERE orderid = $1`;
    const checkPaymentResult = await pool.query(checkPaymentQuery, [orderId]);

    let paymentId;
    if (checkPaymentResult.rows.length > 0) {
      paymentId = checkPaymentResult.rows[0].paymentid;
    } else {
      const insertPaymentMasterQuery = `
        INSERT INTO Payment_master (orderid)
        VALUES ($1)
        RETURNING paymentid
      `;
      const paymentMasterResult = await pool.query(insertPaymentMasterQuery, [orderId]);
      paymentId = paymentMasterResult.rows[0].paymentid;
    }

    // Insert new payment into Payment_child
    const insertPaymentChildQuery = `
      INSERT INTO Payment_child (paymentid, billedby, payment_method, payment_type, amount, date)
      VALUES ($1, $2, $3, $4, $5, CURRENT_DATE)
    `;
    await pool.query(insertPaymentChildQuery, [paymentId, userId, paymentMethod, paymentType, amount]);

    // Recalculate Outstanding Amount
    const totalPaymentsQuery = `
      SELECT SUM(amount) AS total_payments
      FROM Payment_child
      WHERE paymentid = $1
    `;
    const totalPaymentsResult = await pool.query(totalPaymentsQuery, [paymentId]);
    const totalPayments = parseFloat(totalPaymentsResult.rows[0]?.total_payments || 0);

    const masterOrderQuery = `
      SELECT totalamount, totalwastagecharge
      FROM Order_master
      WHERE orderid = $1
    `;
    const masterOrderResult = await pool.query(masterOrderQuery, [orderId]);
    const masterOrder = masterOrderResult.rows[0];
    const grandTotal =
      parseFloat(masterOrder.totalamount || 0) + parseFloat(masterOrder.totalwastagecharge || 0);
    const outstandingAmount = grandTotal - totalPayments;

    // Fetch Payment History
    const paymentHistoryQuery = `
      SELECT pc.payment_cid, pc.payment_type, pc.payment_method, pc.amount, pc.date, u.name AS billed_by
      FROM Payment_child pc
      JOIN Users u ON pc.billedby = u.userid
      WHERE pc.paymentid = $1
      ORDER BY pc.date DESC
    `;
    const paymentHistoryResult = await pool.query(paymentHistoryQuery, [paymentId]);

    res.status(201).json({
      message: "Payment added successfully.",
      outstandingAmount,
      paymentHistory: paymentHistoryResult.rows,
    });
  } catch (error) {
    console.error("Error adding payment:", error);
    res.status(500).json({ error: "Failed to add payment." });
  }
});

router.put("/update-status", authenticateUser, async (req, res) => {
  const { orderId, status } = req.body;

  try {
    const updateStatusQuery = `
      UPDATE Order_master
      SET orderstatus = $1
      WHERE orderid = $2
    `;
    await pool.query(updateStatusQuery, [status, orderId]);

    res.status(200).json({ message: "Order status updated successfully." });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ error: "Failed to update order status." });
  }
});




module.exports = router;
