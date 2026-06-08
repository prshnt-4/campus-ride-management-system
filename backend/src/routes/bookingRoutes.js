const express = require("express");
const router = express.Router();

const { createBooking, getMyBookings, getRideBookings, acceptBooking, rejectBooking, cancelBooking} = require("../controllers/bookingController");
const authMiddleware = require("../middleware/authMiddleware");



router.post("/book/:rideId", authMiddleware, createBooking);
router.get("/my-bookings", authMiddleware, getMyBookings);
router.get("/ride/:rideId", authMiddleware, getRideBookings);
router.put("/accept/:bookingId", authMiddleware, acceptBooking);
router.put("/reject/:bookingId", authMiddleware, rejectBooking);
router.delete("/cancel/:bookingId", authMiddleware, cancelBooking);



module.exports = router;