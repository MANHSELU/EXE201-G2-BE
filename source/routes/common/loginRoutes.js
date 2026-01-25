const loginController = require("../../controller/common/loginController");
const express = require("express");
const router = express.Router();


router.post("/login", loginController.loginController);

module.exports = router;