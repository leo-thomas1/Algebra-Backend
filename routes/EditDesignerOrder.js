const express = require("express");
const router = express.Router();
const pool = require("../db/pool");
const authenticateUser = require("../middleware/auth");

// Fetch a specific child order for editing
router.get("/child/:childOrderId", authenticateUser, async (req, res) => {
    const { childOrderId } = req.params;
  
    if (!childOrderId || isNaN(childOrderId)) {
      return res.status(400).json({ error: "Invalid Child Order ID." });
    }
  
    try {
      const query = `
        SELECT 
          oc.order_cid AS child_order_id,
          oc.orderid AS master_order_id,
          oc.materialid,
          m.materialname,
          m.ratepersqft,
          oc.printingtype,
          oc.length,
          oc.height,
          oc.quantity,
          oc.totalarea,
          oc.amount,
          oc.orderstatus,
          c.name AS customername,
          c.phonenumber AS customercontact,
          c.address AS customeraddress
        FROM Order_Child oc
        LEFT JOIN Material m ON oc.materialid = m.materialid
        LEFT JOIN Order_Master om ON oc.orderid = om.orderid
        LEFT JOIN Customer c ON om.customerid = c.customerid
        WHERE oc.order_cid = $1;
      `;
  
      const result = await pool.query(query, [childOrderId]);
  
      if (result.rowCount === 0) {
        return res.status(404).json({ error: "Child order not found." });
      }
  
      res.status(200).json(result.rows[0]);
    } catch (error) {
      console.error("Error fetching child order:", error);
      res.status(500).json({ error: "Failed to fetch child order." });
    }
  });

  router.put("/child/edit/:childOrderId", authenticateUser, async (req, res) => {
    const { childOrderId } = req.params;
    const {
      materialId,
      printingType,
      length,
      height,
      quantity,
      totalArea,
      totalAmount,
      orderStatus,
    } = req.body;
  
    // Validate the childOrderId and input fields
    if (!childOrderId || isNaN(childOrderId)) {
      return res.status(400).json({ error: "Invalid Child Order ID." });
    }
  
    if (!materialId || !printingType || !length || !height || !quantity || !orderStatus) {
      return res.status(400).json({ error: "All fields are required." });
    }
  
    try {
      const updateQuery = `
        UPDATE Order_Child
        SET 
          materialid = $1,
          printingtype = $2,
          length = $3,
          height = $4,
          quantity = $5,
          totalarea = $6,
          amount = $7,
          orderstatus = $8
        WHERE order_cid = $9
        RETURNING *;
      `;
  
      const values = [
        materialId,
        printingType,
        length,
        height,
        quantity,
        totalArea,
        totalAmount,
        orderStatus,
        childOrderId,
      ];
  
      const result = await pool.query(updateQuery, values);
  
      if (result.rowCount === 0) {
        return res.status(404).json({ error: "Child order not found." });
      }
  
      res.status(200).json({
        success: true,
        message: "Child order updated successfully.",
        updatedOrder: result.rows[0],
      });
    } catch (error) {
      console.error("Error updating child order:", error);
      res.status(500).json({ error: "Failed to update child order." });
    }
  });

  // Fetch child orders with search functionality
router.get("/child/search", authenticateUser, async (req, res) => {
  const { searchTerm, startDate, endDate } = req.query;

  try {
    let query = `
      SELECT 
        oc.order_cid AS child_order_id,
        oc.orderid AS master_order_id,
        oc.materialid,
        m.materialname,
        m.ratepersqft,
        oc.printingtype,
        oc.length,
        oc.height,
        oc.quantity,
        oc.totalarea,
        oc.amount,
        oc.orderstatus,
        c.name AS customername,
        c.phonenumber AS customercontact,
        c.address AS customeraddress
      FROM Order_Child oc
      LEFT JOIN Material m ON oc.materialid = m.materialid
      LEFT JOIN Order_Master om ON oc.orderid = om.orderid
      LEFT JOIN Customer c ON om.customerid = c.customerid
      WHERE 1=1
    `;
    const queryParams = [];

    if (searchTerm) {
      query += ` AND (oc.order_cid::TEXT LIKE $1 OR LOWER(c.name) LIKE $1)`;
      queryParams.push(`%${searchTerm.toLowerCase()}%`);
    }

    if (startDate) {
      query += ` AND om.orderdate >= $${queryParams.length + 1}`;
      queryParams.push(startDate);
    }

    if (endDate) {
      query += ` AND om.orderdate <= $${queryParams.length + 1}`;
      queryParams.push(endDate);
    }

    const result = await pool.query(query, queryParams);

    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching child orders:", error);
    res.status(500).json({ error: "Failed to fetch child orders." });
  }
});

  

module.exports = router;
