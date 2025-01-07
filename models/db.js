const mysql = require('mysql2/promise'); // Use the promise-based version

// Create a connection pool (efficient for multiple queries)
const db = mysql.createPool({
  host: 'localhost',
  user: 'root',       // MySQL default username
  password: '',       // MySQL default password
  database: 'dcim',   // Database name
  waitForConnections: true,
  connectionLimit: 30, // Max connections
  queueLimit: 0,
});

(async () => {
  try {
    const connection = await db.getConnection();
    console.log('Connected to MySQL database');
    connection.release(); // Release the connection back to the pool
  } catch (err) {
    console.error('Error connecting to MySQL:', err);
  }
})();

module.exports = db;
