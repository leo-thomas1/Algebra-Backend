const express = require("express");
const router = express.Router();
const pool = require("../db/pool");
const authenticateUser = require("../middleware/auth"); // Ensure this import is correct



// Utility function to validate inputs
const validateOrderInputs = ({ customerId, materialId, printingType, length, height, quantity, totalArea, totalAmount }) => {
  if (!customerId || isNaN(customerId)) return 'Invalid or missing customerId';
  if (!materialId || isNaN(materialId)) return 'Invalid or missing materialId';
  if (!printingType || typeof printingType !== 'string') return 'Invalid or missing printingType';
  if (!length || isNaN(length)) return 'Invalid or missing length';
  if (!height || isNaN(height)) return 'Invalid or missing height';
  if (!quantity || isNaN(quantity)) return 'Invalid or missing quantity';
  if (!totalArea || isNaN(totalArea)) return 'Invalid or missing totalArea';
  if (!totalAmount || isNaN(totalAmount)) return 'Invalid or missing totalAmount';
  return null;
};

// Create a new order
router.post("/", authenticateUser, async (req, res) => {
  const { customerId, printingDetails } = req.body;
  const createdBy = req.user?.userId; // Extract userId from token

  if (!customerId || !createdBy || !printingDetails || printingDetails.length === 0) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  try {
    // Insert into Order_Master
    const masterQuery = `
      INSERT INTO Order_Master (customerid, createdby, billdate, invoicenumber, totalamount, orderstatus, totalwastagecharge)
      VALUES ($1, $2, NOW(), CONCAT('INV-', NEXTVAL('order_invoice_seq')), 0, 'Pending', 0)
      RETURNING orderid;
    `;
    const masterResult = await pool.query(masterQuery, [customerId, createdBy]);
    const orderId = masterResult.rows[0].orderid;

    // Insert into Order_Child
    const childQuery = `
      INSERT INTO Order_Child (orderid, materialid, printingtype, length, height, quantity, totalarea, amount, wastagecharge, printedby)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9, 0), $10);
    `;

    for (const detail of printingDetails) {
      await pool.query(childQuery, [
        orderId,
        detail.materialId,
        detail.printingType,
        detail.length,
        detail.height,
        detail.quantity,
        detail.totalArea,
        detail.totalAmount,
        detail.wastageCharge ?? 0, // Default to 0 if undefined
        createdBy,
      ]);
    }

    res.status(201).json({ success: true, message: "Order created successfully!", orderId });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ error: "Failed to create order." });
  }
});


// Fetch all orders
router.get("/", authenticateUser, async (req, res) => {
  try {
    const query = `
      SELECT om.orderid, om.invoicenumber, om.billdate, om.totalamount, om.orderstatus, c.name as customername, c.phonenumber as customercontact
      FROM Order_Master om
      LEFT JOIN Customer c ON om.customerid = c.customerid
      ORDER BY om.billdate DESC;
    `;

    const result = await pool.query(query);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ error: "Failed to fetch orders." });
  }
});

module.exports = router;


