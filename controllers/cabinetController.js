const db = require('../models/db');
const nodemailer = require('nodemailer');

// Fetch all cabinets
exports.getCabinets = async (req, res) => {
  const query = `
    SELECT 
      c.CabinetID, 
      c.Location, 
      d.Name AS DataCenterName
    FROM fac_cabinet c
    JOIN fac_datacenter d ON c.DataCenterID = d.DataCenterID;
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
    const dataCenterQuery = `SELECT DataCenterID FROM fac_datacenter WHERE Name = ?`;
    const [dataCenterResult] = await db.execute(dataCenterQuery, [datacenterName]);

    if (dataCenterResult.length === 0) {
      return res.status(404).json({ error: 'Datacenter not found' });
    }

    const dataCenterID = dataCenterResult[0].DataCenterID;

    const cabinetQuery = `SELECT CabinetID, Location FROM fac_cabinet WHERE DataCenterID = ?`;
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
    FROM fac_cabinet fc
    LEFT JOIN fac_department fdept ON fc.AssignedTo = fdept.DeptID
    LEFT JOIN fac_zone fz ON fc.ZoneID = fz.ZoneID
    LEFT JOIN fac_cabrow fcr ON fc.CabRowID = fcr.CabRowID
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
    if (dataCenter) fields.push('DataCenterID = (SELECT DataCenterID FROM fac_datacenter WHERE Name = ? LIMIT 1)'), values.push(dataCenter);
    if (assignedTo) fields.push('AssignedTo = (SELECT DeptID FROM fac_department WHERE Name = ? LIMIT 1)'), values.push(assignedTo);
    if (zone) fields.push('ZoneID = (SELECT ZoneID FROM fac_zone WHERE Description = ? LIMIT 1)'), values.push(zone);
    if (cabinetRow) fields.push('CabRowID = (SELECT CabRowID FROM fac_cabrow WHERE Name = ? LIMIT 1)'), values.push(cabinetRow);
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
      UPDATE fac_cabinet
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

// Add a new cabinet
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
    // Check if zone or cabinetRow is "N/A" and assign 0, otherwise use the subquery for the actual value
    const zoneQuery = zone === 'N/A' ? '0' : `(SELECT ZoneID FROM fac_zone WHERE Description = ? LIMIT 1)`;
    const cabinetRowQuery = cabinetRow === 'N/A' ? '0' : `(SELECT CabRowID FROM fac_cabrow WHERE Name = ? LIMIT 1)`;

    const insertQuery = `
      INSERT INTO fac_cabinet (
        Location, DataCenterID, AssignedTo, ZoneID, CabRowID, CabinetHeight, 
        U1Position, Model, Keylock, MaxKW, MaxWeight, InstallationDate, Notes, MapX1, MapX2, MapY1, MapY2
      ) 
      VALUES (
        ?, 
        (SELECT DataCenterID FROM fac_datacenter WHERE Name = ? LIMIT 1), 
        (SELECT DeptID FROM fac_department WHERE Name = ? LIMIT 1), 
        ${zoneQuery}, ${cabinetRowQuery}, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0
      );`;

    const values = [
      location, dataCenter, assignedTo,
      ...(zone !== 'N/A' ? [zone] : []),
      ...(cabinetRow !== 'N/A' ? [cabinetRow] : []),
      cabinetHeight, u1Position, model, keyLockInfo, maxKW, maxWeight, new Date(dateOfInstallation), notes,
    ];

    const [results] = await db.execute(insertQuery, values);

    res.json({ success: true, message: 'Cabinet added successfully', insertedId: results.insertId });
  } catch (err) {
    console.error('Error adding cabinet:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Delete cabinet
exports.deleteCabinet = async (req, res) => {
  const cabinetID = req.params.cabinetID;

  try {
    const query = 'DELETE FROM fac_cabinet WHERE CabinetID = ?';
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
  try {
    // Step 1: Insert a new entry into the fac_request table and get the inserted RequestID
    const insertRequestQuery = `
      INSERT INTO fac_request (DateTime, Status)
      VALUES (NOW(), 'Pending')
    `;
    const [result] = await db.query(insertRequestQuery); // Get the insert result
    const requestID = result.insertId; // Get the auto-incremented RequestID

    // Step 2: Build the approval link dynamically based on the data object
    const buildQueryString = (data) => {
      return Object.keys(data)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(data[key])}`)
        .join('&');
    };

    const approvalLink = `https://9fa0-112-134-138-15.ngrok-free.app/email/addCabinetWindow?requestID=${requestID}&${buildQueryString(cabinetData)}`;

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
      subject: `Approval Pending: New Cabinet (Request ID: ${requestID})`,
      html: `
        <p>Dear Admin,</p>
        <p>A new Cabinet is pending approval. Below are the details of the request:</p>
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




