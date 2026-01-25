const express = require("express");
const router = express.Router();

const studentCheckedRoutes = require("./student.check.routes");

// Prefix: /api/student
router.use("/", studentCheckedRoutes);

module.exports = router;

