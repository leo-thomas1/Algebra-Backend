// const express = require('express');
// const router = express.Router();
// const pool = require('../db/pool');

// // Route to fetch child orders with filters
// router.get('/', async (req, res) => {
//   const { role, status, startDate, endDate } = req.query; // Retrieve filters from the query params
//   console.log('Filters received:', { role, status, startDate, endDate }); // Debug log

//   try {
//     let query = `
//       SELECT 
//         oc.order_cid AS child_order_id,
//         oc.orderid AS master_order_id,
//         om.invoicenumber,
//         om.billdate,
//         c.name AS customer_name,
//         m.materialname AS material_name,
//         oc.printingtype,
//         oc.length,
//         oc.height,
//         oc.quantity,
//         oc.totalarea,
//         oc.amount,
//         oc.wastagecharge,
//         oc.orderstatus
//       FROM order_child oc
//       JOIN order_master om ON oc.orderid = om.orderid
//       JOIN customer c ON om.customerid = c.customerid
//       JOIN material m ON oc.materialid = m.materialid
//       WHERE oc.printingtype = $1
//     `;
//     const params = [role];

//     // Add dynamic filters
//     if (status) {
//       query += ` AND oc.orderstatus = $${params.length + 1}`;
//       params.push(status);
//     }
//     if (startDate) {
//       query += ` AND om.billdate >= $${params.length + 1}`;
//       params.push(startDate);
//     }
//     if (endDate) {
//       query += ` AND om.billdate <= $${params.length + 1}`;
//       params.push(endDate);
//     }

//     query += ` ORDER BY oc.order_cid DESC`;

//     console.log('Executing query with params:', params); // Debug log
//     const result = await pool.query(query, params);

//     if (result.rows.length === 0) {
//       return res.status(404).json({ error: 'No child orders found for the specified filters.' });
//     }

//     res.json(result.rows);
//   } catch (error) {
//     console.error('Error fetching child orders:', error);
//     res.status(500).json({ error: 'Database error' });
//   }
// });

// router.get('/pending-orders', async (req, res) => {
//   const { role, startDate, endDate, status } = req.query;

//   try {
//     let query = `
//       SELECT 
//         oc.order_cid AS child_order_id,
//         oc.orderid AS master_order_id,
//         om.invoicenumber,
//         om.billdate,
//         c.name AS customer_name,
//         m.materialname AS material_name,
//         oc.printingtype,
//         oc.length,
//         oc.height,
//         oc.quantity,
//         oc.totalarea,
//         oc.amount,
//         oc.wastagecharge,
//         oc.orderstatus
//       FROM order_child oc
//       JOIN order_master om ON oc.orderid = om.orderid
//       JOIN customer c ON om.customerid = c.customerid
//       JOIN material m ON oc.materialid = m.materialid
//       WHERE oc.printingtype = $1
//     `;
//     const params = [role];

//     if (status && status !== "All") {
//       query += ` AND oc.orderstatus = $${params.length + 1}`;
//       params.push(status);
//     }

//     if (startDate) {
//       query += ` AND om.billdate >= $${params.length + 1}`;
//       params.push(startDate);
//     }

//     if (endDate) {
//       query += ` AND om.billdate <= $${params.length + 1}`;
//       params.push(endDate);
//     }

//     query += ` ORDER BY oc.order_cid DESC`;

//     const result = await pool.query(query, params);

//     if (result.rows.length === 0) {
//       return res.status(404).json({ error: "No orders found." });
//     }

//     res.json(result.rows);
//   } catch (error) {
//     console.error("Error fetching orders:", error);
//     res.status(500).json({ error: "Failed to fetch orders." });
//   }
// });


// module.exports = router;
