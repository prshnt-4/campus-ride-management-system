const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const { createRide, getAllRides, getMyRides } = require("../controllers/rideController");

router.post("/create", authMiddleware, createRide);
router.get("/", getAllRides);
router.get("/my-rides", authMiddleware, getMyRides);

module.exports = router;