const db = require('../models/db');

// Fetch all tags
exports.getTags = async (req, res) => {
  const query = 'SELECT Name FROM fac_tags';

  try {
    const [results] = await db.query(query); // Using promise-based query
    res.json(results);
  } catch (err) {
    console.error('Error fetching tags:', err.message);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
};
