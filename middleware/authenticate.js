const jwt = require('jsonwebtoken');
const db = require('../models/db'); // Assuming you have a DB connection set up
const JWT_SECRET = process.env.JWT_SECRET;

const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]; // Extract token from header
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET); // Verify token
    req.user = decoded; // Attach user details to the request object
    next(); // Proceed to the next middleware or controller
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      // Token has expired
      try {
        // Remove the expired token from the database
        await db.query('UPDATE fac_user SET SessionToken = NULL WHERE SessionToken = ?', [token]);
      } catch (dbError) {
        console.error('Error removing expired token from the database:', dbError);
      }
      return res.status(401).json({ error: 'Token expired. Please log in again.' });
    }

    return res.status(401).json({ error: 'Invalid token.' });
  }
};

module.exports = authenticate;
