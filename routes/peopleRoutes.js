const express = require('express');
const router = express.Router();
const peopleController = require("../controllers/peopleController")

// Define the GET endpoint for fetching cabinet rows
router.get('/', peopleController.getPrimaryContacts);

module.exports = router;
