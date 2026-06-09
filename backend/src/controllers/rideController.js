const mongoose = require("mongoose");
const Ride = require("../models/Ride");

const createRide = async (req, res) => {
    try {
        const { from, to, date, time, seatsAvailable } = req.body;

        const newRide = new Ride({
            from,
            to,
            date,
            time,
            seatsAvailable,
            driverId: req.userId
        });

        await newRide.save();

        return res.status(201).json({ success: true, message: "Ride created successfully", ride: newRide });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const getAllRides = async (req, res) => {
    try {
        const rides = await Ride.find();
        return res.status(200).json({ success: true, rides });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};


const getMyRides = async (req, res) => {
    try {
        const rides = await Ride.find({ driverId: req.userId });

        res.json({ success: true, rides });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


const startRide = async (req, res) => {
    try {
        const { rideId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(rideId)) {
            return res.status(400).json({ success: false, message: "Invalid rideId" });
        }

        const ride = await Ride.findOneAndUpdate(
            { _id: rideId, driverId: req.userId },
            { status: "in-progress" },
            { returnDocument: "after" }
        );

        if (!ride) {
            return res.status(404).json({ success: false, message: "Ride not found or not owned by authenticated user" });
        }

        res.status(200).json({
            success: true,
            message: "Ride started",
            ride
         });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const completeRide = async (req, res) => {
    try {
        const { rideId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(rideId)) {
            return res.status(400).json({ success: false, message: "Invalid rideId" });
        }

        const ride = await Ride.findOneAndUpdate(
            { _id: rideId, driverId: req.userId },
            { status: "completed" },
            { returnDocument: "after" }
        );

        if (!ride) {
            return res.status(404).json({ success: false, message: "Ride not found or not owned by authenticated user" });
        }

        res.status(200).json({
            success: true,
            message: "Ride completed",
            ride
         });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
         });
    }
};

const cancelRide = async (req, res) => {
    try {
        const { rideId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(rideId)) {
            return res.status(400).json({ success: false, message: "Invalid rideId" });
        }

        const ride = await Ride.findOneAndUpdate(
            { _id: rideId, driverId: req.userId },
            { status: "cancelled" },
            { returnDocument: "after" }
        );

        if (!ride) {
            return res.status(404).json({ success: false, message: "Ride not found or not owned by authenticated user" });
        }

        res.status(200).json({
            success: true,
            message: "Ride cancelled",
            ride
         });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
         });
    }
};


module.exports = { createRide, getAllRides, getMyRides, startRide, cancelRide, completeRide };
