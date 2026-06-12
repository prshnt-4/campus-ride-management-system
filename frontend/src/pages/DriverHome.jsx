// src/pages/DriverHome.jsx
// Works with rideStore.js for shared state across tabs

import { useState, useEffect } from "react";
import { rideStore } from "../rideStore";
import socket from "../socket";
import { CAMPUS_LOCATIONS } from "../campusLocations";

function locLabel(id) {
  return CAMPUS_LOCATIONS.find(l => l.id === id)?.label || id;
}

// ── pulse dot ────────────────────────────────────────────────────
function PulseDot({ color }) {
  return (
    <span style={{ position: "relative", display: "inline-block", width: 10, height: 10 }}>
      <span style={{
        position: "absolute", inset: 0, borderRadius: "50%",
        background: color, opacity: 0.35,
        animation: "ripple 1.5s ease-out infinite",
      }} />
      <span style={{
        position: "absolute", inset: 2, borderRadius: "50%", background: color,
      }} />
    </span>
  );
}

// ── metric card ──────────────────────────────────────────────────
function StatCard({ label, value, sub, color = "#111", onClick }) {
  return (
    <div onClick={onClick} style={{
      background: "#f9f9f9", borderRadius: 14, padding: "16px 20px",
      border: "1px solid #eee", flex: 1, cursor: onClick ? "pointer" : "default"
    }}>
      <p style={{
        margin: 0, fontSize: 11, fontWeight: 700, textTransform: "uppercase",
        letterSpacing: "0.06em", color: "#aaa"
      }}>{label}</p>
      <p style={{ margin: "6px 0 2px", fontSize: 26, fontWeight: 700, color, lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ margin: 0, fontSize: 11, color: "#aaa" }}>{sub}</p>}
    </div>
  );
}

