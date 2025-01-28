const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const loginRouter = require('./routes/Login');
const materialsRouter = require('./routes/materials');
const ordersRouter = require('./routes/Orders');

const app = express();
const port = 5000; // Changed to port 5000

// Middleware
app.use(cors());
app.use(bodyParser.json()); // Fixed the missing closing parentheses here
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use('/login', loginRouter);
app.use('/materials', materialsRouter);
app.use('/orders', ordersRouter);

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
