const db = require('../models/db');

// Fetch all zones
exports.getZones = (req, res) => {
  const query = 'SELECT Distinct Description FROM fac_zone';
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching zones:', err);
      return res.status(500).json({ error: 'Failed to fetch zones' });
    }
    res.json(results);
  });
};
