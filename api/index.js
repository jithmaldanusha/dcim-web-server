//index.js
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Import routes
const sessionRoutes = require('../routes/sessionRoutes')
const cabinetRoutes = require('../routes/cabinetRoutes');
const dataCenterRoutes = require('../routes/dataCenterRoutes');
const departmentRoutes = require('../routes/departmentRoutes');
const zoneRoutes = require('../routes/zoneRoutes');
const cabinetRowRoutes = require('../routes/cabinetrowsRoutes');
const tagRoutes = require('../routes/tagRoutes');

// Use routes
app.use('/api/sessions', sessionRoutes);
app.use('/api/cabinets', cabinetRoutes);
app.use('/api/datacenters', dataCenterRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/zones', zoneRoutes);
app.use('/api/cabinetrows', cabinetRowRoutes);
app.use('/api/tags', tagRoutes);

// Start the server
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
