const db = require('../models/db');

exports.getCabinets = (req, res) => {
  const query = `
    SELECT 
      c.CabinetID, 
      c.Location, 
      d.Name AS DataCenterName
    FROM fac_cabinet c
    JOIN fac_datacenter d ON c.DataCenterID = d.DataCenterID;
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching cabinets:', err);
      return res.status(500).json({ error: 'Failed to fetch cabinets' });
    }
    res.json(results);
  });
};

exports.getCabinetByLocation = (req, res) => {
  const location = req.params.location;

  // SQL query to fetch cabinet details by location
  const query = `
    SELECT
      fc.CabinetID,
      fc.Location AS Cabinet,
      fc.Location AS Location,
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
      fc.Notes
    FROM fac_cabinet fc
    LEFT JOIN fac_datacenter fd ON fc.DataCenterID = fd.DataCenterID
    LEFT JOIN fac_department fdept ON fc.AssignedTo = fdept.DeptID
    LEFT JOIN fac_zone fz ON fc.ZoneID = fz.ZoneID
    LEFT JOIN fac_cabrow fcr ON fc.CabRowID = fcr.CabRowID
    WHERE fc.Location = ?
  `;

  if (!location) {
    return res.json(null);
  }

  db.query(query, [location], (err, results) => {
    if (err) {
      console.error('Error fetching cabinet:', err);
      return res.status(500).json({ error: 'Failed to fetch cabinet' });
    }

    if (results.length === 0) {
      return res.json(null);
    }

    res.json(results[0]);
  });
};

exports.updateCabinet = (req, res) => {
  console.log('Received body for update:', req.body);

  const {
    cabinetID,
    dataCenter,
    location,
    locationSortable,
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
    return res.status(400).json({ error: 'cabinetID is required for updating a record' });
  }

  // Initialize the base query
  let updateQuery = `UPDATE fac_cabinet SET `;
  const values = [];

  // Dynamically add fields based on provided data
  if (location !== undefined) {
    updateQuery += `Location = ?, `;
    values.push(location);
  }
  if (locationSortable !== undefined) {
    updateQuery += `LocationSortable = ?, `;
    values.push(locationSortable);
  }
  if (dataCenter !== undefined) {
    updateQuery += `DataCenterID = (SELECT DataCenterID FROM fac_datacenter WHERE Name = ? LIMIT 1), `;
    values.push(dataCenter);
  }
  if (assignedTo !== undefined) {
    updateQuery += `AssignedTo = ${assignedTo ? `(SELECT DeptID FROM fac_department WHERE Name = ? LIMIT 1)` : 'NULL'}, `;
    if (assignedTo) values.push(assignedTo);
  }
  if (zone !== undefined) {
    updateQuery += `ZoneID = (SELECT ZoneID FROM fac_zone WHERE Description = ? LIMIT 1), `;
    values.push(zone);
  }
  if (cabinetRow !== undefined) {
    updateQuery += `CabRowID = (SELECT CabRowID FROM fac_cabrow WHERE Name = ? LIMIT 1), `;
    values.push(cabinetRow);
  }
  if (cabinetHeight !== undefined) {
    updateQuery += `CabinetHeight = ?, `;
    values.push(cabinetHeight);
  }
  if (u1Position !== undefined) {
    updateQuery += `U1Position = ?, `;
    values.push(u1Position);
  }
  if (model !== undefined) {
    updateQuery += `Model = ?, `;
    values.push(model);
  }
  if (keyLockInfo !== undefined) {
    updateQuery += `Keylock = ?, `;
    values.push(keyLockInfo);
  }
  if (maxKW !== undefined) {
    updateQuery += `MaxKW = ?, `;
    values.push(maxKW);
  }
  if (maxWeight !== undefined) {
    updateQuery += `MaxWeight = ?, `;
    values.push(maxWeight);
  }
  if (dateOfInstallation !== undefined) {
    updateQuery += `InstallationDate = ?, `;
    const installationDate = dateOfInstallation ? new Date(dateOfInstallation) : null;
    values.push(installationDate);
  }
  if (mapX1 !== undefined) {
    updateQuery += `MapX1 = ?, `;
    values.push(mapX1);
  }
  if (mapX2 !== undefined) {
    updateQuery += `MapX2 = ?, `;
    values.push(mapX2);
  }
  if (mapY1 !== undefined) {
    updateQuery += `MapY1 = ?, `;
    values.push(mapY1);
  }
  if (mapY2 !== undefined) {
    updateQuery += `MapY2 = ?, `;
    values.push(mapY2);
  }
  if (notes !== undefined) {
    updateQuery += `Notes = ?, `;
    values.push(notes);
  }

  // Remove the last comma and add WHERE clause
  updateQuery = updateQuery.slice(0, -2) + ` WHERE CabinetID = ?`;
  values.push(cabinetID);

  // Execute the query
  db.query(updateQuery, values, (err, results) => {
    if (err) {
      console.error('Error updating cabinet:', err);
      return res.status(500).json({ error: 'Failed to update cabinet' });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({ error: 'No cabinet found with the provided cabinetID' });
    }

    res.json({ success: true, message: 'Cabinet updated successfully' });
  });
};

// Add a new cabinet record with auto-increment CabinetID
exports.addCabinet = (req, res) => {
  console.log('Received body for insert:', req.body);
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

  const installationDate = dateOfInstallation ? new Date(dateOfInstallation) : null;

  // Query to fetch MapX1, MapX2, MapY1, MapY2 values from the fac_zone table based on the zone
  const zoneQuery = `
    SELECT MapX1, MapX2, MapY1, MapY2 
    FROM fac_zone 
    WHERE Description = ? 
    LIMIT 1
  `;

  db.query(zoneQuery, [zone], (zoneErr, zoneResults) => {
    if (zoneErr) {
      console.error('Error fetching zone map coordinates:', zoneErr);
      return res.status(500).json({ error: 'Failed to fetch zone map coordinates' });
    }

    if (zoneResults.length === 0) {
      return res.status(404).json({ error: 'No zone found with the provided description' });
    }

    const { MapX1, MapX2, MapY1, MapY2 } = zoneResults[0];

    // Query to insert the new cabinet record
    const insertQuery = `
      INSERT INTO fac_cabinet (
        Location, LocationSortable, DataCenterID, AssignedTo, ZoneID, CabRowID, 
        CabinetHeight, U1Position, FrontEdge, Model, Keylock, MaxKW, MaxWeight, 
        InstallationDate, Notes, MapX1, MapX2, MapY1, MapY2
      ) VALUES (
        ?, ?, 
        (SELECT DataCenterID FROM fac_datacenter WHERE Name = ? LIMIT 1), 
        ${assignedTo ? `(SELECT DeptID FROM fac_department WHERE Name = ? LIMIT 1)` : 'NULL'}, 
        (SELECT ZoneID FROM fac_zone WHERE Description = ? LIMIT 1), 
        (SELECT CabRowID FROM fac_cabrow WHERE Name = ? LIMIT 1),
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
    `;

    const values = [
      location, // Location
      location, // LocationSortable (same as Location)
      dataCenter, // DataCenterID
      assignedTo, // AssignedTo (conditional query if provided)
      zone, // ZoneID
      cabinetRow, // CabRowID
      cabinetHeight, // CabinetHeight
      u1Position, // U1Position
      u1Position, // FrontEdge (same as U1Position)
      model, // Model
      keyLockInfo, // Keylock
      maxKW, // MaxKW
      maxWeight, // MaxWeight
      installationDate, // InstallationDate
      notes, // Notes
      MapX1, // MapX1 from fac_zone
      MapX2, // MapX2 from fac_zone
      MapY1, // MapY1 from fac_zone
      MapY2, // MapY2 from fac_zone
    ];

    db.query(insertQuery, values, (insertErr, results) => {
      if (insertErr) {
        console.error('Error inserting cabinet:', insertErr);
        return res.status(500).json({ error: 'Failed to insert cabinet' });
      }

      res.json({ success: true, message: 'Cabinet added successfully', insertedId: results.insertId });
    });
  });
};

