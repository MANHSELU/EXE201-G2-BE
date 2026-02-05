const express = require("express");
const router = express.Router();
const adminCheckedRoutes = require("./admin.check.routes");

// Prefix: /api/admin
router.use("/", adminCheckedRoutes);

module.exports = router;
