const db = require('../models/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Secret for JWT (use environment variables for production)
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

exports.Login = async (req, res) => {
    const { username, password } = req.body;

    console.log('Incoming request:', username, password);

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
    }

    try {
        // Query the database for the user
        const query = 'SELECT * FROM fac_user WHERE UserID = ?';
        db.query(query, [username], async (err, results) => {
            if (err) {
                console.error('Database error during login:', err);
                return res.status(500).json({ error: 'Database query failed.' });
            }

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
                { expiresIn: '1h' } // Token expires in 1 hour
            );

            // Update the session token in the database
            const updateQuery = 'UPDATE fac_user SET SessionToken = ? WHERE UserID = ?';
            db.query(updateQuery, [token, user.UserID], (err) => {
                if (err) {
                    console.error('Error updating session token:', err);
                    return res.status(500).json({ error: 'Failed to update session token.' });
                }

                // Send the token back to the client
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
            });
        });
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ error: 'An unexpected error occurred.' });
    }
};
