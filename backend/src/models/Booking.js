const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
    rideId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Ride",    
        required: true
    },
    passengerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    status: {
        type: String,
        enum: ["pending", "accepted", "rejected"],
        default: "pending"}
},{
    timestamps: true
});

module.exports = mongoose.model("Booking", bookingSchema)