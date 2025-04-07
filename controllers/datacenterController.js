const db = require('../models/db');

// Fetch all data centers
exports.getDataCenters = async (req, res) => {
  const query = 'SELECT Name FROM fac_DataCenter';

  try {
    const [results] = await db.query(query); // Using promise-based query
    res.json(results);
  } catch (err) {
    console.error('Error fetching data centers:', err.message);
    res.status(500).json({ error: 'Failed to fetch data centers' });
  }
};
