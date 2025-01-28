const express = require("express");
const router = express.Router();
const pool = require("../db/pool");

router.get("/dashboard-data", async (req, res) => {
  const { startDate, endDate } = req.query;

  try {
    console.log("Fetching dashboard data for range:", startDate, endDate);

    // Query to get total master orders
    const totalMasterOrdersQuery = `
      SELECT COUNT(*) AS total_master_orders 
      FROM order_master 
      WHERE billdate BETWEEN $1 AND $2;
    `;

    // Query to get total work orders
    const totalWorkOrdersQuery = `
      SELECT COUNT(*) AS total_work_orders 
      FROM order_child 
      WHERE orderid IN (
        SELECT orderid FROM order_master WHERE billdate BETWEEN $1 AND $2
      );
    `;

    // Query to get total payments and received payments
    const totalPaymentsQuery = `
      SELECT COUNT(*) AS total_payments, SUM(COALESCE(amount, 0)) AS total_received 
      FROM payment_child 
      WHERE date BETWEEN $1 AND $2;
    `;

    // Query to calculate total amounts and wastage charges from order_child
    const totalAmountQuery = `
      SELECT 
        COALESCE(SUM(COALESCE(amount, 0)), 0) AS total_amount, 
        COALESCE(SUM(COALESCE(wastagecharge, 0)), 0) AS total_wastage_charge 
      FROM order_child 
      WHERE orderid IN (
        SELECT orderid FROM order_master WHERE billdate BETWEEN $1 AND $2
      );
    `;

    // Execute all queries in parallel
    const [
      totalMasterOrdersResult,
      totalWorkOrdersResult,
      totalPaymentsResult,
      totalAmountResult,
    ] = await Promise.all([
      pool.query(totalMasterOrdersQuery, [startDate, endDate]),
      pool.query(totalWorkOrdersQuery, [startDate, endDate]),
      pool.query(totalPaymentsQuery, [startDate, endDate]),
      pool.query(totalAmountQuery, [startDate, endDate]),
    ]);

    // Extract results
    const totalMasterOrders = totalMasterOrdersResult.rows[0]?.total_master_orders || 0;
    const totalWorkOrders = totalWorkOrdersResult.rows[0]?.total_work_orders || 0;
    const totalPayments = totalPaymentsResult.rows[0]?.total_payments || 0;
    const paymentReceived = parseFloat(totalPaymentsResult.rows[0]?.total_received || 0);

    const totalAmount = parseFloat(totalAmountResult.rows[0]?.total_amount || 0);
    const totalWastageCharge = parseFloat(totalAmountResult.rows[0]?.total_wastage_charge || 0);

    const grandTotal = totalAmount + totalWastageCharge;

    // Calculate outstanding amount
    const outstandingAmount = grandTotal - paymentReceived;

    console.log({
      totalMasterOrders,
      totalWorkOrders,
      totalPayments,
      paymentReceived,
      totalAmount,
      totalWastageCharge,
      grandTotal,
      outstandingAmount,
    });

    // Return the data
    res.status(200).json({
      total_master_orders: totalMasterOrders,
      total_work_orders: totalWorkOrders,
      total_payments: totalPayments,
      payment_received: paymentReceived,
      total_amount: grandTotal,
      outstanding_amount: outstandingAmount,
    });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    res.status(500).json({ error: "Failed to fetch dashboard data." });
  }
});

module.exports = router;
