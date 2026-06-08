const mongoose = require("mongoose");

const rideSchema = new mongoose.Schema({
    from: {
        type: String,
        required: true
    },
    to: {
        type: String,
        required: true

    },
    date: {
        type: String,
        required: true
    },
    time: {
        type: String,
        required: true
    },
    seatsAvailable: {
        type: Number,
        required: true
    },
    driverId: {
        type: String,
        required: true

    }
},{
   timestamps: true
}
);

module.exports = mongoose.model("Ride", rideSchema)