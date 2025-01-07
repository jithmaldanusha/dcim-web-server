const db = require('../models/db');

// Fetch all departments
exports.getPrimaryContacts = async (req, res) => {
  const query = 'SELECT UserID FROM fac_people';

  try {
    const [results] = await db.query(query); 
    res.json(results);
  } catch (err) {
    console.error('Error fetching contacts:', err.message);
    
    res.status(500).json({ error: 'Failed to fetch primary contacts' });
  }
};

