const db = require('../models/db');
const nodemailer = require('nodemailer');

// Fetch all data centers
exports.getDeviceStatus = async (req, res) => {
    const query = 'SELECT Status FROM fac_DeviceStatus';

    try {
        const [results] = await db.query(query);
        res.json(results);
    } catch (err) {
        console.error('Error fetching status:', err.message);
        res.status(500).json({ error: 'Failed to fetch status' });
    }
};

// Fetch models by manufacturer
exports.getModelsByManufacturer = async (req, res) => {
    const manufacturerName = req.params.manufacturer;

    if (!manufacturerName) {
        return res.status(400).json({ error: 'Manufacturer parameter is required' });
    }

    try {
        const manufacturerQuery = `SELECT ManufacturerID FROM fac_Manufacturer WHERE Name = ?`;
        const [manufacturerResult] = await db.execute(manufacturerQuery, [manufacturerName]);

        if (manufacturerResult.length === 0) {
            return res.status(404).json({ error: 'Manufacturer not found' });
        }

        const manufacturerID = manufacturerResult[0].ManufacturerID;

        const modelQuery = `SELECT Model FROM fac_DeviceTemplate WHERE ManufacturerID = ?`;
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
        const query = `SELECT DeviceID, Label FROM fac_Device WHERE Cabinet = ?`;

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
            FROM fac_Device d
            LEFT JOIN fac_Department dept ON d.Owner = dept.DeptID
            LEFT JOIN fac_People p ON d.PrimaryContact = p.PersonID
            LEFT JOIN fac_DeviceTemplate dt ON d.TemplateID = dt.TemplateID
            LEFT JOIN fac_Manufacturer mf ON dt.ManufacturerID = mf.ManufacturerID
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
            const [ownerResult] = await connection.query(`SELECT DeptID FROM fac_Department WHERE Name = ?`, [owner]);
            if (ownerResult.length === 0) {
                return res.status(404).json({ error: 'Owner department not found' });
            }
            ownerDeptID = ownerResult[0].DeptID;
        }

        // Check and fetch the primaryContactPersonID if primaryContact is not null
        if (primaryContact) {
            const [contactResult] = await connection.query(`SELECT PersonID FROM fac_People WHERE CONCAT(UserID, ' ', LastName) = ?`, [primaryContact]);
            if (contactResult.length === 0) {
                return res.status(404).json({ error: 'Primary contact not found' });
            }
            primaryContactPersonID = contactResult[0].PersonID;
        }

        // Check and fetch the templateID if both model and manufacturer are not null
        if (model && manufacturer) {
            const [templateResult] = await connection.query(
                `SELECT dt.TemplateID 
                FROM fac_DeviceTemplate dt
                INNER JOIN fac_Manufacturer m ON dt.ManufacturerID = m.ManufacturerID
                WHERE dt.Model = ? AND m.Name = ?`,
                [model, manufacturer]
            );
            if (templateResult.length === 0) {
                return res.status(404).json({ error: 'Device model or manufacturer not found' });
            }
            templateID = templateResult[0].TemplateID;
        }

        // Perform the update on the fac_Device table
        const updateQuery = `
            UPDATE fac_Device
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
    const device = req.body;

    try {
        // 1. Get Owner (DeptID) from fac_Department
        const [deptResult] = await connection.query(
            'SELECT DeptID FROM fac_Department WHERE Name = ?',
            [device.owner]
        );

        if (deptResult.length === 0) throw new Error(`Owner not found: ${device.owner}`);
        const ownerDeptID = deptResult[0].DeptID;

        // 2. Split primaryContact to extract UserID and LastName
        const [userID] = device.primaryContact.split(',').map(part => part.trim());

        // Get PrimaryContact (PersonID) from fac_People
        const [personResult] = await connection.query(
            'SELECT PersonID FROM fac_People WHERE UserID = ?',
            [userID]
        );
        if (personResult.length === 0) throw new Error(`Primary contact not found: ${userID}`);
        const primaryContactID = personResult[0].PersonID;

        // 3. Get CabinetID (DataCenter + Cabinet) from fac_Cabinet
        const [dataCenterResult] = await connection.query(
            'SELECT DataCenterID FROM fac_DataCenter WHERE Name = ?',
            [device.dataCenter]
        );
        if (dataCenterResult.length === 0) throw new Error(`Data center not found: ${device.dataCenter}`);
        const dataCenterID = dataCenterResult[0].DataCenterID;

        const [cabinetResult] = await connection.query(
            'SELECT CabinetID FROM fac_Cabinet WHERE Location = ? AND DataCenterID = ?',
            [device.location, dataCenterID]
        );
        if (cabinetResult.length === 0) throw new Error(`Cabinet not found: ${device.location} in data center: ${device.dataCenter}`);
        const cabinetID = cabinetResult[0].CabinetID;

        let manufacturerID = null;
        let templateResult = null;

        // 4. Get TemplateID (Manufacturer + Model) from fac_DeviceTemplate only if manufacturer and model are provided
        if (device.manufacturer && device.model) {
            const [manufacturerResult] = await connection.query(
                'SELECT ManufacturerID FROM fac_Manufacturer WHERE Name = ?',
                [device.manufacturer]
            );
            if (manufacturerResult.length === 0) throw new Error(`Manufacturer not found: ${device.manufacturer}`);
            manufacturerID = manufacturerResult[0].ManufacturerID;

            templateResult = await connection.query(
                'SELECT TemplateID, Height, Weight, Wattage, DeviceType, PSCount, NumPorts, ChassisSlots, RearChassisSlots, SNMPVersion ' +
                'FROM fac_DeviceTemplate WHERE Model = ? AND ManufacturerID = ?',
                [device.model, manufacturerID]
            );
            if (templateResult.length === 0) throw new Error(`Template not found for model: ${device.model} and manufacturer: ${device.manufacturer}`);
        } else {
            // If no manufacturer/model, set template result as an empty object with default values
            templateResult = [{ SNMPVersion: 'noAuthNoPriv', Height: 0, Weight: 0, Wattage: 0, PSCount: 1, NumPorts: 0, ChassisSlots: 0, RearChassisSlots: 0 }];
        }

        const template = templateResult[0];

        // 6. Insert the device into fac_Device
        const sqlQuery =
            'INSERT INTO fac_Device (' +
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
        const query = 'DELETE FROM fac_Device WHERE DeviceID = ?';
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
            // 1. Get Owner (DeptID) from fac_Department
            const [deptResult] = await connection.query(
                `SELECT DeptID FROM fac_Department WHERE Name = ?`,
                [device.owner]
            );
            if (deptResult.length === 0) throw new Error(`Owner not found: ${device.owner}`);
            const ownerDeptID = deptResult[0].DeptID;

            // 2. Split primaryContact to extract UserID and LastName
            const [userID] = device.primaryContact.split(',').map(part => part.trim());

            // Get PrimaryContact (PersonID) from fac_People
            const [personResult] = await connection.query(
                `SELECT PersonID FROM fac_People WHERE UserID = ?`,
                [userID]
            );
            if (personResult.length === 0) throw new Error(`Primary contact not found: ${userID}`);
            const primaryContactID = personResult[0].PersonID;

            // 3. Get CabinetID (DataCenter + Cabinet) from fac_Cabinet
            const [dataCenterResult] = await connection.query(
                `SELECT DataCenterID FROM fac_DataCenter WHERE Name = ?`,
                [device.dataCenter]
            );
            if (dataCenterResult.length === 0) throw new Error(`Data center not found: ${device.dataCenter}`);
            const dataCenterID = dataCenterResult[0].DataCenterID;

            const cabinetLocation = device.cabinet.split(' - ')[1] || device.cabinet;

            const [cabinetResult] = await connection.query(
                `SELECT CabinetID FROM fac_Cabinet WHERE Location = ? AND DataCenterID = ?`,
                [cabinetLocation, dataCenterID] // Use the extracted 'R01.16' value
            );

            if (cabinetResult.length === 0) throw new Error(`Cabinet not found: ${device.cabinet} in data center: ${device.dataCenter}`);
            const cabinetID = cabinetResult[0].CabinetID;

            // 4. Get TemplateID (Manufacturer + Model) from fac_DeviceTemplate
            const [manufacturerResult] = await connection.query(
                `SELECT ManufacturerID FROM fac_Manufacturer WHERE Name = ?`,
                [device.manufacturer]
            );
            if (manufacturerResult.length === 0) throw new Error(`Manufacturer not found: ${device.manufacturer}`);
            const manufacturerID = manufacturerResult[0].ManufacturerID;

            const [templateResult] = await connection.query(
                `SELECT TemplateID, Height, Weight, Wattage, DeviceType, PSCount, NumPorts, ChassisSlots, RearChassisSlots, SNMPVersion 
                 FROM fac_DeviceTemplate 
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

            // 6. Insert the device into fac_Device
            const sqlQuery = `
                INSERT INTO fac_Device (
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
    const deviceData = req.body.data;
    const userId = req.body.userId;

    const emailQuery = `SELECT Email, EmailPass FROM fac_user WHERE UserID = ?`;
    const [userResult] = await db.query(emailQuery, [userId]);

    // Step 2: Check if both Email and EmailPass are available
    if (userResult.length === 0 || !userResult[0].Email || !userResult[0].EmailPass) {
        return res.status(400).json({ error: "Email not set for the user." });
    }

    const userEmail = userResult[0].Email;
    const userPass = userResult[0].EmailPass;

    // Step 3: Fetch the Super-Admin's email from the fac_user table
    const superAdminQuery = `SELECT Email FROM fac_user WHERE Role = 'Super-Admin'`;
    const [superAdminResult] = await db.query(superAdminQuery);

    // Step 4: Check if a Super-Admin email is found
    if (superAdminResult.length === 0 || !superAdminResult[0].Email) {
        return res.status(400).json({ error: "Reciever email not found." });
    }

    const superAdminEmail = superAdminResult[0].Email;
    try {
        // Step 1: Insert a new entry into the fac_request table and get the inserted RequestID
        const insertRequestQuery = `
            INSERT INTO fac_request (DateTime, Status)
            VALUES (NOW(), 'Pending')
        `;
        const [result] = await db.query(insertRequestQuery); // Get the insert result
        const requestID = result.insertId; // Get the auto-incremented RequestID

        // Step 2: Build the approval link dynamically based on the array of device objects
        const buildQueryString = (devices) => {
            return devices.map((device, index) => {
                return Object.keys(device)
                    .map(key => `${encodeURIComponent(`devices[${index}][${key}]`)}=${encodeURIComponent(device[key])}`)
                    .join('&');
            }).join('&');
        };

        //process.env.DB_HOST
        const approvalLink = `https://${process.env.DB_HOST}/email/bulkImportDevicesWindow?requestID=${requestID}&${buildQueryString(deviceData)}`;

        // Step 3: Configure the email transport
        const transporter = nodemailer.createTransport({
            host: 'smtp.sltidc.lk',
            port: 587,
            secure: false,
            auth: {
                user: userEmail,
                pass: userPass,
            },
            tls: {
                rejectUnauthorized: false,
            },
        });

        // Step 4: Create the email with the requestID and approvalLink
        const mailOptions = {
            from: userEmail,
            to: superAdminEmail,
            subject: `Approval Pending: Bulk Device Import (Request ID: ${requestID})`,
            html: `
                <p>Dear Admin,</p>
                <p>A new bulk of devices is pending approval. Below are the details of the request:</p>
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
    const deviceData = req.body.data;
    const userId = req.body.userId;

    const emailQuery = `SELECT Email, EmailPass FROM fac_user WHERE UserID = ?`;
    const [userResult] = await db.query(emailQuery, [userId]);

    // Step 2: Check if both Email and EmailPass are available
    if (userResult.length === 0 || !userResult[0].Email || !userResult[0].EmailPass) {
        return res.status(400).json({ error: "Email not set for the user." });
    }

    const userEmail = userResult[0].Email;
    const userPass = userResult[0].EmailPass;

    // Step 3: Fetch the Super-Admin's email from the fac_user table
    const superAdminQuery = `SELECT Email FROM fac_user WHERE Role = 'Super-Admin'`;
    const [superAdminResult] = await db.query(superAdminQuery);

    // Step 4: Check if a Super-Admin email is found
    if (superAdminResult.length === 0 || !superAdminResult[0].Email) {
        return res.status(400).json({ error: "Reciever email not found." });
    }

    const superAdminEmail = superAdminResult[0].Email;
    try {
        // Step 1: Insert a new entry into the fac_request table and get the inserted RequestID
        const insertRequestQuery = `
            INSERT INTO fac_request (DateTime, Status)
            VALUES (NOW(), 'Pending')
        `;
        const [result] = await db.query(insertRequestQuery); // Get the insert result
        const requestID = result.insertId; // Get the auto-incremented RequestID

        // Step 2: Build the approval link dynamically based on the array of device objects
        const buildQueryString = (data) => {
            return Object.keys(data)
                .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(data[key])}`)
                .join('&');
        };

        //process.env.DB_HOST
        const approvalLink = `https://${process.env.DB_HOST}/email/addNewDeviceWindow?requestID=${requestID}&${buildQueryString(deviceData)}`;

        // Step 3: Configure the email transport
        const transporter = nodemailer.createTransport({
            host: 'smtp.sltidc.lk',
            port: 587,
            secure: false,
            auth: {
                user: userEmail,
                pass: userPass,
            },
            tls: {
                rejectUnauthorized: false,
            },
        });

        // Step 4: Create the email with the requestID and approvalLink
        const mailOptions = {
            from: userEmail,
            to: superAdminEmail,
            subject: `Approval Pending: New Device (Request ID: ${requestID})`,
            html: `
                <p>Dear Admin,</p>
                <p>A new Device is pending approval. Below are the details of the request:</p>
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

exports.sendDeviceDeleteApprovalEmail = async (req, res) => {
    const { deviceId } = req.body;
    const userId = req.body.userId;

    const emailQuery = `SELECT Email, EmailPass FROM fac_user WHERE UserID = ?`;
    const [userResult] = await db.query(emailQuery, [userId]);

    // Step 2: Check if both Email and EmailPass are available
    if (userResult.length === 0 || !userResult[0].Email || !userResult[0].EmailPass) {
        return res.status(400).json({ error: "Email not set for the user." });
    }

    const userEmail = userResult[0].Email;
    const userPass = userResult[0].EmailPass;

    // Step 3: Fetch the Super-Admin's email from the fac_user table
    const superAdminQuery = `SELECT Email FROM fac_user WHERE Role = 'Super-Admin'`;
    const [superAdminResult] = await db.query(superAdminQuery);

    // Step 4: Check if a Super-Admin email is found
    if (superAdminResult.length === 0 || !superAdminResult[0].Email) {
        return res.status(400).json({ error: "Receiver email not found." });
    }

    const superAdminEmail = superAdminResult[0].Email;

    try {
        // Step 1: Fetch the device details using the deviceId
        const deviceQuery = `SELECT Label, Position, Cabinet, DeviceType FROM fac_Device WHERE DeviceID = ?`;
        const [deviceResult] = await db.query(deviceQuery, [deviceId]);

        // Step 2: Check if the device is found
        if (deviceResult.length === 0) {
            return res.status(404).json({ error: 'Device not found' });
        }

        const { Label, Position, Cabinet, DeviceType } = deviceResult[0];

        // Step 3: Fetch the DataCenterID and Location from the fac_Cabinet table using the Cabinet ID
        const cabinetQuery = `SELECT DataCenterID, Location FROM fac_Cabinet WHERE CabinetID = ?`;
        const [cabinetResult] = await db.query(cabinetQuery, [Cabinet]);

        // Step 4: Check if the cabinet is found and the DataCenterID exists
        if (cabinetResult.length === 0 || !cabinetResult[0].DataCenterID || !cabinetResult[0].Location) {
            return res.status(404).json({ error: 'Cabinet not found or DataCenterID/Location missing' });
        }

        const { DataCenterID, Location: cabinetLocation } = cabinetResult[0];

        // Step 5: Fetch the DataCenter Name from the fac_DataCenter table using the DataCenterID
        const dataCenterQuery = `SELECT Name FROM fac_DataCenter WHERE DataCenterID = ?`;
        const [dataCenterResult] = await db.query(dataCenterQuery, [DataCenterID]);

        // Step 6: Check if the data center is found
        if (dataCenterResult.length === 0 || !dataCenterResult[0].Name) {
            return res.status(404).json({ error: 'Data center not found' });
        }

        const { Name: dataCenterName } = dataCenterResult[0];

        // Step 7: Create the data object with required fields
        const data = {
            datacenter: dataCenterName,
            cabinet: cabinetLocation, // Assigning the Location to the cabinet field
            label: Label,  // or you can use other relevant info from the device query
            position: Position,
            devicetype: DeviceType,
        };

        // Step 8: Insert a new entry into the fac_request table and get the inserted RequestID
        const insertRequestQuery = `
            INSERT INTO fac_request (DateTime, Status)
            VALUES (NOW(), 'Pending')
        `;
        const [result] = await db.query(insertRequestQuery); // Get the insert result
        const requestID = result.insertId; // Get the auto-incremented RequestID

        // Step 9: Build the approval link dynamically based on the device data
        const buildQueryString = (data) => {
            return Object.keys(data)
                .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(data[key])}`)
                .join('&');
        };

        // Use the requestID and data object in the approval link
        const approvalLink = `https://${process.env.DB_HOST}/email/deleteDeviceWindow?requestID=${requestID}&deviceId=${deviceId}&${buildQueryString(data)}`;

        // Step 10: Configure the email transport
        const transporter = nodemailer.createTransport({
            host: 'smtp.sltidc.lk',
            port: 587,
            secure: false,
            auth: {
                user: userEmail,
                pass: userPass,
            },
            tls: {
                rejectUnauthorized: false,
            },
        });

        // Step 11: Create the email with the requestID and approvalLink
        const mailOptions = {
            from: userEmail,
            to: superAdminEmail,
            subject: `Approval Pending: Device Deletion (Request ID: ${requestID})`,
            html: `
                <p>Dear Admin,</p>
                <p>A request to delete a device is pending approval. Below are the details of the request:</p>
                <p>Please click the link below to view and approve the request:</p>
                <a href="${approvalLink}" style="padding: 10px 20px; background-color: red; color: white; text-decoration: none; border-radius: 5px;">Click here to view the request</a>
                <p style="margin-top: 20px">Best regards,<br>DCIM Team</p>
            `,
        };

        // Step 12: Send the email
        await transporter.sendMail(mailOptions);

        res.status(200).json({ message: 'Approval email sent successfully.', requestID });
    } catch (error) {
        console.error('Error sending approval email or updating request:', error.message);
        res.status(500).json({ error: 'Failed to send approval email or update request.' });
    }
};

