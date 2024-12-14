const db = require('../models/db');

// Fetch all data centers
exports.getDataCenters = (req, res) => {
  const query = 'SELECT Name from fac_datacenter';
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching data centers:', err);
      return res.status(500).json({ error: 'Failed to fetch data centers' });
    }
    res.json(results);
  });
};
