// server/index.js
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
app.use(cors()); // Allow cross-origin requests
app.use(express.json()); // To parse JSON bodies

// Connect to the MySQL database (XAMPP)
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',       // Default username for MySQL in XAMPP
  password: '',       // Default password for MySQL in XAMPP
  database: 'dcim',   // Database name
});

db.connect((err) => {
  if (err) throw err;
  console.log('Connected to MySQL database');
});

// Start the server
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