// ── incoming request card ────────────────────────────────────────
function RequestCard({ request, onAccept, onReject }) {
  const [timer, setTimer] = useState(30);
  useEffect(() => {
    if (timer <= 0) { onReject(request.id, "timeout"); return; }
    const t = setTimeout(() => setTimer(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [timer]);

  return (
    <div style={{
      background: "#fff", border: "2px solid #1a73e8", borderRadius: 18,
      padding: 20, marginBottom: 16, position: "relative", overflow: "hidden"
    }}>
      {/* timer bar */}
      <div style={{
        position: "absolute", top: 0, left: 0, height: 4, background: "#e8f0fe",
        width: "100%"
      }}>
        <div style={{
          height: "100%", background: timer > 10 ? "#1a73e8" : "#e74c3c",
          width: `${(timer / 30) * 100}%`, transition: "width 1s linear, background 0.3s",
        }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 16, color: "#111" }}>
            🛺 New ride request
          </p>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#888" }}>
            Passenger: <strong style={{ color: "#111" }}>{request.passengerName}</strong>
            {request.passengerCount > 1 && <span style={{ color: "#e67e22", fontWeight: 700 }}> (+{request.passengerCount - 1} others)</span>}
          </p>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#888" }}>
            Seats Required: <strong>{request.seatsRequired || 1}</strong>
          </p>
        </div>
        <span style={{
          fontSize: 13, fontWeight: 700, color: timer > 10 ? "#1a73e8" : "#e74c3c",
          background: timer > 10 ? "#e8f0fe" : "#fff0f0",
          padding: "4px 10px", borderRadius: 20
        }}>{timer}s</span>
      </div>
      <div style={{ margin: "14px 0", display: "flex", gap: 12 }}>
        <div style={{
          flex: 1, background: "#f0fff4", borderRadius: 10, padding: "10px 14px",
          border: "1px solid #b7f5cf"
        }}>
          <p style={{
            margin: 0, fontSize: 10, fontWeight: 700, color: "#27ae60",
            textTransform: "uppercase", letterSpacing: "0.06em"
          }}>Pickup</p>
          <p style={{ margin: "3px 0 0", fontSize: 13, fontWeight: 700, color: "#111" }}>
            {locLabel(request.pickup)}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", color: "#ccc", fontSize: 20 }}>→</div>
        <div style={{
          flex: 1, background: "#fff0f0", borderRadius: 10, padding: "10px 14px",
          border: "1px solid #fcc"
        }}>
          <p style={{
            margin: 0, fontSize: 10, fontWeight: 700, color: "#e74c3c",
            textTransform: "uppercase", letterSpacing: "0.06em"
          }}>Drop-off</p>
          <p style={{ margin: "3px 0 0", fontSize: 13, fontWeight: 700, color: "#111" }}>
            {locLabel(request.destination)}
          </p>
        </div>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={() => onReject(request.id)}
          style={{
            flex: 1, padding: "12px 0", borderRadius: 12, border: "1.5px solid #eee",
            background: "#fafafa", color: "#888", fontWeight: 700, fontSize: 14,
            cursor: "pointer", fontFamily: "inherit"
          }}>
          ✕ Decline
        </button>
        <button onClick={() => onAccept(request.id)}
          style={{
            flex: 2, padding: "12px 0", borderRadius: 12, border: "none",
            background: "#111", color: "#fff", fontWeight: 700, fontSize: 14,
            cursor: "pointer", fontFamily: "inherit"
          }}>
          ✓ Accept ride
        </button>
      </div>
    </div>
  );
}

// ── active ride card ─────────────────────────────────────────────
function ActiveRideCard({ ride, onArrive, onComplete }) {
  const isAccepted = ride.status === "accepted";
  const isAtPickup = ride.status === "at_pickup";
  const isInProgress = ride.status === "in_progress";

  // Animated progress bar for in_progress phase
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    if (!isInProgress) return undefined;
    const STEPS = 40;
    let step = 0;
    const id = setInterval(() => {
      step = Math.min(step + 1, STEPS);
      setProgress(Math.round((step / STEPS) * 100));
      if (step >= STEPS) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [isInProgress]);

  const headerColor = isAccepted ? "#1a73e8" : isAtPickup ? "#e67e22" : "#8e44ad";
  const headerBg = isAccepted ? "#f0f6ff" : isAtPickup ? "#fff8f0" : "#f6f8ff";

  return (
    <div style={{
      background: headerBg,
      border: `2px solid ${headerColor}22`,
      borderRadius: 18, padding: 20, marginBottom: 16
    }}>
      {/* header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <span style={{
          width: 10, height: 10, borderRadius: "50%",
          background: headerColor, display: "inline-block",
          boxShadow: `0 0 0 3px ${headerColor}30`,
          animation: isAtPickup ? "ripple 1.5s ease-out infinite" : "none"
        }} />
        <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: "#111" }}>
          {isAccepted && "🛺 Heading to pickup point…"}
          {isAtPickup && "📍 Arrived at pickup — waiting for passenger…"}
          {isInProgress && "🚀 Ride in progress"}
        </p>
      </div>

      {/* passenger info */}
      <p style={{ margin: "0 0 4px", fontSize: 13, color: "#555" }}>
        Passenger: <strong>{ride.passengerName}</strong>
        {ride.passengerCount > 1 && <strong style={{ color: "#e67e22" }}> (+{ride.passengerCount - 1} others)</strong>}
      </p>

      {/* route with progress bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "14px 0" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#27ae60", whiteSpace: "nowrap" }}>
          📍 {locLabel(ride.pickup)}
        </div>
        <div style={{ flex: 1, position: "relative", height: 6, background: "#e5e5e5", borderRadius: 3 }}>
          <div style={{
            position: "absolute", left: 0, top: 0, height: "100%", borderRadius: 3,
            background: isInProgress ? "linear-gradient(90deg,#8e44ad,#e74c3c)"
              : isAtPickup ? "#e67e22" : "#1a73e8",
            width: isInProgress ? `${progress}%` : isAtPickup ? "50%" : "0%",
            transition: "width 1.8s ease-in-out",
          }} />
          {isInProgress && (
            <div style={{
              position: "absolute", top: "50%", transform: "translateY(-50%)",
              left: `calc(${progress}% - 8px)`,
              width: 16, height: 16, borderRadius: "50%",
              background: "#8e44ad", border: "2px solid #fff",
              boxShadow: "0 2px 6px rgba(142,68,173,0.5)",
              transition: "left 1.8s ease-in-out",
              zIndex: 1,
            }} />
          )}
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#e74c3c", whiteSpace: "nowrap" }}>
          🏁 {locLabel(ride.destination)}
        </div>
      </div>

      {isInProgress && (
        <p style={{ margin: "0 0 14px", fontSize: 12, color: "#8e44ad", fontWeight: 600 }}>
          Journey: {progress}% complete
        </p>
      )}

      {isAtPickup && (
        <div style={{
          background: "#fff8f0", border: "1px solid #ffd59d", borderRadius: 10,
          padding: "10px 14px", marginBottom: 14, fontSize: 13, color: "#c0731a"
        }}>
          ⏳ Waiting for passenger to confirm pickup on their app…
        </div>
      )}

      {/* action buttons */}
      {isAccepted && (
        <button onClick={() => onArrive(ride.id)}
          style={{
            width: "100%", padding: "13px 0", borderRadius: 12, border: "none",
            background: "#1a73e8", color: "#fff", fontWeight: 700, fontSize: 14,
            cursor: "pointer", fontFamily: "inherit",
            boxShadow: "0 4px 14px rgba(26,115,232,0.35)",
          }}>
          📍 I've Arrived at Pickup
        </button>
      )}
      {isInProgress && (
        <button onClick={() => onComplete(ride.id)}
          style={{
            width: "100%", padding: "13px 0", borderRadius: 12, border: "none",
            background: "#27ae60", color: "#fff", fontWeight: 700, fontSize: 14,
            cursor: "pointer", fontFamily: "inherit",
            boxShadow: "0 4px 14px rgba(39,174,96,0.35)",
          }}>
          ✓ Mark as completed
        </button>
      )}
    </div>
  );
}

// ── history row ──────────────────────────────────────────────────
function HistoryRow({ ride }) {
  const statusColor = { completed: "#27ae60", cancelled: "#e74c3c", rejected: "#888" };
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "12px 0", borderBottom: "1px solid #f0f0f0"
    }}>
      <div>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#111" }}>
          {locLabel(ride.pickup)} → {locLabel(ride.destination)}
        </p>
        <p style={{ margin: "2px 0 0", fontSize: 11, color: "#aaa" }}>
          {new Date(ride.createdAt).toLocaleString()}
        </p>
      </div>
      <div style={{ textAlign: "right" }}>
        <span style={{
          display: "block", fontSize: 11, fontWeight: 700, textTransform: "capitalize",
          color: statusColor[ride.status] || "#888",
          background: (statusColor[ride.status] || "#888") + "18",
          padding: "4px 12px", borderRadius: 20, marginBottom: 4
        }}>{ride.status}</span>
        {ride.status === "completed" && <span style={{ fontSize: 12, fontWeight: 800, color: "#27ae60" }}>+ ₹{10 * (ride.passengerCount || 1)}</span>}
      </div>
    </div>
  );
}

