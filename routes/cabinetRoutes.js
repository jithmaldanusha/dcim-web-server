const express = require('express');
const router = express.Router();
const cabinetController = require('../controllers/cabinetController')

// Define the GET endpoint for fetching cabinets
router.get('/', cabinetController.getCabinets);
router.get('/getCabinetById/:location', cabinetController.getCabinetByLocation);
router.get('/getCabinetsByDatacenter/:datacenter', cabinetController.getCabinetsByDataCenter);
router.put('/updateCabinet/:cabinetID', cabinetController.updateCabinet);
router.post('/addCabinet', cabinetController.addCabinet);
router.delete('/deleteCabinet/:cabinetID', cabinetController.deleteCabinet);

module.exports = router;
