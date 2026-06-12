// src/store/rideStore.js
// Simulates real-time state using localStorage
// Replace with Socket.IO calls when backend is ready
// Every method maps directly to a backend API/socket event

const DRIVERS_KEY = "rnn_d";
const RIDES_KEY = "rnn_r";
const USERS_KEY = "rnn_u"; // For Wallet and User data

function read(key) { try { return JSON.parse(localStorage.getItem(key) || "{}"); } catch { return {}; } }
function readArr(key) { try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; } }
function write(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

function uid() { return Math.random().toString(36).slice(2, 10); }

// driver coords spread across campus for demo
const DEMO_COORDS = [
  [29.8660, 77.8942], [29.8680, 77.8960], [29.8645, 77.8975],
  [29.8695, 77.8935], [29.8670, 77.8990],
];

const TOTAL_SEATS = 4;

function rideSeats(ride) {
  const requested = Number(ride?.seatsRequired ?? ride?.passengerCount ?? 1);
  const validSeats = Number.isFinite(requested) ? requested : 1;
  return Math.min(TOTAL_SEATS, Math.max(1, Math.ceil(validSeats)));
}

function normalizeDriver(driver = {}) {
  const totalSeats = TOTAL_SEATS;
  let occupiedSeats = Number(driver.occupiedSeats);

  if (!Number.isFinite(occupiedSeats)) {
    const oldAvailable = Number(driver.seatsAvailable);
    occupiedSeats = Number.isFinite(oldAvailable) ? totalSeats - oldAvailable : 0;
  }

  occupiedSeats = Math.min(totalSeats, Math.max(0, occupiedSeats));
  return {
    ...driver,
    totalSeats,
    occupiedSeats,
    availableSeats: totalSeats - occupiedSeats,
  };
}

function occupiedSeatsForDriver(driverId) {
  return readArr(RIDES_KEY)
    .filter(ride =>
      ride.driverId === driverId &&
      ["accepted", "scheduled_accepted", "at_pickup", "in_progress"].includes(ride.status)
    )
    .reduce((total, ride) => Math.min(TOTAL_SEATS, total + rideSeats(ride)), 0);
}

function currentDriver(driver) {
  const normalized = normalizeDriver(driver);
  if (!normalized.id) return normalized;
  const occupiedSeats = occupiedSeatsForDriver(normalized.id);
  return {
    ...normalized,
    occupiedSeats,
    availableSeats: normalized.totalSeats - occupiedSeats,
  };
}

export const rideStore = {

  // ── DRIVER STATUS ──────────────────────────────────────────────

  setDriverOnline(driverId, name, vehicle, isOnline) {
    const all = read(DRIVERS_KEY);
    const prev = currentDriver(all[driverId]);
    const idx = DEMO_COORDS[Object.keys(all).length % DEMO_COORDS.length];

    all[driverId] = {
      ...prev,
      id: driverId,
      name,
      vehicle,
      isOnline,
      rating: prev.rating || "4.8",
      coords: isOnline ? (prev.coords || idx) : null,
      updatedAt: Date.now(),
      totalSeats: TOTAL_SEATS,
      occupiedSeats: prev.occupiedSeats,
      availableSeats: TOTAL_SEATS - prev.occupiedSeats,
    };
    write(DRIVERS_KEY, all);
  },

  getDriverStatus(driverId) {
    const driver = read(DRIVERS_KEY)[driverId];
    return driver ? currentDriver(driver) : null;
  },

  getOnlineDrivers() {
    const all = read(DRIVERS_KEY);
    return Object.values(all).filter(d => d.isOnline).map(currentDriver);
  },

  getAvailableDrivers(seatsRequired = 1) {
    const required = rideSeats({ seatsRequired });
    return this.getOnlineDrivers().filter(driver => driver.availableSeats >= required);
  },

  canDriverAcceptRide(driverId, ride) {
    if (!ride || ride.status !== "requesting") return false;
    const driver = this.getDriverStatus(driverId);
    return Boolean(
      driver?.isOnline &&
      driver.availableSeats >= rideSeats(ride) &&
      !(ride.rejectedBy || []).includes(driverId)
    );
  },

  updateDriverLocation(driverId, lat, lng) {
    const all = read(DRIVERS_KEY);

    if (!all[driverId]) return;

    all[driverId].coords = [lat, lng];
    all[driverId].updatedAt = Date.now();

    write(DRIVERS_KEY, all);

  },

  // ── RIDE LIFECYCLE ─────────────────────────────────────────────

  // Passenger requests a ride
  requestRide({ passengerId, passengerName, pickup, destination, scheduledTime = null, passengerCount = 1, seatsRequired = passengerCount }) {
    const rides = readArr(RIDES_KEY);
    // only one active request/ride per passenger (unless scheduled)
    if (!scheduledTime) {
      const existing = rides.find(
        r => r.passengerId === passengerId &&
          ["requesting", "accepted", "in_progress"].includes(r.status)
      );
      if (existing) return existing;
    }

    const ride = {
      id: uid(),
      passengerId, passengerName,
      pickup, destination,
      scheduledTime,
      seatsRequired: rideSeats({ seatsRequired }),
      passengerCount: rideSeats({ seatsRequired }),
      status: scheduledTime ? "scheduled" : "requesting",
      driverId: null, driverName: null, vehicle: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    rides.push(ride);
    write(RIDES_KEY, rides);
    return ride;
  },

  // Driver sees pending requests not yet assigned
  getPendingRequests(driverId) {
    const rides = readArr(RIDES_KEY);
    return rides.filter(ride => this.canDriverAcceptRide(driverId, ride));
  },

  // Driver sees scheduled rides for later or their own accepted scheduled rides
  getScheduledRides(driverId) {
    const rides = readArr(RIDES_KEY);
    return rides.filter(r =>
      r.status === "scheduled" ||
      (r.status === "scheduled_accepted" && r.driverId === driverId)
    );
  },

  reserveSeats(driverId, count) {
    const drivers = read(DRIVERS_KEY);
    if (!drivers[driverId]) return;
    const driver = currentDriver(drivers[driverId]);
    driver.occupiedSeats = Math.min(driver.totalSeats, driver.occupiedSeats + count);
    driver.availableSeats = driver.totalSeats - driver.occupiedSeats;
    drivers[driverId] = driver;
    write(DRIVERS_KEY, drivers);
  },

  releaseSeats(driverId, count) {
    const drivers = read(DRIVERS_KEY);
    if (!drivers[driverId]) return;
    const driver = currentDriver(drivers[driverId]);
    driver.occupiedSeats = Math.max(0, driver.occupiedSeats - count);
    driver.availableSeats = driver.totalSeats - driver.occupiedSeats;
    drivers[driverId] = driver;
    write(DRIVERS_KEY, drivers);
  },

  // Driver accepts a ride (works for both requesting and scheduled)
  acceptRide(rideId, driverId, driverName, vehicle) {
    const rides = readArr(RIDES_KEY);
    const drivers = read(DRIVERS_KEY);
    const me = drivers[driverId] ? currentDriver(drivers[driverId]) : null;
    const idx = rides.findIndex(r => r.id === rideId);
    if (idx === -1) return false;
    const ride = rides[idx];
    if (ride.status !== "requesting" && ride.status !== "scheduled") return false;
    const seatsRequired = rideSeats(ride);
    if (!me?.isOnline || me.availableSeats < seatsRequired) return false;

    rides[idx] = {
      ...ride,
      status: ride.status === "scheduled" ? "scheduled_accepted" : "accepted",
      driverId, driverName, vehicle,
      seatsRequired,
      passengerCount: seatsRequired,
      acceptedAt: Date.now(),
      updatedAt: Date.now(),
    };

    me.occupiedSeats += seatsRequired;
    me.availableSeats = me.totalSeats - me.occupiedSeats;
    drivers[driverId] = me;

    write(RIDES_KEY, rides);
    write(DRIVERS_KEY, drivers);
    return true;
  },

  // Driver decides to start an accepted scheduled ride (moves it to active)
  startScheduledRide(rideId, driverId) {
    const rides = readArr(RIDES_KEY);
    const idx = rides.findIndex(r => r.id === rideId);
    if (idx === -1) return false;

    if (rides[idx].driverId !== driverId || rides[idx].status !== "scheduled_accepted") return false;

    rides[idx].status = "accepted";
    rides[idx].updatedAt = Date.now();
    write(RIDES_KEY, rides);
    return true;
  },

  // Driver rejects a ride (removed from their queue, stays for others)
  rejectRide(rideId, driverId, reason = "rejected") {
    const rides = readArr(RIDES_KEY);
    const idx = rides.findIndex(r => r.id === rideId);
    if (idx === -1) return;
    rides[idx].rejectedBy = [...(rides[idx].rejectedBy || []), driverId];
    rides[idx].rejectionReasons = {
      ...(rides[idx].rejectionReasons || {}),
      [driverId]: reason,
    };
    rides[idx].updatedAt = Date.now();
    // Only drivers with enough seats are expected to receive this request.
    const eligibleDriverIds = this.getAvailableDrivers(rideSeats(rides[idx])).map(driver => driver.id);
    const rejectedBy = rides[idx].rejectedBy || [];
    if (
      eligibleDriverIds.length > 0 &&
      eligibleDriverIds.every(eligibleDriverId => rejectedBy.includes(eligibleDriverId))
    ) {
      rides[idx].status = "cancelled";
      rides[idx].cancelReason = "no drivers available";
    }
    write(RIDES_KEY, rides);
  },

  // Driver marks they have arrived at the pickup point
  arriveAtPickup(rideId) {
    const rides = readArr(RIDES_KEY);
    const idx = rides.findIndex(r => r.id === rideId);
    if (idx === -1) return;
    rides[idx].status = "at_pickup";
    rides[idx].arrivedAt = Date.now();
    rides[idx].updatedAt = Date.now();
    write(RIDES_KEY, rides);
  },

  // Driver marks as in-progress (called when passenger confirms pickup)
  startRide(rideId) {
    const rides = readArr(RIDES_KEY);
    const idx = rides.findIndex(r => r.id === rideId);
    if (idx === -1) return;
    rides[idx].status = "in_progress";
    rides[idx].startedAt = Date.now();
    rides[idx].updatedAt = Date.now();
    write(RIDES_KEY, rides);
  },

  // Driver completes the ride
  completeRide(rideId) {
    const rides = readArr(RIDES_KEY);
    const idx = rides.findIndex(r => r.id === rideId);
    if (idx === -1) return;
    const ride = rides[idx];
    if (!["accepted", "at_pickup", "in_progress"].includes(ride.status)) return;
    if (ride.driverId) this.releaseSeats(ride.driverId, rideSeats(ride));
    rides[idx].status = "completed";
    rides[idx].completedAt = Date.now();
    rides[idx].updatedAt = Date.now();
    write(RIDES_KEY, rides);
  },

  // Passenger or driver cancels
  cancelRide(rideId, by = "passenger") {
    const rides = readArr(RIDES_KEY);
    const idx = rides.findIndex(r => r.id === rideId);
    if (idx === -1) return;
    if (!["requesting", "accepted", "scheduled", "scheduled_accepted", "at_pickup", "in_progress"].includes(rides[idx].status)) return;
    const ride = rides[idx];
    if (ride.driverId && ["accepted", "scheduled_accepted", "at_pickup", "in_progress"].includes(ride.status)) {
      this.releaseSeats(ride.driverId, rideSeats(ride));
    }
    rides[idx].status = "cancelled";
    rides[idx].cancelledBy = by;
    rides[idx].updatedAt = Date.now();
    write(RIDES_KEY, rides);
  },

  // ── QUERIES ────────────────────────────────────────────────────

  getPassengerRide(passengerId) {
    const rides = readArr(RIDES_KEY);
    // most recent non-idle ride for this passenger
    return rides
      .filter(r => r.passengerId === passengerId)
      .sort((a, b) => b.createdAt - a.createdAt)[0] || null;
  },

  getDriverActiveRide(driverId) {
    return this.getDriverActiveRides(driverId)[0] || null;
  },

  getDriverActiveRides(driverId) {
    const rides = readArr(RIDES_KEY);
    return rides.filter(
      r => r.driverId === driverId && ["accepted", "at_pickup", "in_progress"].includes(r.status)
    );
  },

  getDriverHistory(driverId) {
    const rides = readArr(RIDES_KEY);
    return rides.filter(r => r.driverId === driverId);
  },

  getPassengerHistory(passengerId) {
    const rides = readArr(RIDES_KEY);
    return rides
      .filter(r => r.passengerId === passengerId)
      .sort((a, b) => b.createdAt - a.createdAt);
  },

  // ── RATINGS ────────────────────────────────────────────────────

  submitRating({ rideId, driverId, driverName, passengerId, stars, tags, feedback }) {
    // mark ride as rated
    const rides = readArr(RIDES_KEY);
    const idx = rides.findIndex(r => r.id === rideId);
    if (idx !== -1) { rides[idx].rated = true; write(RIDES_KEY, rides); }

    // store rating under driver key
    const key = "rnn_ratings_" + driverId;
    const prev = readArr(key);
    prev.push({ rideId, driverId, driverName, passengerId, stars, tags, feedback, createdAt: Date.now() });
    localStorage.setItem(key, JSON.stringify(prev));

    // update driver avg rating
    const all = read(DRIVERS_KEY);
    if (all[driverId]) {
      const avg = (prev.reduce((s, r) => s + r.stars, 0) / prev.length).toFixed(1);
      all[driverId].rating = avg;
      write(DRIVERS_KEY, all);
    }
  },

  getRatings(driverId) {
    return readArr("rnn_ratings_" + driverId);
  },

  needsRating(ride) {
    return ride && ride.status === "completed" && !ride.rated;
  },

  // ── WALLET & PAYMENTS ──────────────────────────────────────────

  getUserWallet(userId) {
    const users = read(USERS_KEY);
    if (!users[userId]) {
      // Init new users with 20 rupees automatically
      users[userId] = { balance: 20 };
      write(USERS_KEY, users);
    }
    return users[userId].balance;
  },

  addFunds(userId, amount) {
    const users = read(USERS_KEY);
    if (!users[userId]) users[userId] = { balance: 0 };
    users[userId].balance += amount;
    write(USERS_KEY, users);
    return users[userId].balance;
  },

  withdrawFunds(userId, amount) {
    const users = read(USERS_KEY);
    if (!users[userId]) users[userId] = { balance: 0 };
    if (users[userId].balance < amount) return false;
    users[userId].balance -= amount;
    write(USERS_KEY, users);
    return true;
  },

  transferFunds(fromId, toId, amount) {
    const users = read(USERS_KEY);
    if (!users[fromId]) users[fromId] = { balance: 500 };
    if (!users[toId]) users[toId] = { balance: 0 };

    if (users[fromId].balance < amount) return false; // Insufficient funds

    users[fromId].balance -= amount;
    users[toId].balance += amount;
    write(USERS_KEY, users);
    return true;
  },

  // ── DEMAND ANALYTICS & FORECASTING ─────────────────────────────

  getDemandAnalytics() {
    const rides = readArr(RIDES_KEY);
    const locCounts = {};

    // Seed some mock historical rides if completely empty for a better demo
    if (rides.length < 5) {
      // User request: from morning 8 to 6 pm every hr there is peak demand for bhawan to lecture hall and vice versa
      const mockLocs = ["gate_main", "library", "sports"];
      for (let i = 0; i < 75; i++) {
        // Skew 80% to either hostel_bhawan or lecture_hall
        let loc;
        const rand = Math.random();
        if (rand < 0.4) loc = "hostel_bhawan";
        else if (rand < 0.8) loc = "lecture_hall";
        else loc = mockLocs[Math.floor(Math.random() * mockLocs.length)];

        locCounts[loc] = (locCounts[loc] || 0) + 1;
      }
    }

    // Aggregate actual rides
    rides.forEach(r => {
      if (r.status === "completed" || r.status === "requesting" || r.status === "scheduled") {
        locCounts[r.pickup] = (locCounts[r.pickup] || 0) + 1;
      }
    });

    // Format for charts: [{ locId, count }]
    return Object.entries(locCounts)
      .map(([locId, count]) => ({ locId, count }))
      .sort((a, b) => b.count - a.count);
  },

  getDemandForecast() {
    // Simulated logic: Based on the current hour, predict where high demand will be
    const hour = new Date().getHours();
    let hotspots;

    if (hour >= 8 && hour <= 10) {
      hotspots = [
        { locId: "hostel_bhawan", reason: "Morning classes starting soon", level: "High" },
        { locId: "gate_main", reason: "Day scholars arriving", level: "Medium" }
      ];
    } else if (hour >= 12 && hour <= 14) {
      hotspots = [
        { locId: "lecture_hall", reason: "Lunch break rush", level: "High" },
        { locId: "canteen", reason: "High footfall at canteen", level: "Medium" }
      ];
    } else if (hour >= 17 && hour <= 19) {
      hotspots = [
        { locId: "lecture_hall", reason: "Classes ending", level: "High" },
        { locId: "library", reason: "Evening study session changes", level: "Medium" }
      ];
    } else {
      hotspots = [
        { locId: "gate_main", reason: "General evening transit", level: "Medium" },
        { locId: "hostel_bhawan", reason: "Students returning", level: "Low" }
      ];
    }
    return hotspots;
  },

  // ── DEV UTILS ─────────────────────────────────────────────────
  clearAll() {
    localStorage.removeItem(DRIVERS_KEY);
    localStorage.removeItem(RIDES_KEY);
  },
};
