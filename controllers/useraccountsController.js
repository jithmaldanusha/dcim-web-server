const db = require('../models/db');
const bcrypt = require('bcrypt');

exports.getUser = async (req, res) => {
    const userId = req.query.userId;  // Use req.query instead of req.params

    if (!userId) {
        return res.status(400).json({ error: "User ID is required." });
    }

    try {
        const [result] = await db.query(
            "SELECT Email, Role, EmailPass FROM fac_user WHERE UserID = ?",
            [userId]
        );

        if (result.length === 0) {
            return res.status(404).json({ error: "User not found." });
        }

        const user = result[0];
        const emailStatus = user.Email ? user.Email : null;
        const emailPassStatus = user.EmailPass ? true : null; // If EmailPass is not null, set it to true

        res.json({
            message: "User fetched successfully.",
            data: {
                UserID: userId,
                Email: emailStatus,
                Role: user.Role,
                EmailPass: emailPassStatus, // Send true if EmailPass exists
            }
        });
    } catch (err) {
        console.error("Error fetching user:", err);
        res.status(500).json({ error: "An unexpected error occurred." });
    }
};


exports.updateUsername = async (req, res) => {
    const { newUserId, userId } = req.body;

    if (!newUserId) {
        return res.status(400).json({ error: "New username is required." });
    }

    try {
        const result = await db.query("UPDATE fac_user SET UserID = ? WHERE UserID = ?", [
            newUserId,
            userId, // Assume the user is authenticated
        ]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "User not found." });
        }
        res.json({ message: "Username updated successfully." });
    } catch (error) {
        console.error("Error updating username:", error);
        res.status(500).json({ error: "An unexpected error occurred." });
    }
};

exports.updateEmail = async (req, res) => {
    const { newUserEmail, userId } = req.body;

    if (!newUserEmail) {
        return res.status(400).json({ error: "New email is required." });
    }

    try {
        const result = await db.query("UPDATE fac_user SET Email = ? WHERE UserID = ?", [
            newUserEmail,
            userId,
        ]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "User not found." });
        }
        res.json({ message: "Email updated successfully." });
    } catch (error) {
        console.error("Error updating email:", error);
        res.status(500).json({ error: "An unexpected error occurred." });
    }
};

exports.updateEmailPass = async (req, res) => {
    const { newUserEmailPass, userId } = req.body;

    if (!newUserEmailPass || !userId) {
        return res.status(400).json({ error: "User ID and new password are required." });
    }

    try {
        const result = await db.query(
            "UPDATE fac_user SET EmailPass = ? WHERE UserID = ?",
            [newUserEmailPass, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "User not found." });
        }

        res.json({ message: "Email password updated successfully." });
    } catch (err) {
        console.error("Error updating email password:", err);
        res.status(500).json({ error: "An unexpected error occurred." });
    }
};

exports.updatePassword = async (req, res) => {
    const { currentPassword, newPassword, userId } = req.body;
    console.log(currentPassword, newPassword, userId)
    if (!currentPassword || !newPassword || !userId) {
        return res.status(400).json({ error: "Current password and new password are required." });
    }

    try {
        const [results] = await db.query("SELECT Password FROM fac_user WHERE UserID = ?", [userId]);

        if (results.length === 0) {
            return res.status(404).json({ error: "User not found." });
        }

        const user = results[0];
        // Check if the current password matches
        const isPasswordValid = await bcrypt.compare(currentPassword, user.Password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: "Invalid current password." });
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update the password in the database
        await db.query("UPDATE fac_user SET Password = ? WHERE UserID = ?", [
            hashedPassword,
            userId,
        ]);

        res.json({ message: "Password updated successfully." });
    } catch (error) {
        console.error("Error updating password:", error);
        res.status(500).json({ error: "An unexpected error occurred." });
    }
};

exports.updateRole = async (req, res) => {
    const { newRole, userId } = req.body;

    if (!newRole) {
        return res.status(400).json({ error: "New role is required." });
    }

    try {
        const result = await db.query("UPDATE fac_user SET Role = ? WHERE UserID = ?", [
            newRole,
            userId,
        ]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "User not found." });
        }

        res.json({ message: "Role updated successfully." });
    } catch (error) {
        console.error("Error updating role:", error);
        res.status(500).json({ error: "An unexpected error occurred." });
    }
};


exports.getUsers = async (req, res) => {
    try {
        // Fetch all UserIDs and Emails from fac_cabinet table
        const [result] = await db.query(
            "SELECT UserID, Email, Role FROM fac_user"
        );

        if (result.length === 0) {
            return res.status(404).json({ error: "No users found." });
        }
        res.json({
            message: "Users fetched successfully.",
            data: result, // Return the fetched UserID and Email
        });
    } catch (err) {
        console.error("Error fetching user data:", err);
        res.status(500).json({ error: "An unexpected error occurred." });
    }
};

exports.addUser = async (req, res) => {
    const { UserID, Password, Role } = req.body;

    if (!UserID || !Password || !Role) {
        return res.status(400).json({ error: "UserID, Password, and Role are required." });
    }

    try {
        // Hash the password
        const hashedPassword = await bcrypt.hash(Password, 10);

        // Check if the user already exists
        const [existingUser] = await db.query(
            "SELECT UserID FROM fac_user WHERE UserID = ?",
            [UserID]
        );

        if (existingUser.length > 0) {
            return res.status(400).json({ error: "User already exists." });
        }

        // Insert the new user into the database
        await db.query(
            "INSERT INTO fac_user (UserID, Password, Role) VALUES (?, ?, ?)",
            [UserID, hashedPassword, Role]
        );

        res.status(201).json({ message: "User added successfully." });
    } catch (err) {
        console.error("Error adding new user:", err);
        res.status(500).json({ error: "An unexpected error occurred." });
    }
};

exports.removeUser = async (req, res) => {
    const { userId } = req.body; // Get the userId from the request body

    if (!userId) {
        return res.status(400).json({ error: "UserID is required." });
    }

    try {
        // Check if the user exists in the database
        const [existingUser] = await db.query("SELECT UserID FROM fac_user WHERE UserID = ?", [userId]);

        if (existingUser.length === 0) {
            return res.status(404).json({ error: "User not found." });
        }

        // Delete the user from the database
        await db.query("DELETE FROM fac_user WHERE UserID = ?", [userId]);

        res.status(200).json({ message: "User removed successfully." });
    } catch (err) {
        console.error("Error removing user:", err);
        res.status(500).json({ error: "An unexpected error occurred." });
    }
};
