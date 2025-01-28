const express = require('express');
const router = express.Router();
const manufacturerController = require('../controllers/manufacturerController')

// Define the GET endpoint for fetching data centers
router.get('/', manufacturerController.getDataManufacturers);

module.exports = router;
