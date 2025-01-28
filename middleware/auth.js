require("dotenv").config(); // Load environment variables
const jwt = require("jsonwebtoken");

const SECRET_KEY = process.env.SECRET_KEY;

const authenticateUser = (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  console.log("Token received:", token); // Log the token for debugging

  if (!token) {
    console.error("No token provided");
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  try {
    // Verify and decode the token
    const decoded = jwt.verify(token, SECRET_KEY);
    console.log("Decoded token in authenticateUser:", decoded); // Log the decoded token

    // Validate required fields in the decoded token
    if (!decoded.userId || !decoded.role) {
      console.error("Decoded token is missing required fields");
      return res.status(401).json({ error: "Invalid token. Missing required fields." });
    }

    req.user = decoded; // Attach the decoded token to the request object
    next();
  } catch (err) {
    console.error("Authentication error:", err.message);
    return res.status(401).json({ error: "Invalid token." });
  }
};

module.exports = authenticateUser;
