const express = require('express');
const router = express.Router();
const zoneController = require('../controllers/zoneController');

// Define the GET endpoint for fetching zones
router.get('/', zoneController.getZones);

module.exports = router;
