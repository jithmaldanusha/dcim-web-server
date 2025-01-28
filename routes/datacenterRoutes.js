const express = require('express');
const router = express.Router();
const dataCenterController = require('../controllers/datacenterController');

// Define the GET endpoint for fetching data centers
router.get('/', dataCenterController.getDataCenters);

module.exports = router;