router.get("/designer/:userId", authenticateUser, async (req, res) => {
  const { userId } = req.params;
  const { searchTerm, startDate, endDate } = req.query;

  if (!userId || isNaN(userId)) {
    return res.status(400).json({ error: "Invalid or missing user ID." });
  }

  try {
    let query = `
      SELECT 
        om.orderid AS master_order_id,
        om.invoicenumber,
        om.billdate,
        om.totalamount,
        om.orderstatus,
        c.name AS customername,
        oc.order_cid AS child_order_id,
        oc.materialid,
        m.materialname,
        oc.printingtype,
        oc.length,
        oc.height,
        oc.quantity,
        oc.totalarea,
        oc.amount,
        oc.wastagecharge,
        oc.orderstatus AS child_order_status
      FROM Order_Master om
      LEFT JOIN Customer c ON om.customerid = c.customerid
      LEFT JOIN Order_Child oc ON om.orderid = oc.orderid
      LEFT JOIN Material m ON oc.materialid = m.materialid
      WHERE om.createdby = $1
    `;
    const params = [userId];

    // Apply search filters
    if (searchTerm) {
      query += ` AND (LOWER(c.name) LIKE $${params.length + 1} OR om.orderid::TEXT LIKE $${params.length + 1})`;
      params.push(`%${searchTerm.toLowerCase()}%`);
    }

    if (startDate) {
      query += ` AND om.billdate >= $${params.length + 1}`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND om.billdate <= $${params.length + 1}`;
      params.push(endDate);
    }

    query += ` ORDER BY om.billdate DESC`;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "No orders found." });
    }

    const groupedOrders = result.rows.reduce((acc, row) => {
      const masterOrderId = row.master_order_id;
      if (!acc[masterOrderId]) {
        acc[masterOrderId] = {
          master_order_id: masterOrderId,
          invoicenumber: row.invoicenumber,
          billdate: row.billdate,
          totalamount: row.totalamount,
          orderstatus: row.orderstatus,
          customername: row.customername,
          childOrders: [],
        };
      }
      acc[masterOrderId].childOrders.push({
        child_order_id: row.child_order_id,
        materialid: row.materialid,
        materialname: row.materialname,
        printingtype: row.printingtype,
        length: row.length,
        height: row.height,
        quantity: row.quantity,
        totalarea: row.totalarea,
        amount: row.amount,
        child_order_status: row.child_order_status,
      });
      return acc;
    }, {});

    res.status(200).json(Object.values(groupedOrders));
  } catch (error) {
    console.error("Error fetching designer's orders:", error);
    res.status(500).json({ error: "Failed to fetch designer's orders." });
  }
});

// Inside orders.js

// Fetch details of a specific child order
router.get("/order-child/:childOrderId", authenticateUser, async (req, res) => {
  const { childOrderId } = req.params;

  try {
    const query = `
      SELECT 
        oc.order_cid AS child_order_id,
        oc.orderid AS master_order_id,
        om.invoicenumber,
        om.billdate,
        c.name AS customername,
        c.phonenumber,
        m.materialname,
        oc.printingtype,
        oc.length,
        oc.height,
        oc.quantity,
        oc.totalarea,
        oc.amount,
        oc.wastagecharge,
        oc.orderstatus
      FROM order_child oc
      JOIN order_master om ON oc.orderid = om.orderid
      JOIN customer c ON om.customerid = c.customerid
      JOIN material m ON oc.materialid = m.materialid
      WHERE oc.order_cid = $1;
    `;
    const result = await pool.query(query, [childOrderId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Child order not found." });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching child order details:", error);
    res.status(500).json({ error: "Failed to fetch child order details." });
  }
});

// Update a specific child order
router.put("/order-child/:childOrderId/update", authenticateUser, async (req, res) => {
  const { childOrderId } = req.params;
  const { wastageCharge, orderStatus } = req.body;

  if (!orderStatus) {
    return res.status(400).json({ error: "Order status is required." });
  }

  try {
    const query = `
      UPDATE order_child
      SET wastagecharge = $1, orderstatus = $2
      WHERE order_cid = $3
      RETURNING *;
    `;
    const result = await pool.query(query, [wastageCharge, orderStatus, childOrderId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Child order not found or not updated." });
    }

    res.status(200).json({ success: true, message: "Child order updated successfully.", order: result.rows[0] });
  } catch (error) {
    console.error("Error updating child order:", error);
    res.status(500).json({ error: "Failed to update child order." });
  }
});


// Route to fetch filtered orders

// Route to fetch filtered child orders
router.get('/child-orders', async (req, res) => {
  const { role, search, status, startDate, endDate } = req.query; // Extract query params

  console.log('Filters received:', { role, search, status, startDate, endDate }); // Debugging logs

  try {
    let query = `
      SELECT 
        oc.order_cid AS child_order_id,
        oc.orderid AS master_order_id,
        om.invoicenumber,
        om.billdate,
        c.name AS customer_name,
        m.materialname AS material_name,
        oc.printingtype,
        oc.length,
        oc.height,
        oc.quantity,
        oc.totalarea,
        oc.amount,
        oc.wastagecharge,
        oc.orderstatus
      FROM order_child oc
      JOIN order_master om ON oc.orderid = om.orderid
      JOIN customer c ON om.customerid = c.customerid
      JOIN material m ON oc.materialid = m.materialid
      WHERE oc.printingtype = $1
    `;
    const params = [role];

    // Apply search filter (customer name or invoice number)
    if (search) {
      query += ` AND (LOWER(c.name) LIKE $${params.length + 1} OR LOWER(om.invoicenumber) LIKE $${params.length + 1})`;
      params.push(`%${search.toLowerCase()}%`);
    }

    // Apply status filter (Pending/Printed)
    if (status && status !== "All") {
      query += ` AND oc.orderstatus = $${params.length + 1}`;
      params.push(status);
    }

    // Apply date range filters
    if (startDate) {
      query += ` AND om.billdate >= $${params.length + 1}`;
      params.push(startDate);
    }
    if (endDate) {
      query += ` AND om.billdate <= $${params.length + 1}`;
      params.push(endDate);
    }

    query += ` ORDER BY oc.order_cid DESC`;

    console.log('Executing query with params:', params); // Debugging logs

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No orders found for the specified filters.' });
    }

    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching child orders:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

router.get("/billing-master-orders", async (req, res) => {
  const { search, startDate, endDate, status } = req.query;

  try {
    let query = `
      SELECT 
        om.orderid AS master_order_id,
        om.invoicenumber,
        c.name AS customer_name,
        c.phonenumber AS customer_contact,
        COUNT(oc.order_cid) AS child_count,
        COALESCE(SUM(oc.wastagecharge), 0) AS total_wastage_charge,
        COALESCE(SUM(oc.amount), 0) AS total_amount,
        COALESCE(SUM(oc.wastagecharge) + SUM(oc.amount), 0) AS grand_total,
        om.orderstatus AS order_status,
        om.billdate
      FROM order_master om
      LEFT JOIN customer c ON om.customerid = c.customerid
      LEFT JOIN order_child oc ON om.orderid = oc.orderid
      WHERE 1=1
    `;

    const params = [];

    // Search filter
    if (search) {
      query += ` AND (LOWER(c.name) LIKE $${params.length + 1} OR LOWER(om.invoicenumber) LIKE $${params.length + 1})`;
      params.push(`%${search.toLowerCase()}%`);
    }

    // Date range filters
    if (startDate) {
      query += ` AND om.billdate >= $${params.length + 1}`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND om.billdate <= $${params.length + 1}`;
      params.push(endDate);
    }

    // Status filter
    if (status) {
      query += ` AND om.orderstatus = $${params.length + 1}`;
      params.push(status);
    }

    query += `
      GROUP BY om.orderid, om.invoicenumber, c.name, c.phonenumber, om.orderstatus, om.billdate
      ORDER BY om.orderid DESC
    `;

    const result = await pool.query(query, params);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching master orders:", error);
    res.status(500).json({ error: "Failed to fetch master orders." });
  }
});

module.exports = router;
