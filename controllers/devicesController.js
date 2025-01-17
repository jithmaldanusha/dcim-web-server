const db = require('../models/db');
const nodemailer = require('nodemailer');

// Fetch all data centers
exports.getDeviceStatus = async (req, res) => {
    const query = 'SELECT Status FROM fac_devicestatus';

    try {
        const [results] = await db.query(query);
        res.json(results);
    } catch (err) {
        console.error('Error fetching manufacturers:', err.message);
        res.status(500).json({ error: 'Failed to fetch manufacturers' });
    }
};

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

exports.getDevicesByCabinet = async (req, res) => {
    const { cabinetID } = req.params;
    const connection = await db.getConnection();

    try {
        const query = `SELECT DeviceID, Label FROM fac_device WHERE Cabinet = ?`;

        const [rows] = await connection.query(query, [cabinetID]);

        // Format the result as ['DeviceID - Label']
        const devices = rows.map(row => `${row.DeviceID} - ${row.Label}`);

        res.status(200).json(devices);
    } catch (error) {
        console.error('Error fetching devices by cabinet:', error.message);
        res.status(500).send({ error: error.message });
    } finally {
        connection.release();
    }
};

exports.getDeviceById = async (req, res) => {
    const { deviceID } = req.params;
    const connection = await db.getConnection();

    try {
        const query = `
            SELECT 
                d.Label, d.Position, d.Height, d.PrimaryIP, d.SerialNo, d.AssetTag, 
                d.HalfDepth, d.BackSide, d.Hypervisor, d.InstallDate, d.Status,
                dept.Name AS owner, 
                CONCAT(p.UserID, ' ', p.LastName) AS primaryContact,
                dt.Model AS model, 
                mf.Name AS manufacturer
            FROM fac_device d
            LEFT JOIN fac_department dept ON d.Owner = dept.DeptID
            LEFT JOIN fac_people p ON d.PrimaryContact = p.PersonID
            LEFT JOIN fac_devicetemplate dt ON d.TemplateID = dt.TemplateID
            LEFT JOIN fac_manufacturer mf ON dt.ManufacturerID = mf.ManufacturerID
            WHERE d.DeviceID = ?
        `;

        const [rows] = await connection.query(query, [deviceID]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Device not found' });
        }

        const deviceData = rows[0];

        res.status(200).json({
            label: deviceData.Label,
            position: deviceData.Position,
            height: deviceData.Height,
            primaryIP: deviceData.PrimaryIP,
            serialNo: deviceData.SerialNo,
            assetTag: deviceData.AssetTag,
            halfDepth: deviceData.HalfDepth,
            backside: deviceData.BackSide,
            hypervisor: deviceData.Hypervisor,
            installDate: deviceData.InstallDate,
            status: deviceData.Status,
            owner: deviceData.owner,
            primaryContact: deviceData.primaryContact,
            model: deviceData.model,
            manufacturer: deviceData.manufacturer
        });
    } catch (error) {
        console.error('Error fetching device by ID:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        connection.release();
    }
};

exports.updateDevice = async (req, res) => {
    const { deviceID } = req.params;
    const { label, position, height, primaryIP, serialNo, assetTag, halfDepth, backside, hypervisor, installDate, status, owner, primaryContact, model, manufacturer } = req.body;
    const connection = await db.getConnection();

    try {
        let ownerDeptID = null;
        let primaryContactPersonID = null;
        let templateID = null;

        // Check and fetch the ownerDeptID if owner is not null
        if (owner) {
            const [ownerResult] = await connection.query(`SELECT DeptID FROM fac_department WHERE Name = ?`, [owner]);
            if (ownerResult.length === 0) {
                return res.status(404).json({ error: 'Owner department not found' });
            }
            ownerDeptID = ownerResult[0].DeptID;
        }

        // Check and fetch the primaryContactPersonID if primaryContact is not null
        if (primaryContact) {
            const [contactResult] = await connection.query(`SELECT PersonID FROM fac_people WHERE CONCAT(UserID, ' ', LastName) = ?`, [primaryContact]);
            if (contactResult.length === 0) {
                return res.status(404).json({ error: 'Primary contact not found' });
            }
            primaryContactPersonID = contactResult[0].PersonID;
        }

        // Check and fetch the templateID if both model and manufacturer are not null
        if (model && manufacturer) {
            const [templateResult] = await connection.query(
                `SELECT dt.TemplateID 
                FROM fac_devicetemplate dt
                INNER JOIN fac_manufacturer m ON dt.ManufacturerID = m.ManufacturerID
                WHERE dt.Model = ? AND m.Name = ?`,
                [model, manufacturer]
            );
            if (templateResult.length === 0) {
                return res.status(404).json({ error: 'Device model or manufacturer not found' });
            }
            templateID = templateResult[0].TemplateID;
        }

        // Perform the update on the fac_device table
        const updateQuery = `
            UPDATE fac_device
            SET 
                Label = ?, Position = ?, Height = ?, PrimaryIP = ?, SerialNo = ?, AssetTag = ?, 
                HalfDepth = ?, BackSide = ?, Hypervisor = ?, InstallDate = ?, Status = ?, 
                Owner = ?, PrimaryContact = ?, TemplateID = ?
            WHERE DeviceID = ?
        `;

        const updateValues = [
            label || null, position || null, height || null, primaryIP || null, serialNo || null, assetTag || null, halfDepth || null, backside || null, hypervisor || null,
            installDate || null, status || null, ownerDeptID || null, primaryContactPersonID || null, templateID || null, deviceID
        ];

        await connection.query(updateQuery, updateValues);

        res.status(200).json({ message: 'Device updated successfully' });

    } catch (error) {
        console.error('Error updating device:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        connection.release();
    }
};


exports.addDevice = async (req, res) => {
    const connection = await db.getConnection();
    const device = req.body;  // Assuming the device data is directly passed in the request body

    try {
        // 1. Get Owner (DeptID) from fac_department
        const [deptResult] = await connection.query(
            'SELECT DeptID FROM fac_department WHERE Name = ?',
            [device.owner]
        );
        if (deptResult.length === 0) throw new Error(`Owner not found: ${device.owner}`);
        const ownerDeptID = deptResult[0].DeptID;

        // 2. Split primaryContact to extract UserID and LastName
        const [userID] = device.primaryContact.split(',').map(part => part.trim());

        // Get PrimaryContact (PersonID) from fac_people
        const [personResult] = await connection.query(
            'SELECT PersonID FROM fac_people WHERE UserID = ?',
            [userID]
        );
        if (personResult.length === 0) throw new Error(`Primary contact not found: ${userID}`);
        const primaryContactID = personResult[0].PersonID;

        // 3. Get CabinetID (DataCenter + Cabinet) from fac_cabinet
        const [dataCenterResult] = await connection.query(
            'SELECT DataCenterID FROM fac_datacenter WHERE Name = ?',
            [device.dataCenter]
        );
        if (dataCenterResult.length === 0) throw new Error(`Data center not found: ${device.dataCenter}`);
        const dataCenterID = dataCenterResult[0].DataCenterID;

        const [cabinetResult] = await connection.query(
            'SELECT CabinetID FROM fac_cabinet WHERE Location = ? AND DataCenterID = ?',
            [device.location, dataCenterID]
        );
        if (cabinetResult.length === 0) throw new Error(`Cabinet not found: ${device.location} in data center: ${device.dataCenter}`);
        const cabinetID = cabinetResult[0].CabinetID;

        let manufacturerID = null;
        let templateResult = null;

        // 4. Get TemplateID (Manufacturer + Model) from fac_devicetemplate only if manufacturer and model are provided
        if (device.manufacturer && device.model) {
            const [manufacturerResult] = await connection.query(
                'SELECT ManufacturerID FROM fac_manufacturer WHERE Name = ?',
                [device.manufacturer]
            );
            if (manufacturerResult.length === 0) throw new Error(`Manufacturer not found: ${device.manufacturer}`);
            manufacturerID = manufacturerResult[0].ManufacturerID;

            templateResult = await connection.query(
                'SELECT TemplateID, Height, Weight, Wattage, DeviceType, PSCount, NumPorts, ChassisSlots, RearChassisSlots, SNMPVersion ' +
                'FROM fac_devicetemplate WHERE Model = ? AND ManufacturerID = ?',
                [device.model, manufacturerID]
            );
            if (templateResult.length === 0) throw new Error(`Template not found for model: ${device.model} and manufacturer: ${device.manufacturer}`);
        } else {
            // If no manufacturer/model, set template result as an empty object with default values
            templateResult = [{ SNMPVersion: 'noAuthNoPriv', Height: 0, Weight: 0, Wattage: 0, PSCount: 1, NumPorts: 0, ChassisSlots: 0, RearChassisSlots: 0 }];
        }

        const template = templateResult[0];

        // 6. Insert the device into fac_device
        const sqlQuery =
            'INSERT INTO fac_device (' +
            'Label, SerialNo, AssetTag, PrimaryIP, SNMPVersion, v3SecurityLevel, v3AuthProtocol, v3PrivProtocol, ' +
            'Hypervisor, Owner, PrimaryContact, Cabinet, Position, TemplateID, Height, Weight, ' +
            'NominalWatts, PowerSupplyCount, Ports, ChassisSlots, RearChassisSlots, InstallDate, Status, ' +
            'HalfDepth, BackSide' +
            ') VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
        ;

        const values = [
            device.label, device.serialNo, device.assetTag, device.hostname || "",
            template.SNMPVersion || '', 'noAuthNoPriv', 'MD5', 'DES',
            device.hypervisor || "None", ownerDeptID, primaryContactID, cabinetID, device.position || "",
            template.TemplateID || '', template.Height || '', template.Weight || '',
            template.Wattage || '', template.PSCount || '', template.NumPorts || '', template.ChassisSlots || '', template.RearChassisSlots || '',
            device.installDate, device.reservation || '', device.halfDepth || 0, device.backside || 0
        ];

        // Execute the insert query
        await connection.query(sqlQuery, values);

        // Release connection and respond success
        connection.release();
        res.status(200).send({ message: 'Device inserted successfully' });
    } catch (error) {
        console.error('Error during device insertion:', error.message);
        res.status(500).send({ error: error.message });
    }
};

exports.deleteDevice = async (req, res) => {
    const deviceID = req.params.deviceID;

    try {
        const query = 'DELETE FROM fac_device WHERE DeviceID = ?';
        const [results] = await db.execute(query, [deviceID]);

        if (results.affectedRows === 0) {
            return res.status(404).json({ error: 'Device not found' });
        }

        res.json({ success: true, message: 'Device deleted successfully' });
    } catch (err) {
        console.error('Error deleting Device:', err.message);
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

            // 2. Split primaryContact to extract UserID and LastName
            const [userID] = device.primaryContact.split(',').map(part => part.trim());

            // Get PrimaryContact (PersonID) from fac_people
            const [personResult] = await connection.query(
                `SELECT PersonID FROM fac_people WHERE UserID = ?`,
                [userID]
            );
            if (personResult.length === 0) throw new Error(`Primary contact not found: ${userID}`);
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
                const excelEpoch = new Date(1899, 11, 30);
                const daysSinceEpoch = parseInt(serial, 10);
                const jsDate = new Date(excelEpoch.getTime() + daysSinceEpoch * 86400000);
                return jsDate.toISOString().split('T')[0];
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

exports.sendBulkDeviceApprovalEmail = async (req, res) => {
    const deviceData = req.body.data; // deviceData is an array of device objects
    console.log(deviceData);

    try {
        // Step 1: Insert a new entry into the fac_request table and get the inserted RequestID
        const insertRequestQuery = `
        INSERT INTO fac_request (DateTime, Status)
        VALUES (NOW(), 'Pending')
      `;
        const [result] = await db.query(insertRequestQuery); // Get the insert result
        const requestID = result.insertId; // Get the auto-incremented RequestID

        // Step 2: Build the approval link dynamically based on the array of data objects
        const buildQueryString = (devices) => {
            return devices.map((device, index) => {
                return Object.keys(device)
                    .map(key => `${encodeURIComponent(`devices[${index}][${key}]`)}=${encodeURIComponent(device[key])}`)
                    .join('&');
            }).join('&');
        };

        const approvalLink = `https://9fa0-112-134-138-15.ngrok-free.app/email/bulkImportDevicesWindow?requestID=${requestID}&${buildQueryString(deviceData)}`;
        console.log('Approval link:', approvalLink);
        // Step 3: Configure the email transport
        const transporter = nodemailer.createTransport({
            host: 'smtp.sltidc.lk',
            port: 587,
            secure: false,
            auth: {
                user: 'dcim_user@sltidc.lk',
                pass: '=,50,ICireG',
            },
            tls: {
                rejectUnauthorized: false,
            },
        });

        // Step 4: Create the email with the requestID and approvalLink
        const mailOptions = {
            from: 'dcim_user@sltidc.lk',
            to: 'dcim_admin@sltidc.lk',
            subject: `Approval Pending: Bulk Device Import (Request ID: ${requestID})`,
            html: `
          <p>Dear Admin,</p>
          <p>A new bulk of devices pending approval. Below are the details of the request:</p>
          <p>Please click the link below to view and approve the request:</p>
          
          <a href="${approvalLink}" style="padding: 10px 20px; background-color: green; color: white; text-decoration: none; border-radius: 5px;">Click here to view the request</a>
          
          <p style="margin-top: 20px">Best regards,<br>DCIM Team</p>
        `,
        };

        // Step 5: Send the email
        await transporter.sendMail(mailOptions);

        res.status(200).json({ message: 'Approval email sent successfully.', requestID });
    } catch (error) {
        console.error('Error sending approval email or updating request:', error.message);
        res.status(500).json({ error: 'Failed to send approval email or update request.' });
    }
};

exports.sendDeviceAddApprovalEmail = async (req, res) => {
    const device = req.body.data;
    const approvalLink = 'https://yourapp.com/approve-request'; // Replace with your actual approval route
    const rejectionLink = 'https://yourapp.com/reject-request'; // Replace with your actual rejection route

    try {
        const transporter = nodemailer.createTransport({
            host: 'smtp.sltidc.lk', // Replace with your domain's SMTP server
            port: 587, // Usually 587 for TLS or 465 for SSL
            secure: false, // Set to true if using port 465 with SSL
            auth: {
                user: 'dcim_user@sltidc.lk', // Replace with your email address on your domain
                pass: '=,50,ICireG' // Use the email account's password
            },
            tls: {
                rejectUnauthorized: false // Only use this if you encounter certificate issues
            }
        });

        // Construct email content with approval and rejection buttons
        const mailOptions = {
            from: 'dcim_user@sltidc.lk',
            to: 'dcim_admin@sltidc.lk', // Replace with recipient's email
            subject: 'Device Approval Request',
            html: `
                <p>Dear Admin,</p>
                <p>A request for device approval has been submitted with the following details:</p>
                <table border="1" cellpadding="5" cellspacing="0">
                    <thead>
                        <tr>
                            <th>Data Center</th>
                            <th>Location</th>
                            <th>Label</th>
                            <th>Owner</th>
                            <th>Install Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>${device.dataCenter}</td>
                            <td>${device.location}</td>
                            <td>${device.label}</td>
                            <td>${device.owner}</td>
                            <td>${device.installDate}</td>
                        </tr>
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

exports.sendDeviceUpdateApprovalEmail = async (req, res) => {
    const device = req.body.data;
    const approvalLink = 'https://yourapp.com/approve-request'; // Replace with your actual approval route
    const rejectionLink = 'https://yourapp.com/reject-request'; // Replace with your actual rejection route

    try {
        // Configure the transporter for sending emails using nodemailer
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'jithmaldanusha@gmail.com',
                pass: 'mgvv leus gcsa hvib' // Use environment variables for security
            }
        });

        // Construct email content with approval and rejection buttons
        const mailOptions = {
            from: 'jithmaldanusha@gmail.com',
            to: 'danushajithmal@gmail.com', // Replace with recipient's email
            subject: 'Device Approval Request',
            html: `
                <p>Dear Admin,</p>
                <p>A request for device approval has been submitted with the following details:</p>
                <table border="1" cellpadding="5" cellspacing="0">
                    <thead>
                        <tr>
                            <th>Data Center</th>
                            <th>Location</th>
                            <th>Label</th>
                            <th>Owner</th>
                            <th>Install Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>${device.dataCenter}</td>
                            <td>${device.location}</td>
                            <td>${device.label}</td>
                            <td>${device.owner}</td>
                            <td>${device.installDate}</td>
                        </tr>
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