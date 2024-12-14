const db = require('../models/db');

// Fetch all cabinet rows
exports.getCabinetRows = (req, res) => {
  const query = 'SELECT Distinct Name FROM fac_cabrow';
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching cabinet rows:', err);
      return res.status(500).json({ error: 'Failed to fetch cabinet rows' });
    }
    res.json(results);
  });
};
