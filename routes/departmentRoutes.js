const express = require('express');
const router = express.Router();
const departmentController = require('../controllers/departmentController');

// Define the GET endpoint for fetching departments
router.get('/', departmentController.getDepartments);

module.exports = router;
