const db = require('../models/db');
const nodemailer = require('nodemailer');

// Fetch all cabinets
exports.getCabinets = async (req, res) => {
  const query = `
    SELECT 
      c.CabinetID, 
      c.Location, 
      d.Name AS DataCenterName
    FROM fac_Cabinet c
    JOIN fac_DataCenter d ON c.DataCenterID = d.DataCenterID;
  `;
  try {
    const [results] = await db.execute(query);
    res.json(results);
  } catch (err) {
    console.error('Error fetching cabinets:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Fetch cabinets by datacenter
exports.getCabinetsByDataCenter = async (req, res) => {
  const datacenterName = req.params.datacenter;

  if (!datacenterName) {
    return res.status(400).json({ error: 'Datacenter parameter is required' });
  }

  try {
    const dataCenterQuery = `SELECT DataCenterID FROM fac_DataCenter WHERE Name = ?`;
    const [dataCenterResult] = await db.execute(dataCenterQuery, [datacenterName]);

    if (dataCenterResult.length === 0) {
      return res.status(404).json({ error: 'Datacenter not found' });
    }

    const dataCenterID = dataCenterResult[0].DataCenterID;

    const cabinetQuery = `SELECT CabinetID, Location FROM fac_Cabinet WHERE DataCenterID = ?`;
    const [cabinetResults] = await db.execute(cabinetQuery, [dataCenterID]);

    if (cabinetResults.length === 0) {
      return res.status(404).json({ error: 'No cabinets found for this datacenter' });
    }

    // Map the results and format them as "CabinetID - Location"
    const formattedCabinets = cabinetResults.map(cabinet => `${cabinet.CabinetID} - ${cabinet.Location}`);

    // Return the array of formatted cabinet strings
    res.json(formattedCabinets);
  } catch (err) {
    console.error('Error fetching cabinets:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Fetch cabinet by location
exports.getCabinetByID = async (req, res) => {
  const id = req.params.id;

  if (!id) {
    return res.status(400).json({ error: 'CabinetID is required' });
  }

  const query = `
    SELECT
      fc.Location AS Location,
      fdept.Name AS AssignedTo,
      fz.Description AS Zone,
      fcr.Name AS CabinetRow,
      fc.CabinetHeight,
      fc.U1Position,
      fc.Model,
      fc.Keylock AS KeyLockInfo,
      fc.MaxKW,
      fc.MaxWeight,
      fc.InstallationDate AS DateOfInstallation,
      fc.Notes
    FROM fac_Cabinet fc
    LEFT JOIN fac_Department fdept ON fc.AssignedTo = fdept.DeptID
    LEFT JOIN fac_Zone fz ON fc.ZoneID = fz.ZoneID
    LEFT JOIN fac_CabRow fcr ON fc.CabRowID = fcr.CabRowID
    WHERE fc.CabinetID = ?
  `;
  try {
    const [results] = await db.execute(query, [id]);

    if (results.length === 0) {
      return res.status(404).json({ error: 'Cabinet not found' });
    }

    res.json(results[0]);
  } catch (err) {
    console.error('Error fetching cabinet:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Update cabinet details
exports.updateCabinet = async (req, res) => {
  const {
    cabinetID,
    location,
    dataCenter,
    assignedTo,
    zone,
    cabinetRow,
    cabinetHeight,
    u1Position,
    model,
    keyLockInfo,
    maxKW,
    maxWeight,
    dateOfInstallation,
    notes,
  } = req.body;

  if (!cabinetID) {
    return res.status(400).json({ error: 'cabinetID is required' });
  }

  try {
    const fields = [];
    const values = [];

    if (location) fields.push('Location = ?'), values.push(location);
    if (dataCenter) fields.push('DataCenterID = (SELECT DataCenterID FROM fac_DataCenter WHERE Name = ? LIMIT 1)'), values.push(dataCenter);
    if (assignedTo) fields.push('AssignedTo = (SELECT DeptID FROM fac_Department WHERE Name = ? LIMIT 1)'), values.push(assignedTo);
    if (zone) fields.push('ZoneID = (SELECT ZoneID FROM fac_Zone WHERE Description = ? LIMIT 1)'), values.push(zone);
    if (cabinetRow) fields.push('CabRowID = (SELECT CabRowID FROM fac_CabRow WHERE Name = ? LIMIT 1)'), values.push(cabinetRow);
    if (cabinetHeight) fields.push('CabinetHeight = ?'), values.push(cabinetHeight);
    if (u1Position) fields.push('U1Position = ?'), values.push(u1Position);
    if (model) fields.push('Model = ?'), values.push(model);
    if (keyLockInfo) fields.push('Keylock = ?'), values.push(keyLockInfo);
    if (maxKW) fields.push('MaxKW = ?'), values.push(maxKW);
    if (maxWeight) fields.push('MaxWeight = ?'), values.push(maxWeight);
    if (dateOfInstallation) fields.push('InstallationDate = ?'), values.push(new Date(dateOfInstallation));
    if (notes) fields.push('Notes = ?'), values.push(notes);

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields provided for update' });
    }

    const query = `
      UPDATE fac_Cabinet
      SET ${fields.join(', ')}
      WHERE CabinetID = ?
    `;
    values.push(cabinetID);

    const [results] = await db.execute(query, values);

    if (results.affectedRows === 0) {
      return res.status(404).json({ error: 'Cabinet not found' });
    }

    res.json({ success: true, message: 'Cabinet updated successfully' });
  } catch (err) {
    console.error('Error updating cabinet:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.addCabinet = async (req, res) => {
  const {
    dataCenter,
    location,
    assignedTo,
    zone,
    cabinetRow,
    cabinetHeight,
    u1Position,
    model,
    keyLockInfo,
    maxKW,
    maxWeight,
    dateOfInstallation,
    notes,
  } = req.body;

  try {
    // Default values for missing fields
    const locationSortable = location ? location.toLowerCase() : ''; // Default empty string for LocationSortable
    const frontEdge = 'Top'; // Default value for FrontEdge
    const u1PositionValue = u1Position || 'Default'; // Default value for U1Position
    const cabinetHeightValue = cabinetHeight || 0; // Default value for CabinetHeight (0)
    const modelValue = model || ''; // Default empty string for Model
    const keyLockInfoValue = keyLockInfo || ''; // Default empty string for Keylock
    const maxKWValue = maxKW || 0; // Default value for MaxKW (0)
    const maxWeightValue = maxWeight || 0; // Default value for MaxWeight (0)
    const dateOfInstallationValue = dateOfInstallation || '0000-00-00'; // Default date for InstallationDate
    const notesValue = notes || ''; // Default empty string for Notes

    // Check if zone or cabinetRow is "N/A" and assign default value, otherwise use the subquery for the actual value
    const zoneQuery = zone === 'N/A' ? 0 : `(SELECT ZoneID FROM fac_Zone WHERE Description = ? LIMIT 1)`; // Default to 0 for "N/A" zone
    const cabinetRowQuery = cabinetRow === 'N/A' ? 0 : `(SELECT CabRowID FROM fac_CabRow WHERE Name = ? LIMIT 1)`; // Default to 0 for "N/A" cabinet row

    const insertQuery = `
      INSERT INTO fac_Cabinet (
        Location, LocationSortable, DataCenterID, AssignedTo, ZoneID, CabRowID, 
        CabinetHeight, U1Position, Model, Keylock, MaxKW, MaxWeight, InstallationDate, 
        Notes, MapX1, MapX2, MapY1, MapY2, FrontEdge
      ) 
      VALUES (
        ?, ?, 
        (SELECT DataCenterID FROM fac_DataCenter WHERE Name = ? LIMIT 1), 
        (SELECT DeptID FROM fac_Department WHERE Name = ? LIMIT 1), 
        ${zoneQuery}, ${cabinetRowQuery}, 
        ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, ?
      );
    `;

    const values = [
      location, locationSortable, dataCenter, assignedTo,
      ...(zone !== 'N/A' ? [zone] : []),
      ...(cabinetRow !== 'N/A' ? [cabinetRow] : []),
      cabinetHeightValue, u1PositionValue, modelValue, keyLockInfoValue, maxKWValue, maxWeightValue, dateOfInstallationValue, notesValue,
      frontEdge // Use the default value for FrontEdge ('Top')
    ];

    const [results] = await db.execute(insertQuery, values);

    res.json({ success: true, message: 'Cabinet added successfully', insertedId: results.insertId });
  } catch (err) {
    console.error('Error adding cabinet:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}


// Delete cabinet
exports.deleteCabinet = async (req, res) => {
  const cabinetID = req.params.cabinetID;
  try {
    const query = 'DELETE FROM fac_Cabinet WHERE CabinetID = ?';
    const [results] = await db.execute(query, [cabinetID]);

    if (results.affectedRows === 0) {
      return res.status(404).json({ error: 'Cabinet not found' });
    }

    res.json({ success: true, message: 'Cabinet deleted successfully' });
  } catch (err) {
    console.error('Error deleting cabinet:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.sendAddApprovalEmail = async (req, res) => {
  const cabinetData = req.body.data;
  const userId = req.body.userId;

  try {
    // Step 1: Fetch the user's email and email password using the userId
    const emailQuery = `SELECT Email, EmailPass FROM fac_User WHERE UserID = ?`;
    const [userResult] = await db.query(emailQuery, [userId]);

    // Step 2: Check if both Email and EmailPass are available
    if (userResult.length === 0 || !userResult[0].Email || !userResult[0].EmailPass) {
      return res.status(400).json({ error: "Email or EmailPass not found for the user." });
    }

    const userEmail = userResult[0].Email;
    const userPass = userResult[0].EmailPass;

    // Step 3: Fetch the Super-Admin's email from the fac_User table
    const superAdminQuery = `SELECT Email FROM fac_User WHERE Role = 'Super-Admin'`;
    const [superAdminResult] = await db.query(superAdminQuery);

    // Step 4: Check if a Super-Admin email is found
    if (superAdminResult.length === 0 || !superAdminResult[0].Email) {
      return res.status(400).json({ error: "Reciever email not found." });
    }

    const superAdminEmail = superAdminResult[0].Email;

    // Step 5: Insert a new entry into the fac_Request table and get the inserted RequestID
    const insertRequestQuery = `
      INSERT INTO fac_Request (DateTime, Status)
      VALUES (NOW(), 'Pending')
    `;
    const [result] = await db.query(insertRequestQuery);
    const requestID = result.insertId;

    // Step 6: Build the approval link dynamically based on the data object
    const buildQueryString = (data) => {
      return Object.keys(data)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(data[key])}`)
        .join('&');
    };

    const approvalLink = `http://${process.env.SERVER_HOST}/email/addCabinetWindow?requestID=${requestID}&${buildQueryString(cabinetData)}`;

    // Step 7: Configure the email transport using the user's email and password
    const transporter = nodemailer.createTransport({
      host: 'smtp.sltidc.lk',
      port: 587,
      secure: false, // Upgrade later with STARTTLS
      auth: {
        user: userEmail,  // Use the fetched user's email
        pass: userPass,   // Use the fetched email password
      },
      tls: {
        rejectUnauthorized: false, // Allow self-signed certificates
      },
    });

    // Step 8: Create the email with the requestID and approvalLink
    const mailOptions = {
      from: userEmail, // The 'From' is set to the fetched user's email
      to: superAdminEmail, // Email is sent to the Super-Admin's email address
      subject: `Approval Pending: New Cabinet (Request ID: ${requestID})`,
      html: `
        <p>Dear Admin,</p>
        <p>A new Cabinet is pending approval. Below are the details of the request:</p>
        <p>Please click the link below to view and approve the request:</p>
        
        <a href="${approvalLink}" style="padding: 10px 20px; background-color: green; color: white; text-decoration: none; border-radius: 5px;">Click here to view the request</a>
        
        <p style="margin-top: 20px">Best regards,<br>DCIM Team</p>
      `,
    };

    // Step 9: Send the email
    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: 'Approval email sent successfully.', requestID });
  } catch (error) {
    console.error('Error sending approval email or updating request:', error.message);
    res.status(500).json({ error: 'Failed to send approval email or update request.' });
  }
};


exports.sendDeleteApprovalEmail = async (req, res) => {
  const { cabinetID } = req.body; // Extract the cabinetID from the request body
  const userId = req.body.userId; // Extract the userId for fetching the user's email

  try {
    // Step 1: Fetch the user's email and email password using the userId
    const emailQuery = `SELECT Email, EmailPass FROM fac_User WHERE UserID = ?`;
    const [userResult] = await db.query(emailQuery, [userId]);

    // Step 2: Check if both Email and EmailPass are available
    if (userResult.length === 0 || !userResult[0].Email || !userResult[0].EmailPass) {
      return res.status(400).json({ error: "Email or EmailPass not found for the user." });
    }

    const userEmail = userResult[0].Email;
    const userPass = userResult[0].EmailPass;

    // Step 3: Fetch the Super-Admin's email from the fac_User table
    const superAdminQuery = `SELECT Email FROM fac_User WHERE Role = 'Super-Admin'`;
    const [superAdminResult] = await db.query(superAdminQuery);

    // Step 4: Check if a Super-Admin email is found
    if (superAdminResult.length === 0 || !superAdminResult[0].Email) {
      return res.status(400).json({ error: "Receiver email not found." });
    }

    const superAdminEmail = superAdminResult[0].Email;

    // Step 5: Fetch the Location from fac_Cabinet and the DataCenterID
    const cabinetQuery = `SELECT Location, DataCenterID FROM fac_Cabinet WHERE CabinetID = ?`;
    const [cabinetResult] = await db.query(cabinetQuery, [cabinetID]);

    // Step 6: Check if the cabinet data is available
    if (cabinetResult.length === 0) {
      return res.status(400).json({ error: "Cabinet not found." });
    }

    const { Location, DataCenterID } = cabinetResult[0];

    // Step 7: Fetch the DataCenter Name using the DataCenterID
    const dataCenterQuery = `SELECT Name FROM fac_DataCenter WHERE DataCenterID = ?`;
    const [dataCenterResult] = await db.query(dataCenterQuery, [DataCenterID]);

    // Step 8: Check if the DataCenter Name is available
    if (dataCenterResult.length === 0 || !dataCenterResult[0].Name) {
      return res.status(400).json({ error: "Data center not found." });
    }

    const dataCenterName = dataCenterResult[0].Name;

    // Step 9: Create the data object with Location and DataCenter Name
    const data = {
      location: Location,
      datacenter: dataCenterName,
    };

    // Step 10: Insert a new entry into the fac_Request table for cabinet deletion and get the inserted RequestID
    const insertRequestQuery = `
      INSERT INTO fac_Request (DateTime, Status)
      VALUES (NOW(), 'Pending')
    `;
    const [result] = await db.query(insertRequestQuery);
    const requestID = result.insertId;

    // Step 11: Build the approval link dynamically based on the cabinetID and data
    const buildQueryString = (data) => {
      return Object.keys(data)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(data[key])}`)
        .join('&');
    };

    const approvalLink = `http://${process.env.SERVER_HOST}/email/deleteCabinetWindow?requestID=${requestID}&cabinetID=${cabinetID}&${buildQueryString(data)}`;
    // Step 12: Configure the email transport using the user's email and password
    const transporter = nodemailer.createTransport({
      host: 'smtp.sltidc.lk',
      port: 587,
      secure: false, // Upgrade later with STARTTLS
      auth: {
        user: userEmail,  // Use the fetched user's email
        pass: userPass,   // Use the fetched email password
      },
      tls: {
        rejectUnauthorized: false, // Allow self-signed certificates
      },
    });

    // Step 13: Create the email with the requestID, cabinetID, and approvalLink
    const mailOptions = {
      from: userEmail, // The 'From' is set to the fetched user's email
      to: superAdminEmail, // Email is sent to the Super-Admin's email address
      subject: `Approval Pending: Delete Cabinet (Request ID: ${requestID})`,
      html: `
        <p>Dear Admin,</p>
        <p>A request to delete a Cabinet is pending approval. Below are the details of the request:</p>

        <p>Please click the link below to view and approve the request:</p>
        
        <a href="${approvalLink}" style="padding: 10px 20px; background-color: red; color: white; text-decoration: none; border-radius: 5px;">Click here to view the request</a>
        
        <p style="margin-top: 20px">Best regards,<br>DCIM Team</p>
      `,
    };

    // Step 14: Send the email
    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: 'Delete approval email sent successfully.', requestID });
  } catch (error) {
    console.error('Error sending delete approval email or updating request:', error.message);
    res.status(500).json({ error: 'Failed to send delete approval email or update request.' });
  }
};




