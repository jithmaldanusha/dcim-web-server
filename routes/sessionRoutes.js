//session routes
const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/sessionController')
const authenticate = require('../middleware/authenticate')

router.post('/createSuper', sessionController.createSuper)
router.get('/checkUsers', sessionController.checkUserTable)
router.post('/login', sessionController.Login);
router.post('/logout', sessionController.Logout);

router.get('/validate-token', authenticate, sessionController.validateToken); 

module.exports = router;