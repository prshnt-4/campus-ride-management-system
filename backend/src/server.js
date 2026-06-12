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
const liveDrivers = new Map();
const liveRides = new Map();


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
        origin: "*",
        methods: ["GET", "POST"]
    }
});

function sharedState() {
    const drivers = Object.fromEntries(
        Array.from(liveDrivers.entries()).map(([driverId, driver]) => {
            const occupiedSeats = Array.from(liveRides.values())
                .filter(ride =>
                    ride.driverId === driverId &&
                    ["accepted", "scheduled_accepted", "at_pickup", "in_progress"].includes(ride.status)
                )
                .reduce((total, ride) => {
                    const seats = Number(ride.seatsRequired || ride.passengerCount || 1);
                    return Math.min(4, total + Math.max(1, seats));
                }, 0);

            return [driverId, {
                ...driver,
                totalSeats: 4,
                occupiedSeats,
                availableSeats: 4 - occupiedSeats
            }];
        })
    );

    return {
        drivers,
        rides: Array.from(liveRides.values())
    };
}

function emitSharedState(target = io) {
    target.emit("shared-state-update", sharedState());
}

function updateRide(rideId, updates) {
    if (!rideId) return null;
    const existing = liveRides.get(rideId) || { id: rideId };
    const updated = { ...existing, ...updates, id: rideId, updatedAt: Date.now() };
    liveRides.set(rideId, updated);
    return updated;
}

io.on("connection", (socket) => {
    console.log("New client connected: " + socket.id);
    emitSharedState(socket);

    socket.on("request-shared-state", () => {
        emitSharedState(socket);
    });

    socket.on("driver-status", (data) => {
        if (!data?.driverId) return;
        const existing = liveDrivers.get(data.driverId) || {};
        const driver = {
            ...existing,
            ...data,
            id: data.driverId,
            updatedAt: Date.now()
        };
        liveDrivers.set(data.driverId, driver);
        socket.data.driverId = data.driverId;
        emitSharedState();
        io.emit("driver-status-update", driver);
    });

    socket.on("ride-request", (ride) => {
        if (!ride?.id) return;
        liveRides.set(ride.id, ride);
        emitSharedState();
        io.emit("ride-request-update", ride);
    });

    socket.on("ride-scheduled", (ride) => {
        if (!ride?.id) return;
        liveRides.set(ride.id, ride);
        emitSharedState();
        io.emit("ride-scheduled-update", ride);
    });

    socket.on("wallet-update", (data) => {
        io.emit("wallet-update-event", data);
    });

    socket.on("ride-accepted", (ride) => {
        const updatedRide = updateRide(ride?.rideId, {
            ...ride,
            status: ride?.status || "accepted",
            acceptedAt: Date.now()
        });
        emitSharedState();
        io.emit("ride-accepted-update", updatedRide);
    });

    socket.on("ride-started", (ride) => {
        const updatedRide = updateRide(ride?.rideId, {
            ...ride,
            status: "in_progress",
            startedAt: Date.now()
        });
        emitSharedState();
        io.emit("ride-started-update", updatedRide);
    });

    socket.on("ride-arrived", (ride) => {
        const updatedRide = updateRide(ride?.rideId, {
            ...ride,
            status: "at_pickup",
            arrivedAt: Date.now()
        });
        emitSharedState();
        io.emit("ride-arrived-update", updatedRide);
    });

    socket.on("ride-completed", (ride) => {
        const updatedRide = updateRide(ride?.rideId, {
            ...ride,
            status: "completed",
            completedAt: Date.now()
        });
        emitSharedState();
        io.emit("ride-completed-update", updatedRide);
    });

    socket.on("ride-cancelled", (ride) => {
        const rideId = ride?.rideId || ride?.id;
        const updatedRide = updateRide(rideId, {
            ...ride,
            status: "cancelled"
        });
        emitSharedState();
        io.emit("ride-cancelled-update", updatedRide);
    });

    socket.on("disconnect", () => {
        console.log("Client disconnected: " + socket.id);
        const driverId = socket.data.driverId;
        if (driverId && liveDrivers.has(driverId)) {
            const driver = {
                ...liveDrivers.get(driverId),
                isOnline: false,
                updatedAt: Date.now()
            };
            liveDrivers.set(driverId, driver);
            emitSharedState();
            io.emit("driver-status-update", driver);
        }
    });

    socket.on("driver-location", (data) => {
        if (!data?.driverId) return;
        const existing = liveDrivers.get(data.driverId) || { id: data.driverId };
        const driver = {
            ...existing,
            coords: [data.lat, data.lng],
            updatedAt: Date.now()
        };
        liveDrivers.set(data.driverId, driver);
        socket.data.driverId = data.driverId;
        emitSharedState();
        io.emit("driver-location-update", driver);
    });

});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
