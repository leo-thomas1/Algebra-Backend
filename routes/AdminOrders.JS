const express = require("express");
const router = express.Router();
const pool = require("../db/pool");

// Get all orders with dynamic filters (status, search, date range)
router.get("/", async (req, res) => {
  try {
    const { status, startDate, endDate, search } = req.query;

    let query = `
      SELECT 
        om.orderid AS orderid,
        c.name AS customername,
        c.phonenumber,
        om.invoicenumber,
        om.orderstatus AS status,
        (SELECT COUNT(*) FROM order_child oc WHERE oc.orderid = om.orderid) AS workorders,
        (SELECT COALESCE(SUM(oc.amount), 0) + COALESCE(SUM(oc.wastagecharge), 0) FROM order_child oc WHERE oc.orderid = om.orderid) AS totalamount,
        (
          SELECT 
            COALESCE(SUM(pc.amount), 0) 
          FROM payment_child pc
          JOIN payment_master pm ON pc.paymentid = pm.paymentid
          WHERE pm.orderid = om.orderid
        ) AS payments_received
      FROM order_master om
      LEFT JOIN customer c ON om.customerid = c.customerid
    `;

    let conditions = [];
    let params = [];

    if (status) {
      conditions.push(`om.orderstatus = $${conditions.length + 1}`);
      params.push(status);
    }
    if (startDate && endDate) {
      conditions.push(`om.billdate BETWEEN $${conditions.length + 1} AND $${conditions.length + 2}`);
      params.push(startDate, endDate);
    }
    if (search) {
      conditions.push(
        `(c.name ILIKE $${conditions.length + 1} OR 
          om.invoicenumber ILIKE $${conditions.length + 1} OR 
          c.phonenumber ILIKE $${conditions.length + 1})`
      );
      params.push(`%${search}%`);
    }

    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(" AND ");
    }

    query += " ORDER BY om.billdate DESC";

    const result = await pool.query(query, params);

    const orders = result.rows.map((row) => ({
      ...row,
      outstandingamount: parseFloat(row.totalamount || 0) - parseFloat(row.payments_received || 0),
    }));

    res.status(200).json(orders);
  } catch (error) {
    console.error("Error fetching admin orders:", error);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

module.exports = router;
