const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/devicesController')

// Existing routes
router.get('/deviceStatus', deviceController.getDeviceStatus)
router.post('/addDevice', deviceController.addDevice);
router.get('/getModelsByManufacturer/:manufacturer', deviceController.getModelsByManufacturer);
router.get('/getDevicesByCabinet/:cabinetID', deviceController.getDevicesByCabinet);
router.get('/getDeviceById/:deviceID', deviceController.getDeviceById);
router.put('/updateDevice/:deviceID', deviceController.updateDevice);
router.delete('/deleteDevice/:deviceID', deviceController.deleteDevice);

router.post('/bulkImport', deviceController.bulkImportDevices);
router.post('/bulkDeviceApproval', deviceController.sendBulkDeviceApprovalEmail);
router.post('/deviceAddApproval', deviceController.sendDeviceAddApprovalEmail);
router.post('/deviceUpdateApproval', deviceController.sendDeviceUpdateApprovalEmail);

module.exports = router;
