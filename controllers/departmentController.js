const db = require('../models/db');

// Fetch all departments
exports.getDepartments = async (req, res) => {
  const query = 'SELECT DISTINCT Name FROM fac_Department';

  try {
    const [results] = await db.query(query); // Using promise-based query
    res.json(results);
  } catch (err) {
    console.error('Error fetching departments:', err.message);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
};

