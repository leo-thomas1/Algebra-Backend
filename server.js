const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
require("dotenv").config();


// Import Routes
const materialsRouter = require('./routes/materials');
const ordersRouter = require('./routes/Orders');
const userManagementRoutes = require("./routes/userManagement");
const customersRoutes = require("./routes/customers"); // Correct path to customers.js
const pendingOrdersRoutes = require('./routes/pendingOrders');
const paymentsRouter = require('./routes/payments');
const billingOrderRouter = require('./routes/billingOrder');
const roleRoutes = require("./routes/roles"); // Import your roles route

const loginRoutes = require("./routes/Login"); // Match the filename and path
const printingdeskRoutes = require('./routes/printingdesk');

const adminDashboardRoutes = require("./routes/AdminDashboard");
const deleteRoutes = require('./routes/delete'); // Add Delete Master & Delete Child route
const editDesignerOrderRoutes = require("./routes/EditDesignerOrder"); // Import EditDesignerOrder.js










const app = express();
const port = 3000;

// Middleware
app.use(cors()); // Enable CORS for cross-origin requests
app.use(bodyParser.json()); // Parse JSON request bodies
app.use(bodyParser.urlencoded({ extended: true })); // Parse URL-encoded request bodies

// Routes
app.use('/api/materials', materialsRouter); // Route for material management
app.use('/api/orders', ordersRouter); // Route for orders
app.use("/api", userManagementRoutes);
app.use("/api/customers", customersRoutes); // This makes /api/customers available
app.use('/api/pendingOrders', pendingOrdersRoutes);
app.use('/api/payments', paymentsRouter);
app.use('/api/billingOrders', billingOrderRouter);
app.use("/api/roles", roleRoutes); // Register the roles route
app.use("/api/login", loginRoutes);
// app.use('/api/pending-orders', printingdeskRoutes);
app.use("/api", adminDashboardRoutes);
app.use("/api/admin-orders", require("./routes/AdminOrders"));

app.use("/api/delete", deleteRoutes); // Add Delete Master & Delete Child routes
app.use("/api/edit-designer-order", editDesignerOrderRoutes); // Use the new routes





const billingRoutes = require('./routes/billingOrder');
app.use('/api/billing', billingRoutes);

const OutstandingRoutes = require('./routes/Outstanding');
app.use('/api/outstanding', OutstandingRoutes);








const materialManagementRoutes = require("./routes/materialManagement"); // Import backend file
app.use("/api/materials", materialManagementRoutes); // Register backend route

const demoPageRoutes = require("./routes/demoPage"); // Ensure this path is correct
app.use("/api/demo", demoPageRoutes); // Register the routes under /api/demo

const AdminOrderEditRoutes = require("./routes/AdminOrdersEdit");
app.use("/api/admin-orders", AdminOrderEditRoutes);








app.get('/', (req, res) => {
  res.json({ message: "Welcome to MyOrder API" });
});


// Handle 404 for unmatched routes
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start the server
app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${port}`);
});
