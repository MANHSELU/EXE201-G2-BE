const express = require("express");
const router = express.Router();

const lecturerCheckedRoutes = require("./lectuer.check.routes");

// Prefix: /api/lecturer
router.use("/", lecturerCheckedRoutes);

module.exports = router;

