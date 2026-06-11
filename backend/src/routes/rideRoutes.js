console.log("Ride Routes Loaded");

const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const { createRide, getAllRides, getMyRides, startRide, completeRide, cancelRide } = require("../controllers/rideController");

router.post("/create", authMiddleware, createRide);
router.get("/", getAllRides);
router.get("/my-rides", authMiddleware, getMyRides);
router.put("/start/:rideId", authMiddleware, startRide);
router.post("/start/:rideId", authMiddleware, startRide);
router.put("/complete/:rideId", authMiddleware, completeRide);
router.post("/complete/:rideId", authMiddleware, completeRide);
router.put("/cancel/:rideId", authMiddleware, cancelRide);
router.post("/cancel/:rideId", authMiddleware, cancelRide);

module.exports = router;