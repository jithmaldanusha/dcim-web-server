const db = require('../models/db');

exports.getCabinetRows = async (req, res) => {
  const query = 'SELECT DISTINCT Name FROM fac_cabrow';

  try {
    const [results] = await db.query(query); // Using promise-based query
    res.json(results);
  } catch (err) {
    console.error('Error fetching cabinet rows:', err.message);
    res.status(500).json({ error: 'Failed to fetch cabinet rows' });
  }
};