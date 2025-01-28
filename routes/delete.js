const express = require("express");
const router = express.Router();
const pool = require("../db/pool");
const authenticateUser = require("../middleware/auth");

// Delete Master and all associated Child Orders
router.delete("/master/:id", authenticateUser, async (req, res) => {
    const { id } = req.params;
  
    try {
      // Check if the master order exists
      const orderExists = await pool.query(
        "SELECT * FROM Order_Master WHERE OrderID = $1",
        [id]
      );
  
      if (orderExists.rowCount === 0) {
        return res.status(404).json({ error: "Master Order not found." });
      }
  
      // Delete child orders
      await pool.query("DELETE FROM Order_Child WHERE OrderID = $1", [id]);
      // Delete master order
      const result = await pool.query(
        "DELETE FROM Order_Master WHERE OrderID = $1 RETURNING *",
        [id]
      );
  
      res.status(200).json({
        success: true,
        message: "Master Order and all associated Child Orders deleted.",
        deletedOrder: result.rows[0],
      });
    } catch (error) {
      console.error("Error deleting master order:", error);
      res.status(500).json({ error: "Failed to delete master order." });
    }
  });
  

// Delete Child Order
router.delete("/child/:id", authenticateUser, async (req, res) => {
    const { id } = req.params;
  
    if (!id || isNaN(id)) {
      return res.status(400).json({ error: "Invalid Child Order ID." });
    }
  
    try {
      const result = await pool.query(
        "DELETE FROM Order_Child WHERE Order_CID = $1 RETURNING *",
        [id]
      );
  
      if (result.rowCount === 0) {
        return res.status(404).json({ error: "Child Order not found." });
      }
  
      res.status(200).json({
        success: true,
        message: "Child Order deleted successfully.",
        deletedChildOrder: result.rows[0],
      });
    } catch (error) {
      console.error("Error deleting child order:", error);
      res.status(500).json({ error: "Failed to delete child order." });
    }
  });
  

module.exports = router;
