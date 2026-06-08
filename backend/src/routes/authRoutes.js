const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");

const {
  registerUser,
  loginUser
} = require("../controllers/authController");


router.post("/register", registerUser);
router.post("/login", loginUser);


router.get("/profile", authMiddleware, async (req, res) => {
    res.json({
        success: true,
        message: "Protected Route Accessed",
        userId: req.userId
    });
});


module.exports = router;