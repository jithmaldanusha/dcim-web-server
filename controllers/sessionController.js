const db = require('../models/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Secret for JWT (use environment variables for production)
const JWT_SECRET = process.env.JWT_SECRET;;

exports.checkUserTable = async (req, res) => {
  try {
    // Explicitly check for the table 'fac_user' in the 'dcim' database
    const [results] = await db.query(
      "SELECT COUNT(*) AS tableExists " +
      "FROM information_schema.tables " +
      "WHERE table_schema = 'dcim' AND table_name = 'fac_user'"
    );

    const exists = results[0]?.tableExists > 0; // True if the table exists
    res.json({ exists }); // Respond with { exists: true/false }
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: "Database check failed" });
  }
};

exports.createSuper = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required." });
  }

  try {
    // Step 1: Create the fac_user table if it does not exist
    const createUserTableQuery = `
      CREATE TABLE IF NOT EXISTS fac_user (
        UserID VARCHAR(255) PRIMARY KEY,
        Password VARCHAR(255) NOT NULL,
        Email VARCHAR(255),
        EmailPass VARCHAR(255),
        Role VARCHAR(50) NOT NULL,
        SessionToken VARCHAR(255)
      )
    `;
    await db.query(createUserTableQuery);

    // Step 2: Hash the password before saving to the database
    const saltRounds = 11; // Define salt rounds for hashing
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const insertUserQuery = `
      INSERT INTO fac_user (UserID, Password, Role)
      VALUES (?, ?, 'Super-Admin')
    `;
    await db.query(insertUserQuery, [username, hashedPassword]);

    // Step 3: Create the fac_request table if it does not exist
    const createRequestTableQuery = `
      CREATE TABLE IF NOT EXISTS fac_request (
        RequestID INT AUTO_INCREMENT PRIMARY KEY,
        DateTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        Status VARCHAR(50)
      )
    `;
    await db.query(createRequestTableQuery);

    res.status(201).json({ message: "Super-admin account created successfully." });
  } catch (error) {
    console.error("Error creating super-admin:", error);
    res.status(500).json({ error: "Failed to create super-admin account." });
  }
};


exports.Login = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  try {
    // Query the database using async/await
    const [results] = await db.query('SELECT * FROM fac_user WHERE BINARY UserID = ?', [username]);

    if (results.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const user = results[0];

    // Verify the password using bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.Password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    // Generate JWT
    const token = jwt.sign(
      { UserID: user.UserID, Role: user.Role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Update the session token in the database
    await db.query('UPDATE fac_user SET SessionToken = ? WHERE UserID = ?', [token, user.UserID]);

    // Send the token and user details back to the client
    res.json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        UserID: user.UserID,
        Role: user.Role,
        Email: user.Email,
      },
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'An unexpected error occurred.' });
  }
};

exports.Logout = async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
      return res.status(400).json({ error: "User ID is required for logout." });
  }

  try {
      // Invalidate the session token in the database
      const result = await db.query('UPDATE fac_user SET SessionToken = NULL WHERE UserID = ?', [userId]);

      if (result.affectedRows === 0) {
          return res.status(404).json({ error: "User not found or already logged out." });
      }

      res.json({ success: true, message: "Logout successful." });
  } catch (error) {
      console.error("Error during logout:", error);
      res.status(500).json({ error: "An unexpected error occurred during logout." });
  }
};


exports.validateToken = (req, res) => {
  res.json({ valid: true, user: req.user });
};