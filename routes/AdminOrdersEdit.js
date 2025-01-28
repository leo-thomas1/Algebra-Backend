const express = require("express");
const router = express.Router();
const pool = require("../db/pool");

// 1) GET Master Order, Child Orders, Payment History
//    (Includes orderstatus, wastagecharge, etc. for child orders)
router.get("/:orderId", async (req, res) => {
  const { orderId } = req.params;

  try {
    // --------- Master Order + Customer Info ----------
    // Make sure order_master has columns: orderid, invoicenumber, orderstatus, ...
    // and you can join with 'customer' table for name, phonenumber, address
    const masterOrderQuery = `
      SELECT
        om.orderid,
        om.invoicenumber,
        om.orderstatus,
        c.name AS customername,
        c.phonenumber AS customercontact,
        c.address AS customeraddress
      FROM order_master om
      JOIN customer c ON om.customerid = c.customerid
      WHERE om.orderid = $1
    `;
    const masterRes = await pool.query(masterOrderQuery, [orderId]);
    if (masterRes.rows.length === 0) {
      return res.status(404).json({ error: "Master order not found" });
    }
    const masterOrder = masterRes.rows[0];

    // --------- Child Orders -----------
    // Make sure order_child has columns: order_cid, orderid, printingtype,
    //   length, height, quantity, totalarea, wastagecharge, amount, orderstatus
    //   plus the "materialid" and we join with "material" for materialname, ratepersqft
    const childOrdersQuery = `
      SELECT
        oc.order_cid,
        oc.materialid,
        oc.printingtype,
        oc.length,
        oc.height,
        oc.quantity,
        oc.totalarea,
        oc.wastagecharge,
        oc.amount,
        oc.orderstatus,
        m.materialname,
        m.ratepersqft
      FROM order_child oc
      JOIN material m ON oc.materialid = m.materialid
      WHERE oc.orderid = $1
    `;
    const childRes = await pool.query(childOrdersQuery, [orderId]);

    // --------- Payment History ---------
    // Make sure payment_child has columns: payment_cid, payment_type, payment_method,
    //   amount, date, billedby
    // We'll join with payment_master (which must have orderid) and also join users for billed_by
    const paymentQuery = `
      SELECT
        pc.payment_cid,
        pc.payment_type,
        pc.payment_method,
        pc.amount,
        pc.date,
        u.name AS billed_by
      FROM payment_child pc
      JOIN payment_master pm ON pc.paymentid = pm.paymentid
      JOIN users u ON pc.billedby = u.userid
      WHERE pm.orderid = $1
    `;
    const paymentRes = await pool.query(paymentQuery, [orderId]);

    // Send everything to frontend
    res.json({
      masterOrder,
      childOrders: childRes.rows,
      paymentHistory: paymentRes.rows,
    });
  } catch (err) {
    console.error("Error fetching order details:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 2) Update Master Order Status
//    PUT /api/admin-orders/:orderId/status  { orderstatus }
router.put("/:orderId/status", async (req, res) => {
  const { orderId } = req.params;
  const { orderstatus } = req.body;

  try {
    const updateMasterStatus = `
      UPDATE order_master
      SET orderstatus = $1
      WHERE orderid = $2
    `;
    await pool.query(updateMasterStatus, [orderstatus, orderId]);
    res.status(200).json({ message: "Master order status updated." });
  } catch (error) {
    console.error("Error updating master order status:", error);
    res.status(500).json({ error: "Failed to update master order status." });
  }
});

// 3) UPDATE a Child Order (includes printingtype, length, height, quantity,
//    totalarea, amount, orderstatus, etc.)
router.put("/child/:order_cid", async (req, res) => {
  const { order_cid } = req.params;
  const {
    materialid,
    printingtype,
    length,
    height,
    quantity,
    orderstatus,
  } = req.body;

  try {
    // 1) Get ratepersqft from material
    const rateQuery = `SELECT ratepersqft FROM material WHERE materialid = $1`;
    const rateRes = await pool.query(rateQuery, [materialid]);
    const ratePerSqFt = parseFloat(rateRes.rows[0]?.ratepersqft || 0);

    // 2) Calculate totals
    const totalArea = parseFloat(length) * parseFloat(height) * parseInt(quantity, 10);
    const totalAmount = totalArea * ratePerSqFt;

    // 3) Update the child order
    const updateQuery = `
      UPDATE order_child
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
    `;
    await pool.query(updateQuery, [
      materialid,
      printingtype,
      length,
      height,
      quantity,
      totalArea,
      totalAmount,
      orderstatus,
      order_cid
    ]);

    res.status(200).json({ message: "Child order updated successfully." });
  } catch (error) {
    console.error("Error updating child order:", error);
    res.status(500).json({ error: "Failed to update child order." });
  }
});

// 4) DELETE a Child Order
router.delete("/child/:order_cid", async (req, res) => {
  const { order_cid } = req.params;

  try {
    const delQuery = `DELETE FROM order_child WHERE order_cid = $1`;
    await pool.query(delQuery, [order_cid]);
    res.status(200).json({ message: "Child order deleted successfully." });
  } catch (error) {
    console.error("Error deleting child order:", error);
    res.status(500).json({ error: "Failed to delete child order." });
  }
});

// 5) DELETE a Payment Record
router.delete("/payment/:payment_cid", async (req, res) => {
  const { payment_cid } = req.params;

  try {
    const delPaymentQuery = `DELETE FROM payment_child WHERE payment_cid = $1`;
    await pool.query(delPaymentQuery, [payment_cid]);
    res.status(200).json({ message: "Payment deleted successfully." });
  } catch (error) {
    console.error("Error deleting payment:", error);
    res.status(500).json({ error: "Failed to delete payment." });
  }
});

// 6) EDIT (Update) a Payment Amount
//    PUT /api/admin-orders/payment/:payment_cid  { amount }
router.put("/payment/:payment_cid", async (req, res) => {
  const { payment_cid } = req.params;
  const { amount } = req.body;

  try {
    const updatePaymentQuery = `
      UPDATE payment_child
      SET amount = $1
      WHERE payment_cid = $2
    `;
    await pool.query(updatePaymentQuery, [amount, payment_cid]);
    res.status(200).json({ message: "Payment updated successfully." });
  } catch (error) {
    console.error("Error updating payment:", error);
    res.status(500).json({ error: "Failed to update payment." });
  }
});

// 7) GET Materials (for the Material Selection Modal)
router.get("/materials", async (req, res) => {
  try {
    const materialsQuery = `
      SELECT materialid, materialname, ratepersqft
      FROM material
    `;
    const matRes = await pool.query(materialsQuery);
    res.status(200).json(matRes.rows);
  } catch (error) {
    console.error("Error fetching materials:", error);
    res.status(500).json({ error: "Failed to fetch materials." });
  }
});

module.exports = router;
