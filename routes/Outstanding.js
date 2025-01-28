// backend/routes/OutstandingRoutes.js
const express = require("express");
const router = express.Router();
const pool = require("../db/pool");

/**
 * GET /api/outstanding
 * Optional Query Params:
 *   search (string) => filter by c.name or c.phonenumber
 *   min (number)    => min outstanding
 *   max (number)    => max outstanding
 *
 * Returns array of objects:
 *  {
 *    customerid,
 *    customername,
 *    phonenumber,
 *    total_master_orders,
 *    total_child_orders,
 *    total_amount,
 *    total_payments,
 *    outstanding
 *  }
 */
router.get("/", async (req, res) => {
  const { search, min, max } = req.query;

  // Base query to gather data
  let baseQuery = `
    SELECT
      c.customerid,
      c.name AS customername,
      c.phonenumber,
      COUNT(DISTINCT om.orderid) AS total_master_orders,
      COUNT(oc.order_cid) AS total_child_orders,
      COALESCE(SUM(oc.amount + oc.wastagecharge), 0) AS total_amount,
      COALESCE(SUM(pc.amount), 0) AS total_payments,
      (
        COALESCE(SUM(oc.amount + oc.wastagecharge), 0)
        - COALESCE(SUM(pc.amount), 0)
      ) AS outstanding
    FROM customer c
    JOIN order_master om ON om.customerid = c.customerid
    LEFT JOIN order_child oc ON oc.orderid = om.orderid
    LEFT JOIN payment_master pm ON pm.orderid = om.orderid
    LEFT JOIN payment_child pc ON pc.paymentid = pm.paymentid
  `;

  const whereClauses = [];
  const havingClauses = [];

  // If user typed something in "search"
  if (search) {
    // Match name or phone
    whereClauses.push(`
      (LOWER(c.name) LIKE LOWER('%${search}%')
       OR c.phonenumber LIKE '%${search}%')
    `);
  }

  // We'll group by these
  let groupByClause = `
    GROUP BY c.customerid, c.name, c.phonenumber
  `;

  // Convert min, max to numbers if provided
  const minVal = min ? parseFloat(min) : 0;
  const maxVal = max ? parseFloat(max) : 100000000; // 100 million default

  // We'll filter outstanding in the HAVING clause
  havingClauses.push(`
    (
      COALESCE(SUM(oc.amount + oc.wastagecharge), 0)
      - COALESCE(SUM(pc.amount), 0)
    ) BETWEEN ${minVal} AND ${maxVal}
  `);

  // Build final
  if (whereClauses.length > 0) {
    baseQuery += " WHERE " + whereClauses.join(" AND ");
  }

  baseQuery += groupByClause;

  if (havingClauses.length > 0) {
    baseQuery += " HAVING " + havingClauses.join(" AND ");
  }

  baseQuery += " ORDER BY outstanding DESC";

  try {
    const result = await pool.query(baseQuery);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching outstanding:", error);
    res.status(500).json({ error: "Failed to fetch outstanding." });
  }
});

module.exports = router;
