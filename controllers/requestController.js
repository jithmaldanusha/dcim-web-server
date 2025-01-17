const db = require('../models/db');

// Controller for checking request status by RequestID
exports.getRequestStatus = async (req, res) => {
    const { requestID } = req.params; // Extract requestID from route params
    try {
        // Query the database to check the status of the request
        const query = 'SELECT Status FROM fac_request WHERE RequestID = ?';
        const [result] = await db.query(query, [requestID]);

        if (result.length > 0) {
            // If a record exists, send the status
            res.status(200).json({ status: result[0].Status });
        } else {
            // If no record is found, send a 404 response
            res.status(404).json({ error: 'Request not found' });
        }
    } catch (error) {
        console.error('Error checking request status:', error.message);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.updateRequestStatus = async (req, res) => {
    const { reqID } = req.params; // Get reqID from the route parameter
    const { status } = req.body; // Get the new status from the request body

    try {
        // Update query to set the status of the request in the database
        const query = 'UPDATE fac_request SET status = ? WHERE requestID = ?';
        const [result] = await db.execute(query, [status, reqID]);

        if (result.affectedRows > 0) {
            res.json({ success: true, message: 'Status updated successfully' });
        } else {
            res.status(404).json({ success: false, error: 'Request not found' });
        }
    } catch (error) {
        console.error('Error updating request status:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
};