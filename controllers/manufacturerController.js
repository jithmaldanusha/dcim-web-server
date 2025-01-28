const db = require('../models/db');

// Fetch all data centers
exports.getDataManufacturers = async (req, res) => {
  const query = 'SELECT Distinct Name FROM fac_manufacturer';

  try {
    const [results] = await db.query(query);
    res.json(results);
  } catch (err) {
    console.error('Error fetching manufacturers:', err.message);
    res.status(500).json({ error: 'Failed to fetch manufacturers' });
  }
};
