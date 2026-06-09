const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ["passenger", "driver"],
        default: "passenger"
    },
    phone: {
        type: String,
        default: null
    },
    vehicleNumber: {
        type: String,
        default: null
    },
    vehicleModel: {
        type: String,
        default: null
    },
    licenseNumber: {
        type: String,
        default: null
    },
    isOnline: {
        type: Boolean,
        default: false
    },
},
    {
        timestamps: true
    });






module.exports = mongoose.model('User', userSchema);