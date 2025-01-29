//index.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const app = express();
require('dotenv').config();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());
app.use(express.json());

// Import routes
const sessionRoutes = require('../routes/sessionRoutes');
const userAccountRoutes = require('../routes/useraccountsRouter');
const cabinetRoutes = require('../routes/cabinetRoutes');
const dataCenterRoutes = require('../routes/datacenterRoutes');
const departmentRoutes = require('../routes/departmentRoutes');
const zoneRoutes = require('../routes/zoneRoutes');
const cabinetRowRoutes = require('../routes/cabinetrowsRoutes');
const tagRoutes = require('../routes/tagRoutes');
const deviceRoutes = require('../routes/deviceRouter')
const manufacturersRoutes = require('../routes/manufacturerRoutes');
const peopleRoutes = require('../routes/peopleRoutes');
const requestRoutes = require('../routes/requestsRoutes');

// Use routes
app.use('/api/sessions', sessionRoutes);
app.use("/api/useraccounts", userAccountRoutes);
app.use('/api/cabinets', cabinetRoutes);
app.use('/api/datacenters', dataCenterRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/zones', zoneRoutes);
app.use('/api/cabinetrows', cabinetRowRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/manufacturers', manufacturersRoutes);
app.use('/api/people', peopleRoutes);
app.use('/api/requests', requestRoutes)

// Start the server
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server is running on http://${process.env.DB_HOST}:${PORT}`);
});
