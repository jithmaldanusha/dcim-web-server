const db = require('../models/db');
const nodemailer = require('nodemailer');

// Fetch models by manufacturer
exports.getModelsByManufacturer = async (req, res) => {
    const manufacturerName = req.params.manufacturer;

    if (!manufacturerName) {
        return res.status(400).json({ error: 'Manufacturer parameter is required' });
    }

    try {
        const manufacturerQuery = `SELECT ManufacturerID FROM fac_manufacturer WHERE Name = ?`;
        const [manufacturerResult] = await db.execute(manufacturerQuery, [manufacturerName]);

        if (manufacturerResult.length === 0) {
            return res.status(404).json({ error: 'Manufacturer not found' });
        }

        const manufacturerID = manufacturerResult[0].ManufacturerID;

        const modelQuery = `SELECT Model FROM fac_devicetemplate WHERE ManufacturerID = ?`;
        const [modelResults] = await db.execute(modelQuery, [manufacturerID]);

        if (modelResults.length === 0) {
            return res.status(404).json({ error: 'No models found for this manufacturer' });
        }

        const modelNames = modelResults.map(model => model.Model);
        res.json(modelNames);
    } catch (err) {
        console.error('Error fetching models:', err.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

exports.bulkImportDevices = async (req, res) => {
    const connection = await db.getConnection();
    const importedDevices = req.body.data;

    try {
        for (const device of importedDevices) {
            // 1. Get Owner (DeptID) from fac_department
            const [deptResult] = await connection.query(
                `SELECT DeptID FROM fac_department WHERE Name = ?`,
                [device.owner]
            );
            if (deptResult.length === 0) throw new Error(`Owner not found: ${device.owner}`);
            const ownerDeptID = deptResult[0].DeptID;

            // 2. Get PrimaryContact (PersonID) from fac_people
            const [personResult] = await connection.query(
                `SELECT PersonID FROM fac_people WHERE UserID = ?`,
                [device.primaryContact]
            );
            if (personResult.length === 0) throw new Error(`Primary contact not found: ${device.primaryContact}`);
            const primaryContactID = personResult[0].PersonID;

            // 3. Get CabinetID (DataCenter + Cabinet) from fac_cabinet
            const [dataCenterResult] = await connection.query(
                `SELECT DataCenterID FROM fac_datacenter WHERE Name = ?`,
                [device.dataCenter]
            );
            if (dataCenterResult.length === 0) throw new Error(`Data center not found: ${device.dataCenter}`);
            const dataCenterID = dataCenterResult[0].DataCenterID;

            const [cabinetResult] = await connection.query(
                `SELECT CabinetID FROM fac_cabinet WHERE Location = ? AND DataCenterID = ?`,
                [device.cabinet, dataCenterID]
            );
            if (cabinetResult.length === 0) throw new Error(`Cabinet not found: ${device.cabinet} in data center: ${device.dataCenter}`);
            const cabinetID = cabinetResult[0].CabinetID;

            // 4. Get TemplateID (Manufacturer + Model) from fac_devicetemplate
            const [manufacturerResult] = await connection.query(
                `SELECT ManufacturerID FROM fac_manufacturer WHERE Name = ?`,
                [device.manufacturer]
            );
            if (manufacturerResult.length === 0) throw new Error(`Manufacturer not found: ${device.manufacturer}`);
            const manufacturerID = manufacturerResult[0].ManufacturerID;

            const [templateResult] = await connection.query(
                `SELECT TemplateID, Height, Weight, Wattage, DeviceType, PSCount, NumPorts, ChassisSlots, RearChassisSlots, SNMPVersion 
                 FROM fac_devicetemplate 
                 WHERE Model = ? AND ManufacturerID = ?`,
                [device.model, manufacturerID]
            );
            if (templateResult.length === 0) throw new Error(`Template not found for model: ${device.model} and manufacturer: ${device.manufacturer}`);
            const template = templateResult[0];

            // 5. Convert Excel serial date to YYYY-MM-DD format
            const excelDateToJSDate = (serial) => {
                const excelEpoch = new Date(1899, 11, 30); // Excel's epoch date (December 30, 1899)
                const daysSinceEpoch = parseInt(serial, 10); // Convert serial to number of days
                const jsDate = new Date(excelEpoch.getTime() + daysSinceEpoch * 86400000); // 86400000 ms per day
                return jsDate.toISOString().split('T')[0]; // Return in 'yyyy-mm-dd' format
            };

            const formattedInstallDate = excelDateToJSDate(device.installDate);

            // 6. Insert the device into fac_device
            const sqlQuery = `
                INSERT INTO fac_device (
                    Label, SerialNo, AssetTag, PrimaryIP, SNMPVersion, v3SecurityLevel, v3AuthProtocol, v3PrivProtocol,
                    Hypervisor, Owner, PrimaryContact, Cabinet, Position, TemplateID, Height, Weight, 
                    NominalWatts, PowerSupplyCount, Ports, ChassisSlots, RearChassisSlots, InstallDate, Status,
                    HalfDepth, BackSide
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            `;
            const values = [
                device.label, device.serialNo, device.assetTag, device.hostname,
                template.SNMPVersion, 'noAuthNoPriv', 'MD5', 'DES',
                device.hypervisor || "None", ownerDeptID, primaryContactID, cabinetID, device.position,
                template.TemplateID, template.Height, template.Weight,
                template.Wattage, template.PSCount, template.NumPorts, template.ChassisSlots, template.RearChassisSlots,
                formattedInstallDate, device.reservation || '', device.halfDepth || 0, device.backSide || 0
            ];

            // Execute the insert query
            await connection.query(sqlQuery, values);
        }

        // Release connection and respond success
        connection.release();
        res.status(200).send({ message: 'Bulk import successful' });
    } catch (error) {
        console.error('Error during bulk import:', error.message);
        res.status(500).send({ error: error.message });
    }
};

// Function to send approval email
exports.sendApprovalEmail = async (req, res) => {
    const devices = req.body.data;
    const approvalLink = 'https://yourapp.com/approve-request'; // Replace with your actual approval route
    const rejectionLink = 'https://yourapp.com/reject-request'; // Replace with your actual rejection route

    try {
        // Configure the transporter for sending emails using nodemailer
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'jithmaldanusha@gmail.com',
                pass: 'mgvv leus gcsa hvib'
            }
        });

        // Construct email content with approval and rejection buttons
        const mailOptions = {
            from: 'jithmaldanusha@gmail.com',
            to: 'danushajithmal@gmail.com',
            subject: 'Bulk Device Approval Request',
            html: `
                <p>Dear Admin,</p>
                <p>A request for bulk device approval has been submitted with the following details:</p>
                <table border="1" cellpadding="5" cellspacing="0">
                    <thead>
                        <tr>
                            <th>Data Center</th>
                            <th>Cabinet</th>
                            <th>Manufacturer</th>
                            <th>Model</th>
                            <th>Serial No</th>
                            <th>Hostname</th>
                            <th>Label</th>
                            <th>Asset Tag</th>
                            <th>Position</th>
                            <th>Hypervisor</th>
                            <th>Install Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${devices.map(device => `
                            <tr>
                                <td>${device.dataCenter}</td>
                                <td>${device.cabinet}</td>
                                <td>${device.manufacturer}</td>
                                <td>${device.model}</td>
                                <td>${device.serialNo}</td>
                                <td>${device.hostname}</td>
                                <td>${device.label}</td>
                                <td>${device.assetTag}</td>
                                <td>${device.position}</td>
                                <td>${device.hypervisor}</td>
                                <td>${device.installDate}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <p>Please click one of the buttons below to approve or reject the request:</p>
                <a href="${approvalLink}" style="padding: 10px 20px; background-color: green; color: white; text-decoration: none; border-radius: 5px;">Approve</a>
                <a href="${rejectionLink}" style="padding: 10px 20px; background-color: red; color: white; text-decoration: none; border-radius: 5px; margin-left: 10px;">Reject</a>
                <p>Best regards,<br>DCIM</p>
            `
        };

        // Send the email
        await transporter.sendMail(mailOptions);

        res.status(200).json({ message: 'Approval email sent successfully' });
    } catch (error) {
        console.error('Error sending approval email:', error.message);
        res.status(500).json({ error: 'Failed to send approval email' });
    }
};
