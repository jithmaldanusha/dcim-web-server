const db = require('../models/db');

// Fetch all zones
exports.getZones = async (req, res) => {
  const query = 'SELECT DISTINCT Description FROM fac_Zone';

  try {
    const [results] = await db.query(query);
    res.json(results);
  } catch (err) {
    console.error('Error fetching zones:', err.message);
    res.status(500).json({ error: 'Failed to fetch zones' });
  }
};
