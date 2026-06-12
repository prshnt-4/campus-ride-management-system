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
const liveRatings = new Map();
const liveWallets = new Map();


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
        rides: Array.from(liveRides.values()),
        ratings: Object.fromEntries(liveRatings),
        wallets: Object.fromEntries(liveWallets)
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

    socket.on("wallet-register", ({ userId, balance }) => {
        if (!userId || liveWallets.has(userId)) return;
        liveWallets.set(userId, Math.max(0, Number(balance) || 0));
        emitSharedState();
    });

    socket.on("wallet-add", ({ userId, amount }) => {
        if (!userId || Number(amount) <= 0) return;
        const balance = liveWallets.get(userId) || 0;
        liveWallets.set(userId, balance + Number(amount));
        emitSharedState();
        io.emit("wallet-update-event", { userId, balance: liveWallets.get(userId) });
    });

    socket.on("wallet-withdraw", ({ userId, amount }) => {
        if (!userId || Number(amount) <= 0) return;
        const balance = liveWallets.get(userId) || 0;
        if (balance < Number(amount)) return;
        liveWallets.set(userId, balance - Number(amount));
        emitSharedState();
        io.emit("wallet-update-event", { userId, balance: liveWallets.get(userId) });
    });

    socket.on("rating-submitted", (rating) => {
        if (!rating?.driverId || !rating?.rideId || !rating?.stars) return;

        const driverRatings = liveRatings.get(rating.driverId) || [];
        const withoutDuplicate = driverRatings.filter(item => item.rideId !== rating.rideId);
        const updatedRatings = [...withoutDuplicate, {
            ...rating,
            createdAt: rating.createdAt || Date.now()
        }];
        liveRatings.set(rating.driverId, updatedRatings);

        const average = (
            updatedRatings.reduce((sum, item) => sum + Number(item.stars), 0) /
            updatedRatings.length
        ).toFixed(1);

        if (liveDrivers.has(rating.driverId)) {
            liveDrivers.set(rating.driverId, {
                ...liveDrivers.get(rating.driverId),
                rating: average,
                updatedAt: Date.now()
            });
        }

        updateRide(rating.rideId, { rated: true });
        emitSharedState();
        io.emit("rating-update", {
            driverId: rating.driverId,
            rating: average,
            review: rating
        });
    });

    socket.on("rating-skipped", ({ rideId }) => {
        if (!rideId) return;
        const updatedRide = updateRide(rideId, { ratingSkipped: true });
        emitSharedState();
        io.emit("rating-update", { rideId, ratingSkipped: true, ride: updatedRide });
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
        const existingRide = liveRides.get(ride?.rideId);
        if (!existingRide) return;

        const fare = Number(
            ride?.fare ||
            10 * Number(existingRide.passengerCount || existingRide.seatsRequired || 1)
        );
        const passengerId = ride?.passengerId || existingRide.passengerId;
        const driverId = ride?.driverId || existingRide.driverId;
        let paymentStatus = existingRide.paymentStatus;

        if (!existingRide.paymentProcessed && passengerId && driverId && fare > 0) {
            const passengerBalance = liveWallets.get(passengerId) || 0;
            if (passengerBalance >= fare) {
                liveWallets.set(passengerId, passengerBalance - fare);
                liveWallets.set(driverId, (liveWallets.get(driverId) || 0) + fare);
                paymentStatus = "paid";
            } else {
                paymentStatus = "insufficient_funds";
            }
        }

        const updatedRide = updateRide(ride?.rideId, {
            ...ride,
            status: "completed",
            completedAt: Date.now(),
            fare,
            paymentProcessed: paymentStatus === "paid",
            paymentStatus
        });
        emitSharedState();
        io.emit("ride-completed-update", updatedRide);
        io.emit("wallet-update-event", {
            passengerId,
            driverId,
            fare,
            paymentStatus
        });
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
