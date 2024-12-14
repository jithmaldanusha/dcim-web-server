const express = require('express');
const router = express.Router();
const cabinetController = require('../controllers/cabinetController')

// Define the GET endpoint for fetching cabinets
router.get('/', cabinetController.getCabinets);
router.get('/getCabinetById/:location', cabinetController.getCabinetByLocation);
router.post('/updateCabinet', cabinetController.updateCabinet);
router.post('/addCabinet', cabinetController.addCabinet);

module.exports = router;
