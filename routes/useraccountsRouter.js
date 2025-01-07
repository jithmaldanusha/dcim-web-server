const express = require("express");
const router = express.Router();
const userAccountController = require('../controllers/useraccountsController')

router.get("/", userAccountController.getUser)
router.post("/update-username", userAccountController.updateUsername);
router.post("/update-email", userAccountController.updateEmail);
router.post("/update-password", userAccountController.updatePassword);
router.post("/update-role", userAccountController.updateRole);

router.get("/getusers", userAccountController.getUsers)
router.post("/addnewuser", userAccountController.addUser)
router.post("/removeuser", userAccountController.removeUser)

module.exports = router;