// ── withdraw modal ───────────────────────────────────────────────
function WithdrawModal({ balance, onWithdraw, onClose }) {
  const [amount, setAmount] = useState(balance > 0 ? 50 : 0);
  const [method, setMethod] = useState("bank");

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999
    }}>
      <div style={{
        background: "#fff", borderRadius: 20, padding: 24, width: "90%", maxWidth: 360,
        boxShadow: "0 10px 40px rgba(0,0,0,0.2)"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
          <p style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Withdraw Earnings</p>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer" }}>✕</button>
        </div>

        <p style={{ margin: "0 0 16px", fontSize: 14, color: "#555" }}>Available Balance: <strong style={{ color: "#27ae60" }}>₹{balance}</strong></p>

        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#888", marginBottom: 6 }}>Withdraw Amount (₹)</label>
        <input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} max={balance}
          style={{ width: "100%", padding: "12px", borderRadius: 10, border: "1.5px solid #eee", marginBottom: 16, fontSize: 16, fontFamily: "inherit" }} />

        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#888", marginBottom: 6 }}>Transfer To</label>
        <select value={method} onChange={e => setMethod(e.target.value)}
          style={{ width: "100%", padding: "12px", borderRadius: 10, border: "1.5px solid #eee", marginBottom: 24, fontSize: 14, fontFamily: "inherit", background: "#fafafa" }}>
          <option value="bank">Bank Account</option>
          <option value="upi">UPI ID</option>
        </select>

        <button onClick={() => onWithdraw(amount)} disabled={amount <= 0 || amount > balance}
          style={{ width: "100%", padding: "14px 0", borderRadius: 12, background: (amount <= 0 || amount > balance) ? "#ddd" : "#27ae60", color: "#fff", fontWeight: 700, border: "none", cursor: (amount <= 0 || amount > balance) ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
          {amount > balance ? "Insufficient Funds" : `Withdraw ₹${amount}`}
        </button>
      </div>
    </div>
  );
}

// ── scheduled ride card ──────────────────────────────────────────
function ScheduledRideCard({ request, onAccept, onStartRide }) {
  return (
    <div style={{
      background: "#fff", border: "2px solid #8e44ad", borderRadius: 18,
      padding: 20, marginBottom: 16, position: "relative"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 16, color: "#111" }}>
            ⏱️ Scheduled Ride
          </p>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#888" }}>
            Passenger: <strong style={{ color: "#111" }}>{request.passengerName}</strong>
            {request.passengerCount > 1 && <span style={{ color: "#8e44ad", fontWeight: 700 }}> (+{request.passengerCount - 1} others)</span>}
          </p>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#888" }}>
            Seats Required: <strong>{request.seatsRequired || request.passengerCount || 1}</strong>
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <span style={{
            fontSize: 12, fontWeight: 800, color: "#8e44ad",
            background: "#f3e5f5", padding: "4px 10px", borderRadius: 20
          }}>
            {new Date(request.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          <p style={{ margin: "4px 0 0", fontSize: 10, color: "#aaa" }}>
            {new Date(request.scheduledTime).toLocaleDateString()}
          </p>
        </div>
      </div>
      <div style={{ margin: "14px 0", display: "flex", gap: 12 }}>
        <div style={{ flex: 1, background: "#f0fff4", borderRadius: 10, padding: "10px 14px", border: "1px solid #b7f5cf" }}>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: "#27ae60", textTransform: "uppercase", letterSpacing: "0.06em" }}>Pickup</p>
          <p style={{ margin: "3px 0 0", fontSize: 13, fontWeight: 700, color: "#111" }}>{locLabel(request.pickup)}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", color: "#ccc", fontSize: 20 }}>→</div>
        <div style={{ flex: 1, background: "#fff0f0", borderRadius: 10, padding: "10px 14px", border: "1px solid #fcc" }}>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: "#e74c3c", textTransform: "uppercase", letterSpacing: "0.06em" }}>Drop-off</p>
          <p style={{ margin: "3px 0 0", fontSize: 13, fontWeight: 700, color: "#111" }}>{locLabel(request.destination)}</p>
        </div>
      </div>
      {request.status === "scheduled_accepted" ? (
        <button onClick={() => onStartRide(request.id)}
          style={{
            width: "100%", padding: "12px 0", borderRadius: 12, border: "none",
            background: "#27ae60", color: "#fff", fontWeight: 700, fontSize: 14,
            cursor: "pointer", fontFamily: "inherit"
          }}>
          ▶ Start Scheduled Ride Now
        </button>
      ) : (
        <button onClick={() => onAccept(request.id)}
          style={{
            width: "100%", padding: "12px 0", borderRadius: 12, border: "none",
            background: "#8e44ad", color: "#fff", fontWeight: 700, fontSize: 14,
            cursor: "pointer", fontFamily: "inherit"
          }}>
          ✓ Accept for later
        </button>
      )}
    </div>
  );
}

