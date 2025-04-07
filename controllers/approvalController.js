exports.approveImport = async (req, res) => {
    const token = req.query.token;
    
    // Find the corresponding import request using the token
    const importRequest = await db.query('SELECT * FROM bulk_imports WHERE token = ?', [token]);

    if (!importRequest) {
        return res.status(404).send('Import request not found.');
    }

    // If approved, insert the data into the database
    try {
        for (const device of importRequest.data) {
            await db.query('INSERT INTO fac_Device SET ?', device);
        }

        // Send a confirmation email to the user who made the request
        await sendConfirmationEmail(importRequest.userEmail, 'approved');

        res.status(200).send('Import approved and devices added to the database.');
    } catch (error) {
        console.error('Error approving import:', error);
        res.status(500).send('Error approving import.');
    }
};

exports.rejectImport = async (req, res) => {
    const token = req.query.token;

    // Find the corresponding import request using the token
    const importRequest = await db.query('SELECT * FROM bulk_imports WHERE token = ?', [token]);

    if (!importRequest) {
        return res.status(404).send('Import request not found.');
    }

    // Send a rejection email to the user
    try {
        await sendConfirmationEmail(importRequest.userEmail, 'rejected');
        res.status(200).send('Import rejected successfully.');
    } catch (error) {
        console.error('Error rejecting import:', error);
        res.status(500).send('Error rejecting import.');
    }
};

// Helper function to send confirmation email to the user
const sendConfirmationEmail = async (userEmail, status) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD,
        },
    });

    const emailContent = `
        <p>Your bulk import request has been ${status} by the admin.</p>
    `;

    await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: userEmail,
        subject: `Bulk Import ${status}`,
        html: emailContent,
    });
};
