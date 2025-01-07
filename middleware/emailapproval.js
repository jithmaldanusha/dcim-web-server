
const nodemailer = require('nodemailer');

exports.requestAdminApproval = async (req, res) => {
    const { data } = req.body;

    // Define admin email address
    const adminEmail = "admin@example.com"; 

    // Create email content with approval and rejection links
    const emailContent = `
        <p>A bulk import request has been made. Please approve or reject the import by clicking one of the buttons below:</p>
        <p>
            <a href="${process.env.APP_URL}/api/devices/approveImport?token=${approvalToken}" style="color:green;">Approve</a> |
            <a href="${process.env.APP_URL}/api/devices/rejectImport?token=${rejectionToken}" style="color:red;">Reject</a>
        </p>
    `;

    // Create a Nodemailer transporter to send the email
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER, // your email
            pass: process.env.EMAIL_PASSWORD, // your email password
        },
    });

    // Send email to the admin
    try {
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: adminEmail,
            subject: 'Bulk Import Approval Request',
            html: emailContent,
        });

        res.status(200).send({ message: 'Approval email sent successfully.' });
    } catch (error) {
        console.error('Error sending approval email:', error);
        res.status(500).send({ error: 'Failed to send approval email.' });
    }
};
