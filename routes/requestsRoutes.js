const express = require('express');
const router = express.Router();
const requestController = require('../controllers/requestController')

router.get('/getStatus/:requestID',requestController.getRequestStatus);
router.post('/updateStatus/:reqID', requestController.updateRequestStatus);

module.exports = router;