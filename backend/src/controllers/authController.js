const User = require("../models/user");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const registerUser = async (req, res) => {
    try {
        const { name,email,password,role = "passenger",phone,vehicleNumber,vehicleModel,licenseNumber} = req.body;

        if (!name || !email || !password || !role) {
            return res.status(400).json({
                success: false,
                message: "Name, email, password and role are required"
            });
        }

        if (!["driver", "passenger"].includes(role)) {
            return res.status(400).json({
                success: false,
                message: "Role must be either driver or passenger"
            });
        }

        if (role === "driver" && (!vehicleNumber || !vehicleModel || !licenseNumber)) {
            return res.status(400).json({
                success: false,
                message: "Driver registration requires vehicle number, model, and license number"
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Invalid email address"
            });
        }

        const userExists = await User.findOne({ email });

        if (userExists) {
            return res.status(400).json({
                success: false,
                message: "User already exists"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({name,email,password: hashedPassword,role,phone,
            ...(role === "driver" ? { vehicleNumber, vehicleModel, licenseNumber } : {}),
        });

        await newUser.save();

        const token = jwt.sign(
            { userId: newUser._id },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        return res.status(201).json({
            success: true,
            token,
            user: {
                id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
                phone: newUser.phone,
                isOnline: newUser.isOnline,
                vehicleNumber: newUser.vehicleNumber,
                vehicleModel: newUser.vehicleModel,
                licenseNumber: newUser.licenseNumber,
            }
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const loginUser = async (req, res) => {
    console.log("REGISTER CONTROLLER HIT");
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        const isMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        return res.status(200).json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                isOnline: user.isOnline
            }
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};



module.exports = {
    registerUser,
    loginUser
};