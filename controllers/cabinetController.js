const db = require('../models/db'); // Updated to use the promise-based db

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

    const cabinetQuery = `SELECT Location FROM fac_cabinet WHERE DataCenterID = ?`;
    const [cabinetResults] = await db.execute(cabinetQuery, [dataCenterID]);

    if (cabinetResults.length === 0) {
      return res.status(404).json({ error: 'Cabinets not found' });
    }

    const cabinetNames = cabinetResults.map(cabinet => cabinet.Location);
    res.json(cabinetNames);
  } catch (err) {
    console.error('Error fetching cabinets:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Fetch cabinet by location
exports.getCabinetByLocation = async (req, res) => {
  const location = req.params.location;

  if (!location) {
    return res.status(400).json({ error: 'Location parameter is required' });
  }

  const query = `
    SELECT
      fc.CabinetID,
      fc.Location AS Cabinet,
      fd.Name AS DataCenter,
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
      fc.MapX1 As x1,
      fc.MapX1 As x2,
      fc.MapY1 As y1,
      fc.MapY1 As y2,
      fc.Notes
    FROM fac_cabinet fc
    LEFT JOIN fac_datacenter fd ON fc.DataCenterID = fd.DataCenterID
    LEFT JOIN fac_department fdept ON fc.AssignedTo = fdept.DeptID
    LEFT JOIN fac_zone fz ON fc.ZoneID = fz.ZoneID
    LEFT JOIN fac_cabrow fcr ON fc.CabRowID = fcr.CabRowID
    WHERE fc.Location = ?
  `;
  try {
    const [results] = await db.execute(query, [location]);

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
    mapX1,
    mapX2,
    mapY1,
    mapY2,
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
    if (mapX1) fields.push('MapX1 = ?'), values.push(mapX1);
    if (mapX2) fields.push('MapX2 = ?'), values.push(mapX2);
    if (mapY1) fields.push('MapY1 = ?'), values.push(mapY1);
    if (mapY2) fields.push('MapY2 = ?'), values.push(mapY2);
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


