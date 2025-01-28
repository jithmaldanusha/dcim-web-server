const express = require('express');
const router = express.Router();
const cabinetController = require('../controllers/cabinetController')

// Define the GET endpoint for fetching cabinets
router.get('/', cabinetController.getCabinets);
router.get('/getCabinetById/:id', cabinetController.getCabinetByID);
router.get('/getCabinetsByDatacenter/:datacenter', cabinetController.getCabinetsByDataCenter);
router.put('/updateCabinet/:cabinetID', cabinetController.updateCabinet);
router.post('/addCabinet', cabinetController.addCabinet);
router.delete('/deleteCabinet/:cabinetID', cabinetController.deleteCabinet);

router.post('/requestAddApproval', cabinetController.sendAddApprovalEmail);
router.post('/requestDeleteApproval', cabinetController.sendDeleteApprovalEmail);

module.exports = router;
