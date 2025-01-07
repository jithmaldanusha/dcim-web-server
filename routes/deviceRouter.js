const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/devicesController')

// Existing routes
router.post('/bulkImport', deviceController.bulkImportDevices);
router.get('/getModelsByManufacturer/:manufacturer', deviceController.getModelsByManufacturer);

// New route for email approval
router.post('/requestApproval', deviceController.sendApprovalEmail);

module.exports = router;
