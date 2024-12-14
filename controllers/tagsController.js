const db = require('../models/db');

// Fetch all tags
exports.getTags = (req, res) => {
  const query = 'SELECT Name FROM fac_tags';
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching tags:', err);
      return res.status(500).json({ error: 'Failed to fetch tags' });
    }
    res.json(results);
  });
};
