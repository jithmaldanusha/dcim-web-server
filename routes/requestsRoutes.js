const express = require('express');
const router = express.Router();
const requestController = require('../controllers/requestController')

router.get('/getStatus/:requestID',requestController.getRequestStatus);
router.get('/pendingRequests',requestController.getPendingRequests);
router.get('/rejectedRequests',requestController.getRejectedRequests)
router.post('/updateStatus/:reqID', requestController.updateRequestStatus);

module.exports = router;