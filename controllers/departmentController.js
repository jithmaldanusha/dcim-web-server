const db = require('../models/db');

// Fetch all departments
exports.getDepartments = (req, res) => {
  const query = 'SELECT Distinct Name FROM fac_department';
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching departments:', err);
      return res.status(500).json({ error: 'Failed to fetch departments' });
    }
    res.json(results);
  });
};
