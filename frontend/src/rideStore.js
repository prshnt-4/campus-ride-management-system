// src/store/rideStore.js
// Simulates real-time state using localStorage
// Replace with Socket.IO calls when backend is ready
// Every method maps directly to a backend API/socket event

const DRIVERS_KEY  = "rnn_drivers";
const RIDES_KEY    = "rnn_rides";

function read(key)       { try { return JSON.parse(localStorage.getItem(key) || "{}"); } catch { return {}; } }
function readArr(key)    { try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; } }
function write(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

function uid() { return Math.random().toString(36).slice(2, 10); }

// driver coords spread across campus for demo
const DEMO_COORDS = [
  [29.8660, 77.8942], [29.8680, 77.8960], [29.8645, 77.8975],
  [29.8695, 77.8935], [29.8670, 77.8990],
];

export const rideStore = {

  // ── DRIVER STATUS ──────────────────────────────────────────────

  setDriverOnline(driverId, name, vehicle, isOnline) {
    const all = read(DRIVERS_KEY);
    const idx = DEMO_COORDS[Object.keys(all).length % DEMO_COORDS.length];
    all[driverId] = {
      id: driverId, name, vehicle,
      isOnline, rating: "4.8",
      coords: isOnline ? idx : null,
      updatedAt: Date.now(),
    };
    write(DRIVERS_KEY, all);
  },

  getDriverStatus(driverId) {
    return read(DRIVERS_KEY)[driverId] || null;
  },

  getOnlineDrivers() {
    const all = read(DRIVERS_KEY);
    return Object.values(all).filter(d => d.isOnline);
  },

  // ── RIDE LIFECYCLE ─────────────────────────────────────────────

  // Passenger requests a ride → status: "requesting"
  requestRide({ passengerId, passengerName, pickup, destination }) {
    const rides = readArr(RIDES_KEY);
    // only one active ride per passenger
    const existing = rides.find(
      r => r.passengerId === passengerId &&
           ["requesting", "accepted", "in_progress"].includes(r.status)
    );
    if (existing) return existing;

    const ride = {
      id: uid(),
      passengerId, passengerName,
      pickup, destination,
      status: "requesting",
      driverId: null, driverName: null, vehicle: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    rides.push(ride);
    write(RIDES_KEY, rides);
    return ride;
  },

  // Driver sees pending requests not yet assigned to anyone
  getPendingRequests(driverId) {
    const rides = readArr(RIDES_KEY);
    const drivers = read(DRIVERS_KEY);
    const me = drivers[driverId];
    if (!me?.isOnline) return [];
    // show rides in "requesting" state that this driver hasn't rejected
    return rides.filter(r =>
      r.status === "requesting" &&
      !(r.rejectedBy || []).includes(driverId)
    );
  },

  // Driver accepts a ride — atomic: first writer wins
  acceptRide(rideId, driverId, driverName, vehicle) {
    const rides = readArr(RIDES_KEY);
    const idx = rides.findIndex(r => r.id === rideId);
    if (idx === -1) return false;
    const ride = rides[idx];
    // already taken
    if (ride.status !== "requesting") return false;
    rides[idx] = {
      ...ride,
      status: "accepted",
      driverId, driverName, vehicle,
      updatedAt: Date.now(),
    };
    write(RIDES_KEY, rides);
    return true;
  },

  // Driver rejects a ride (removed from their queue, stays for others)
  rejectRide(rideId, driverId, reason = "rejected") {
    const rides = readArr(RIDES_KEY);
    const idx = rides.findIndex(r => r.id === rideId);
    if (idx === -1) return;
    rides[idx].rejectedBy = [...(rides[idx].rejectedBy || []), driverId];
    rides[idx].updatedAt = Date.now();
    // if all online drivers rejected → auto-cancel
    const onlineDriverCount = Object.values(read(DRIVERS_KEY)).filter(d => d.isOnline).length;
    if ((rides[idx].rejectedBy || []).length >= onlineDriverCount) {
      rides[idx].status = "cancelled";
      rides[idx].cancelReason = "no drivers available";
    }
    write(RIDES_KEY, rides);
  },

  // Driver marks as in-progress (optional — can add a "start ride" step)
  startRide(rideId) {
    const rides = readArr(RIDES_KEY);
    const idx = rides.findIndex(r => r.id === rideId);
    if (idx === -1) return;
    rides[idx].status = "in_progress";
    rides[idx].updatedAt = Date.now();
    write(RIDES_KEY, rides);
  },

  // Driver completes the ride
  completeRide(rideId) {
    const rides = readArr(RIDES_KEY);
    const idx = rides.findIndex(r => r.id === rideId);
    if (idx === -1) return;
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
    if (!["requesting", "accepted"].includes(rides[idx].status)) return;
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
    const rides = readArr(RIDES_KEY);
    return rides.find(
      r => r.driverId === driverId && ["accepted", "in_progress"].includes(r.status)
    ) || null;
  },

  getDriverHistory(driverId) {
    const rides = readArr(RIDES_KEY);
    return rides.filter(r => r.driverId === driverId);
  },

  // ── DEV UTILS ─────────────────────────────────────────────────
  clearAll() {
    localStorage.removeItem(DRIVERS_KEY);
    localStorage.removeItem(RIDES_KEY);
  },
};
