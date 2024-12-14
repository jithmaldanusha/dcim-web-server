const express = require('express');
const router = express.Router();
const cabinetrowsController = require('../controllers/cabinetrowsController');

// Define the GET endpoint for fetching cabinet rows
router.get('/', cabinetrowsController.getCabinetRows);

module.exports = router;
