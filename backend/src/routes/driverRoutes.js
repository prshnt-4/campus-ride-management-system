const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const { onlineStatus, offlineStatus, getAvailableDrivers } = require("../controllers/driverController");

router.put("/online", authMiddleware, onlineStatus);
router.put("/offline", authMiddleware, offlineStatus);
router.get("/available", getAvailableDrivers);
router.get("/online-drivers", getAvailableDrivers);

module.exports = router;