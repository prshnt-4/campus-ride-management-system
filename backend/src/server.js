const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const rideRoutes = require("./routes/rideRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const driverRoutes = require("./routes/driverRoutes");



dotenv.config();

connectDB();

const app = express();
const http = require("http")
const { Server } = require("socket.io");
const server = http.createServer(app);


app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "Campus Ride Backend Running"
    });
});

const PORT = process.env.PORT || 5001;

app.use("/api/auth", authRoutes);
app.use("/api/rides", rideRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/drivers", driverRoutes);

const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://campus-ride-management-system-8r6s.vercel.app"
    ],
    methods: ["GET", "POST", "PUT"]
  }
});

io.on("connection", (socket) => {
    console.log("New client connected: " + socket.id);

    socket.on("driver-status", (data) => {
        io.emit("driver-status-update", data);
    }),

    socket.on("ride-request", (ride) => {
        io.emit("ride-request-update", ride);
    });

    socket.on("ride-scheduled", (ride) => {
        io.emit("ride-scheduled-update", ride);
    });

    socket.on("wallet-update", (data) => {
        io.emit("wallet-update-event", data);
    });

    socket.on("ride-accepted", (ride) => {
        io.emit("ride-accepted-update", ride);
    });

    socket.on("ride-started", (ride) => {
        io.emit("ride-started-update", ride);
    });

    socket.on("ride-arrived", (ride) => {
        io.emit("ride-arrived-update", ride);
    });

    socket.on("ride-completed", (ride) => {
        io.emit("ride-completed-update", ride);
    });

    socket.on("ride-cancelled", (ride) => {
        io.emit("ride-cancelled-update", ride);
    });

    socket.on("disconnect", () => {
        console.log("Client disconnected: " + socket.id);
    });

    socket.on("driver-location", (data) => {
        console.log("LOCATION:", data);

        io.emit("driver-location-update", data);
    });

});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