// ── MAIN DRIVER PAGE ─────────────────────────────────────────────
export default function DriverHome({ user, onLogout, onDashboard }) {
  const [isOnline, setIsOnline] = useState(false);
  const [requests, setRequests] = useState([]);
  const [scheduledRides, setScheduledRides] = useState([]);
  const [activeRides, setActiveRides] = useState([]);
  const [history, setHistory] = useState([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [analytics, setAnalytics] = useState([]);
  const [forecast, setForecast] = useState([]);
  const [tab, setTab] = useState("requests"); // "requests" | "scheduled" | "wallet" | "insights" | "history"
  const [toastMsg, setToastMsg] = useState(null);
  const [liveRating, setLiveRating] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [showWithdraw, setShowWithdraw] = useState(false);

  function showToast(msg, type = "info") {
    setToastMsg({ msg, type });
    setTimeout(() => setToastMsg(null), 3000);
  }

  const syncDriverState = () => {
    setRequests(rideStore.getPendingRequests(user.id));
    setScheduledRides(rideStore.getScheduledRides(user.id));
    setWalletBalance(rideStore.getUserWallet(user.id));
    setAnalytics(rideStore.getDemandAnalytics());
    setForecast(rideStore.getDemandForecast());

    setActiveRides(rideStore.getDriverActiveRides(user.id));
    setHistory(rideStore.getDriverHistory(user.id));
    const status = rideStore.getDriverStatus(user.id);
    setIsOnline(status?.isOnline || false);
    setCurrentLocation(status?.coords ? { lat: status.coords[0], lng: status.coords[1] } : null);
    // read live avg rating
    const ratings = rideStore.getRatings(user.id);
    if (ratings.length > 0) {
      const avg = (ratings.reduce((s, r) => s + r.stars, 0) / ratings.length).toFixed(1);
      setLiveRating(avg);
    }
    if (!ratings.length) {
      setLiveRating(null);
    }
  };

  // poll store every 1.5s
  useEffect(() => {
    const timeoutId = setTimeout(syncDriverState, 0);
    const id = setInterval(syncDriverState, 1500);
    return () => {
      clearTimeout(timeoutId);
      clearInterval(id);
    };
  }, [user.id]);


  function toggleOnline() {
    const next = !isOnline;
    rideStore.setDriverOnline(user.id, user.name, user.vehicle || "E-Rickshaw", next);
    socket.emit("driver-status", {
      ...rideStore.getDriverStatus(user.id),
      driverId: user.id,
      isOnline: next
    });
    setIsOnline(next);
    showToast(next ? "You are now online and visible to passengers" : "You are offline", next ? "success" : "info");
  }

  function handleAccept(rideId) {
    const ok = rideStore.acceptRide(rideId, user.id, user.name, user.vehicle || "E-Rickshaw");
    if (!ok) {
      const driverState = rideStore.getDriverStatus(user.id);
      const ride = rideStore.getPendingRequests(user.id).find(r => r.id === rideId);
      if (ride && (ride.seatsRequired || 1) > (driverState?.availableSeats || 0)) {
        showToast("Cannot accept this ride: not enough seats available.", "error");
      } else {
        showToast("This ride was already taken by another driver.", "error");
      }
      return;
    }

    socket.emit("ride-accepted", { rideId, status: "accepted", driverId: user.id, driverName: user.name });

    showToast("Ride accepted! Head to the pickup point.", "success");






  }

  function handleReject(rideId, reason) {
    rideStore.rejectRide(rideId, user.id, reason);
  }

  function handleWithdrawFunds(amount) {
    const success = rideStore.withdrawFunds(user.id, amount);
    if (success) {
      socket.emit("wallet-withdraw", { userId: user.id, amount });
      showToast(`Successfully withdrew ₹${amount}!`, "success");
    } else {
      showToast("Withdrawal failed. Insufficient funds.", "error");
    }
    setShowWithdraw(false);
  }

  function handleArriveAtPickup(rideId) {
    rideStore.arriveAtPickup(rideId);
    socket.emit("ride-arrived", { rideId, status: "at_pickup", driverId: user.id });
    showToast("Waiting for passenger to confirm pickup…", "info");
  }

  function handleComplete(rideId) {
    const completedRide = activeRides.find(r => r.id === rideId);
    rideStore.completeRide(rideId);
    if (completedRide) {
      const fare = 10 * (completedRide.passengerCount || 1);
      socket.emit("ride-completed", {
        rideId,
        status: "completed",
        driverId: user.id,
        passengerId: completedRide.passengerId,
        fare
      });
    }
    showToast("Ride completed! Fare collected. Waiting for rating...", "success");
  }

  function handleStartScheduled(rideId) {
    const ok = rideStore.startScheduledRide(rideId, user.id);
    if (!ok) {
      showToast("Could not start this scheduled ride.", "error");
      return;
    }
    socket.emit("ride-accepted", { rideId, status: "accepted", driverId: user.id, driverName: user.name });
    showToast("Scheduled ride started! Head to the pickup point.", "success");
  }


  useEffect(() => {
    const handleRideRequest = () => {
      syncDriverState();
    };
    const publishDriverState = () => {
      const status = rideStore.getDriverStatus(user.id);
      if (!status?.isOnline) return;
      socket.emit("driver-status", {
        ...status,
        driverId: user.id,
        name: user.name,
        vehicle: user.vehicle || "E-Rickshaw"
      });
    };

    socket.on("connect", publishDriverState);
    socket.on("ride-request-update", handleRideRequest);
    socket.on("ride-cancelled-update", syncDriverState);
    socket.on("ride-started-update", syncDriverState);
    socket.on("ride-scheduled-update", syncDriverState);
    socket.on("wallet-update-event", syncDriverState);
    socket.on("rating-update", syncDriverState);

    return () => {
      socket.off("connect", publishDriverState);
      socket.off("ride-request-update", handleRideRequest);
      socket.off("ride-cancelled-update", syncDriverState);
      socket.off("ride-started-update", syncDriverState);
      socket.off("ride-scheduled-update", syncDriverState);
      socket.off("wallet-update-event", syncDriverState);
      socket.off("rating-update", syncDriverState);
    };
  }, [user.id]);

  useEffect(() => {
    const openRequests = () => {
      setTab("requests");
      syncDriverState();
    };
    const refreshSharedState = () => syncDriverState();

    window.addEventListener("open-driver-requests", openRequests);
    window.addEventListener("shared-ride-state-updated", refreshSharedState);
    return () => {
      window.removeEventListener("open-driver-requests", openRequests);
      window.removeEventListener("shared-ride-state-updated", refreshSharedState);
    };
  }, [user.id]);


  const activeRide = activeRides[0] || null;

  // ── location + ride-path simulation ───────────────────────────
  useEffect(() => {
    if (!isOnline) return;

    let intervalId = null;

    const driverSnap = rideStore.getDriverStatus(user.id);
    const staticLocation = driverSnap?.coords || [29.8665, 77.8955];

    const emitLocation = (latitude, longitude) => {
      rideStore.updateDriverLocation(user.id, latitude, longitude);
      setCurrentLocation({ lat: latitude, lng: longitude });
      socket.emit("driver-location", { driverId: user.id, lat: latitude, lng: longitude });
    };

    // Smooth start and finish without changing the route.
    const ease = (t) => t * t * (3 - 2 * t);

    if (activeRide && (activeRide.status === "accepted" || activeRide.status === "at_pickup" || activeRide.status === "in_progress")) {
      const pickupLoc = CAMPUS_LOCATIONS.find(l => l.id === activeRide.pickup);
      const destLoc = CAMPUS_LOCATIONS.find(l => l.id === activeRide.destination);

      if ((activeRide.status === "accepted" || activeRide.status === "at_pickup") && pickupLoc) {
        // Keep the marker fixed at pickup until the passenger starts the ride.
        emitLocation(pickupLoc.coords[0], pickupLoc.coords[1]);
      } else if (activeRide.status === "in_progress" && pickupLoc && destLoc) {
        // Follow one deterministic path from pickup to destination.
        const [startLat, startLng] = pickupLoc.coords;
        const [endLat, endLng] = destLoc.coords;
        const STEPS = 60;
        let step = 0;
        emitLocation(startLat, startLng);

        intervalId = setInterval(() => {
          step = Math.min(step + 1, STEPS);
          const t = ease(step / STEPS);
          emitLocation(startLat + (endLat - startLat) * t, startLng + (endLng - startLng) * t);
          if (step >= STEPS) clearInterval(intervalId);
        }, 500);
      }
    } else {
      // Stay still while online and waiting for a ride.
      emitLocation(staticLocation[0], staticLocation[1]);
    }

    return () => {
      if (intervalId !== null) clearInterval(intervalId);
    };
    // Re-run whenever online state, ride id or ride status changes
  }, [isOnline, activeRide?.id, activeRide?.status, user.id]);



  const completed = history.filter(r => r.status === "completed").length;
  const rating = liveRating || user.rating || "—";
  const driverStatus = rideStore.getDriverStatus(user.id);
  const totalSeats = driverStatus?.totalSeats || 4;
  const occupiedSeats = driverStatus?.occupiedSeats || 0;
  const availableSeats = driverStatus?.availableSeats ?? totalSeats;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&display=swap');
      `}</style>

      <div style={{ minHeight: "100vh", background: "#f4f4f0", fontFamily: "'Sora', sans-serif" }}>

        {/* ── toast ── */}
        {toastMsg && (
          <div style={{
            position: "fixed", top: 20, right: 20, zIndex: 9999,
            background: toastMsg.type === "error" ? "#fff0f0"
              : toastMsg.type === "success" ? "#f0fff4" : "#f0f6ff",
            color: toastMsg.type === "error" ? "#c0392b"
              : toastMsg.type === "success" ? "#27ae60" : "#1a73e8",
            border: `1px solid ${toastMsg.type === "error" ? "#fcc"
              : toastMsg.type === "success" ? "#b7f5cf" : "#c0d8f8"}`,
            borderRadius: 12, padding: "12px 18px", fontSize: 13, fontWeight: 600,
            boxShadow: "0 4px 24px rgba(0,0,0,0.1)", animation: "slideIn 0.3s ease",
            maxWidth: 300,
          }}>{toastMsg.msg}</div>
        )}

        {/* ── navbar ── */}
        <div style={{
          background: "#fff", borderBottom: "1px solid #eee",
          padding: "14px 24px", display: "flex", alignItems: "center",
          justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, background: "#111",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontSize: 16
            }}>🛺</div>
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: "#111" }}>Campus Ride</p>
              <p style={{ margin: 0, fontSize: 11, color: "#888" }}>Driver console</p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <PulseDot color={isOnline ? "#27ae60" : "#ccc"} />
              <span style={{
                fontSize: 12, fontWeight: 700,
                color: isOnline ? "#27ae60" : "#999"
              }}>
                {isOnline ? "Online" : "Offline"}
              </span>
              {isOnline && (
                <span style={{ fontSize: 11, color: "#666" }}>
                  · {availableSeats} seat{availableSeats !== 1 ? "s" : ""} available
                </span>
              )}
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#111" }}>{user.name}</p>
              <p style={{ margin: 0, fontSize: 11, color: "#888" }}>Driver</p>
            </div>
            {onDashboard && (
              <button onClick={onDashboard} style={{
                background: "#111", border: "none", borderRadius: 8,
                padding: "6px 14px", fontSize: 12, cursor: "pointer",
                color: "#fff", fontFamily: "inherit", fontWeight: 700,
              }}>Dashboard</button>
            )}
            <button onClick={onLogout} style={{
              background: "none", border: "1px solid #eee",
              borderRadius: 8, padding: "6px 14px", fontSize: 12, cursor: "pointer",
              color: "#888", fontFamily: "inherit"
            }}>Logout</button>
          </div>
        </div>

        <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 16px" }}>

          {/* ── online toggle ── */}
          <div style={{
            background: "#fff", borderRadius: 18, padding: 24, marginBottom: 20,
            border: "1px solid #eee"
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 16, color: "#111" }}>
                  {isOnline ? "You're online" : "You're offline"}
                </p>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "#888" }}>
                  {isOnline
                    ? "Passengers can see you and send ride requests"
                    : "Go online to start receiving ride requests"}
                </p>
              </div>
              {/* big toggle */}
              <button onClick={toggleOnline} style={{
                width: 80, height: 42, borderRadius: 21, border: "none",
                background: isOnline ? "#111" : "#e0e0e0",
                cursor: "pointer", position: "relative", transition: "background 0.3s", flexShrink: 0,
              }}>
                <span style={{
                  position: "absolute", top: 4, left: isOnline ? 42 : 4,
                  width: 34, height: 34, borderRadius: "50%",
                  background: "#fff", transition: "left 0.3s",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 16,
                }}>{isOnline ? "✓" : "—"}</span>
              </button>
            </div>

            {isOnline && (
              <div style={{
                marginTop: 16, padding: "10px 14px", background: "#f0fff4",
                borderRadius: 10, border: "1px solid #b7f5cf",
                fontSize: 13, color: "#27ae60", fontWeight: 600
              }}>
                🟢 Waiting for ride requests near IIT Roorkee campus
              </div>
            )}
            {!isOnline && (
              <div style={{
                marginTop: 16, padding: "10px 14px", background: "#f5f5f5",
                borderRadius: 10, border: "1px solid #e5e5e5",
                fontSize: 13, color: "#aaa"
              }}>
                You won't receive any requests while offline
              </div>
            )}
          </div>

          {/* ── stats ── */}
          <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
            <StatCard label="Rides today" value={completed} sub="completed" color="#1a73e8" />
            <StatCard label="Rating"
              value={rating !== "—" ? `⭐ ${rating}` : "—"}
              sub={rating !== "—" ? "avg rating" : "no ratings yet"} />
            <StatCard label="Earnings" value={`₹${walletBalance}`}
              sub="Click to withdraw" color="#27ae60" onClick={() => setShowWithdraw(true)} />
          </div>

          <div style={{
            background: "#fff", borderRadius: 18, padding: 18,
            border: "1px solid #eee", marginBottom: 20
          }}>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#111" }}>
              🛺 Seats: {occupiedSeats}/{totalSeats} occupied
            </p>
            <p style={{ margin: "6px 0 0", fontSize: 12, color: "#666" }}>
              Total: {totalSeats} · Occupied: {occupiedSeats} · Available: {availableSeats}
            </p>
          </div>

          <div style={{
            background: "#fff", borderRadius: 18, padding: 18,
            border: "1px solid #eee", marginBottom: 20, display: "flex",
            justifyContent: "space-between", alignItems: "center"
          }}>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#111" }}>Live GPS status</p>
              <p style={{ margin: "6px 0 0", fontSize: 12, color: "#666" }}>
                {isOnline ? (
                  currentLocation
                    ? `Sharing location: ${currentLocation.lat.toFixed(5)}, ${currentLocation.lng.toFixed(5)}`
                    : "Waiting for GPS fix..."
                ) : "Go online to start sharing your location."}
              </p>
            </div>
            <div style={{
              padding: "10px 14px", borderRadius: 14,
              background: isOnline ? "#e8f8f2" : "#f5f5f5",
              color: isOnline ? "#27ae60" : "#888",
              fontWeight: 700, fontSize: 12
            }}>
              {isOnline ? "GPS active" : "GPS paused"}
            </div>
          </div>

          {/* ── active ride ── */}
          {activeRides.map(ride => (
            <ActiveRideCard key={ride.id} ride={ride} onArrive={handleArriveAtPickup} onComplete={handleComplete} />
          ))}

          {/* ── tabs ── */}
          <>
              <div className="ride-tab-bar driver-tabs">
                <button className={`tab-btn ${tab === "requests" ? "active" : ""}`}
                  onClick={() => setTab("requests")}>Requests {requests.length > 0 && `(${requests.length})`}</button>
                <button className={`tab-btn ${tab === "scheduled" ? "active" : ""}`}
                  onClick={() => setTab("scheduled")}>Scheduled {scheduledRides.length > 0 && `(${scheduledRides.length})`}</button>
                <button className={`tab-btn ${tab === "insights" ? "active" : ""}`}
                  onClick={() => setTab("insights")}>Insights</button>
                <button className={`tab-btn ${tab === "history" ? "active" : ""}`}
                  onClick={() => setTab("history")}>History</button>
              </div>

              {tab === "requests" && (
                <div>
                  {!isOnline && (
                    <div style={{ textAlign: "center", padding: "40px 0", color: "#ccc" }}>
                      <p style={{ fontSize: 32, marginBottom: 12 }}>🛺</p>
                      <p style={{ fontSize: 14, fontWeight: 700 }}>Go online to receive requests</p>
                    </div>
                  )}
                  {isOnline && requests.length === 0 && (
                    <div style={{ textAlign: "center", padding: "40px 0", color: "#ccc" }}>
                      <p style={{ fontSize: 32, marginBottom: 12 }}>⏳</p>
                      <p style={{ fontSize: 14, fontWeight: 700 }}>Waiting for ride requests…</p>
                      <p style={{ fontSize: 12, marginTop: 6 }}>Requests will appear here instantly</p>
                    </div>
                  )}
                  {requests.map(req => (
                    <RequestCard key={req.id} request={req}
                      onAccept={handleAccept} onReject={handleReject} />
                  ))}
                </div>
              )}

              {tab === "scheduled" && (
                <div>
                  {scheduledRides.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px 0", color: "#ccc" }}>
                      <p style={{ fontSize: 32, marginBottom: 12 }}>⏱️</p>
                      <p style={{ fontSize: 14, fontWeight: 700 }}>No scheduled rides right now</p>
                    </div>
                  ) : (
                    scheduledRides.map(req => (
                      <ScheduledRideCard key={req.id} request={req} onAccept={handleAccept} onStartRide={handleStartScheduled} />
                    ))
                  )}
                </div>
              )}

              {tab === "insights" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {/* FORECASTING */}
                  <div style={{ background: "#fff", borderRadius: 18, padding: 20, border: "1px solid #eee" }}>
                    <p style={{ margin: "0 0 16px", fontWeight: 800, fontSize: 15, color: "#111" }}>
                      🔥 Live Demand Forecast
                    </p>
                    {forecast.map((f, i) => (
                      <div key={i} style={{ display: "flex", gap: 12, marginBottom: 12, alignItems: "center", background: "#fafafa", padding: "12px 16px", borderRadius: 12 }}>
                        <div style={{ width: 10, height: 10, borderRadius: "50%", background: f.level === "High" ? "#e74c3c" : f.level === "Medium" ? "#f39c12" : "#27ae60" }} />
                        <div style={{ flex: 1 }}>
                          <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>{locLabel(f.locId)}</p>
                          <p style={{ margin: "2px 0 0", fontSize: 12, color: "#888" }}>{f.reason}</p>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: f.level === "High" ? "#e74c3c" : f.level === "Medium" ? "#f39c12" : "#27ae60", background: "#fff", padding: "4px 10px", borderRadius: 20, border: "1px solid #eee" }}>{f.level}</span>
                      </div>
                    ))}
                  </div>

                  {/* ANALYTICS */}
                  <div style={{ background: "#fff", borderRadius: 18, padding: 20, border: "1px solid #eee" }}>
                    <p style={{ margin: "0 0 16px", fontWeight: 800, fontSize: 15, color: "#111" }}>
                      📊 Historical Demand Analytics
                    </p>
                    {analytics.slice(0, 5).map((a, i) => {
                      const max = Math.max(...analytics.map(x => x.count), 1);
                      const pct = Math.round((a.count / max) * 100);
                      return (
                        <div key={i} style={{ marginBottom: 12 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                            <span style={{ fontSize: 12, fontWeight: 700 }}>{locLabel(a.locId)}</span>
                            <span style={{ fontSize: 12, color: "#888" }}>{a.count} requests</span>
                          </div>
                          <div style={{ height: 8, background: "#f0f0f0", borderRadius: 4, overflow: "hidden" }}>
                            <div style={{ width: `${pct}%`, height: "100%", background: "#1a73e8", borderRadius: 4 }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {tab === "history" && (
                <div style={{ background: "#fff", borderRadius: 18, padding: 20, border: "1px solid #eee" }}>
                  <p style={{ margin: "0 0 12px", fontWeight: 700, fontSize: 15, color: "#111" }}>Ride history</p>
                  {history.length === 0
                    ? <p style={{ color: "#aaa", fontSize: 14, textAlign: "center", padding: "24px 0" }}>No rides yet</p>
                    : history.slice().reverse().map(r => <HistoryRow key={r.id} ride={r} />)
                  }
                </div>
              )}
          </>
        </div>
      </div>

      {showWithdraw && <WithdrawModal balance={walletBalance} onWithdraw={handleWithdrawFunds} onClose={() => setShowWithdraw(false)} />}
    </>
  );
}
