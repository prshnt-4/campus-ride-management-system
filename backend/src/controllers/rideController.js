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

        return res.status(201).json({ success: true,message: "Ride created successfully", ride: newRide });
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


module.exports = { createRide, getAllRides, getMyRides };
