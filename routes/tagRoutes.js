const express = require('express');
const router = express.Router();
const tagController = require('../controllers/tagsController');

// Define the GET endpoint for fetching tags
router.get('/', tagController.getTags);

module.exports = router;
