const mysql = require('mysql2');

// Connect to the MySQL database
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',  // MySQL default username
  password: '',  // MySQL default password
  database: 'dcim',  // Database name
});

db.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    throw err;
  }
  console.log('Connected to MySQL database');
});

module.exports = db;
