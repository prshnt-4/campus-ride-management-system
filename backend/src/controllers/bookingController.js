const Booking = require("../models/Booking");
const Ride = require("../models/Ride");

const createBooking = async (req, res) => {
    try {
        const { rideId } = req.params;
        
        const ride = await Ride.findById(rideId);

        if(!ride) { 
            return res.status(404).json({ success: false, message: "Ride not found" });
        }

        if(ride.seatsAvailable <= 0) {
            return res.status(400).json({ success: false, message: "No seats available" });
        }

        const newBooking = new Booking({
            rideId,
            passengerId: req.userId
        });

        await newBooking.save();

        ride.seatsAvailable -= 1;

    
        await ride.save(); 


        res.status(201).json({ success: true, message: "Booking created successfully", booking: newBooking });

    }catch (error) {    
        res.status(500).json({
            success: false,
            message: error.message
        })
    }
};

const getMyBookings = async (req, res) => {
    try {
        const bookings = await Booking.find({ passengerId: req.userId }).populate("rideId");
        res.json({ success: true, bookings });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

const getRideBookings = async (req, res) => {
    try {
        const bookings = await Booking.find({ rideId: req.params.rideId }).populate("passengerId", "name email");
        res.json({ success: true, bookings });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


const acceptBooking = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.bookingId).populate("rideId");

        if (!booking) {
            return res.status(404).json({ success: false, message: "Booking not found" });
        }

        booking.status = "accepted";

        await booking.save();

        res.json({ success: true, message: "Booking accepted", booking });
    } catch (error) {   
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const rejectBooking = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.bookingId).populate("rideId");

        if (!booking) {
            return res.status(404).json({ success: false, message: "Booking not found" });
        }

        booking.status = "rejected";

        await booking.save();

        res.json({ success: true, message: "Booking rejected", booking });
    } catch (error) {    
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


const cancelBooking = async (req, res) => {
    try {
        
        const booking = await Booking.findById(req.params.bookingId).populate("rideId");

        if (!booking) {
            return res.status(404).json({ success: false, message: "Booking not found" });
        }

        const rideId = booking.rideId?._id || booking.rideId;
        const ride = rideId ? await Ride.findById(rideId) : null;

        if (ride) {
          
            ride.seatsAvailable += 1;
            
            await ride.save();
        }

        await Booking.deleteOne({ _id: booking._id });

        res.json({ success: true, message: "Booking cancelled successfully" });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = { createBooking, getMyBookings , getRideBookings, acceptBooking, rejectBooking, cancelBooking };
