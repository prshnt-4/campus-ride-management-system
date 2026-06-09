const User = require("../models/user");

const onlineStatus = async (req, res) => {
    try {
        const driver = await User.findOneAndUpdate(
            { _id: req.userId, role: "driver" },
            { isOnline: true, lastOnline: new Date() },
            { returnDocument: "after" }
        );

        if (!driver) {
            return res.status(404).json({ success: false, message: "Driver not found or not authorized" });
        }

        res.json({ success: true, message: "Driver is now online", driver });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const offlineStatus = async (req, res) => {
    try {
        const driver = await User.findOneAndUpdate(
            { _id: req.userId, role: "driver" },
            { isOnline: false, lastOnline: new Date() },
            { returnDocument: "after" }
        );

        if (!driver) {
            return res.status(404).json({ success: false, message: "Driver not found or not authorized" });
        }

        res.status(200).json({ success: true, message: "Driver is now offline", driver });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const getAvailableDrivers = async (req, res) => {
    try {
        const onlineDrivers = await User.find({ role: "driver", isOnline: true }).select("-password -__v");

        res.status(200).json({ success: true, onlineDrivers });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};




module.exports = { onlineStatus, offlineStatus, getAvailableDrivers };