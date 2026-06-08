// src/pages/DriverHome.jsx
// Works with rideStore.js for shared state across tabs

import { useState, useEffect } from "react";
import { rideStore } from "../store/rideStore";

const CAMPUS_LOCATIONS = [
  { id: "gate_main",    label: "Main Gate" },
  { id: "gate_civil",   label: "Civil Lines Gate" },
  { id: "thomso",       label: "Thomso Bhawan" },
  { id: "convocation",  label: "Convocation Hall" },
  { id: "library",      label: "James Thomason Library" },
  { id: "lecture_hall", label: "Lecture Hall Complex" },
  { id: "hostel_bhawan",label: "Bhawan (Hostels)" },
  { id: "sports",       label: "Sports Complex" },
  { id: "hospital",     label: "IITR Hospital" },
  { id: "admin",        label: "Admin Block" },
  { id: "canteen",      label: "New Canteen" },
  { id: "workshop",     label: "Workshop / Machine Lab" },
];

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
function StatCard({ label, value, sub, color = "#111" }) {
  return (
    <div style={{ background: "#f9f9f9", borderRadius: 14, padding: "16px 20px",
      border: "1px solid #eee", flex: 1 }}>
      <p style={{ margin: 0, fontSize: 11, fontWeight: 700, textTransform: "uppercase",
        letterSpacing: "0.06em", color: "#aaa" }}>{label}</p>
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
    <div style={{ background: "#fff", border: "2px solid #1a73e8", borderRadius: 18,
      padding: 20, marginBottom: 16, position: "relative", overflow: "hidden" }}>
      {/* timer bar */}
      <div style={{ position: "absolute", top: 0, left: 0, height: 4, background: "#e8f0fe",
        width: "100%" }}>
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
          </p>
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color: timer > 10 ? "#1a73e8" : "#e74c3c",
          background: timer > 10 ? "#e8f0fe" : "#fff0f0",
          padding: "4px 10px", borderRadius: 20 }}>{timer}s</span>
      </div>
      <div style={{ margin: "14px 0", display: "flex", gap: 12 }}>
        <div style={{ flex: 1, background: "#f0fff4", borderRadius: 10, padding: "10px 14px",
          border: "1px solid #b7f5cf" }}>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: "#27ae60",
            textTransform: "uppercase", letterSpacing: "0.06em" }}>Pickup</p>
          <p style={{ margin: "3px 0 0", fontSize: 13, fontWeight: 700, color: "#111" }}>
            {locLabel(request.pickup)}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", color: "#ccc", fontSize: 20 }}>→</div>
        <div style={{ flex: 1, background: "#fff0f0", borderRadius: 10, padding: "10px 14px",
          border: "1px solid #fcc" }}>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: "#e74c3c",
            textTransform: "uppercase", letterSpacing: "0.06em" }}>Drop-off</p>
          <p style={{ margin: "3px 0 0", fontSize: 13, fontWeight: 700, color: "#111" }}>
            {locLabel(request.destination)}
          </p>
        </div>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={() => onReject(request.id)}
          style={{ flex: 1, padding: "12px 0", borderRadius: 12, border: "1.5px solid #eee",
            background: "#fafafa", color: "#888", fontWeight: 700, fontSize: 14,
            cursor: "pointer", fontFamily: "inherit" }}>
          ✕ Decline
        </button>
        <button onClick={() => onAccept(request.id)}
          style={{ flex: 2, padding: "12px 0", borderRadius: 12, border: "none",
            background: "#111", color: "#fff", fontWeight: 700, fontSize: 14,
            cursor: "pointer", fontFamily: "inherit" }}>
          ✓ Accept ride
        </button>
      </div>
    </div>
  );
}

// ── active ride card ─────────────────────────────────────────────
function ActiveRideCard({ ride, onComplete }) {
  return (
    <div style={{ background: "#f6f8ff", border: "2px solid #8e44ad22", borderRadius: 18,
      padding: 20, marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#8e44ad",
          display: "inline-block" }} />
        <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: "#111" }}>Ride in progress</p>
      </div>
      <p style={{ margin: "0 0 4px", fontSize: 13, color: "#555" }}>
        Passenger: <strong>{ride.passengerName}</strong>
      </p>
      <p style={{ margin: "0 0 16px", fontSize: 13, color: "#555" }}>
        {locLabel(ride.pickup)} → {locLabel(ride.destination)}
      </p>
      <button onClick={() => onComplete(ride.id)}
        style={{ width: "100%", padding: "13px 0", borderRadius: 12, border: "none",
          background: "#27ae60", color: "#fff", fontWeight: 700, fontSize: 14,
          cursor: "pointer", fontFamily: "inherit" }}>
        ✓ Mark as completed
      </button>
    </div>
  );
}

// ── history row ──────────────────────────────────────────────────
function HistoryRow({ ride }) {
  const statusColor = { completed: "#27ae60", cancelled: "#e74c3c", rejected: "#888" };
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "12px 0", borderBottom: "1px solid #f0f0f0" }}>
      <div>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#111" }}>
          {locLabel(ride.pickup)} → {locLabel(ride.destination)}
        </p>
        <p style={{ margin: "2px 0 0", fontSize: 11, color: "#aaa" }}>
          {new Date(ride.createdAt).toLocaleString()}
        </p>
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, textTransform: "capitalize",
        color: statusColor[ride.status] || "#888",
        background: (statusColor[ride.status] || "#888") + "18",
        padding: "4px 12px", borderRadius: 20 }}>{ride.status}</span>
    </div>
  );
}

// ── MAIN DRIVER PAGE ─────────────────────────────────────────────
export default function DriverHome({ user, onLogout }) {
  const [isOnline,     setIsOnline]     = useState(false);
  const [requests,     setRequests]     = useState([]);
  const [activeRide,   setActiveRide]   = useState(null);
  const [history,      setHistory]      = useState([]);
  const [tab,          setTab]          = useState("requests"); // "requests" | "history"
  const [toastMsg,     setToastMsg]     = useState(null);

  function showToast(msg, type = "info") {
    setToastMsg({ msg, type });
    setTimeout(() => setToastMsg(null), 3000);
  }

  // poll store every 1.5s
  useEffect(() => {
    const sync = () => {
      setRequests(rideStore.getPendingRequests(user.id));
      const ar = rideStore.getDriverActiveRide(user.id);
      setActiveRide(ar || null);
      setHistory(rideStore.getDriverHistory(user.id));
      const status = rideStore.getDriverStatus(user.id);
      setIsOnline(status?.isOnline || false);
    };
    sync();
    const id = setInterval(sync, 1500);
    return () => clearInterval(id);
  }, [user.id]);

  function toggleOnline() {
    const next = !isOnline;
    rideStore.setDriverOnline(user.id, user.name, user.vehicle || "E-Rickshaw", next);
    setIsOnline(next);
    showToast(next ? "You are now online and visible to passengers" : "You are offline", next ? "success" : "info");
  }

  function handleAccept(rideId) {
    const ok = rideStore.acceptRide(rideId, user.id, user.name, user.vehicle || "E-Rickshaw");
    if (!ok) { showToast("This ride was already taken by another driver", "error"); return; }
    showToast("Ride accepted! Head to the pickup point.", "success");
  }

  function handleReject(rideId, reason) {
    rideStore.rejectRide(rideId, user.id, reason);
  }

  function handleComplete(rideId) {
    rideStore.completeRide(rideId);
    showToast("Ride completed!", "success");
  }

  const completed = history.filter(r => r.status === "completed").length;
  const rating = user.rating || "4.8";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #f4f4f0; font-family: 'Sora', sans-serif; }
        @keyframes ripple {
          0% { transform: scale(1); opacity: 0.35; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        .tab-btn { border: none; background: none; cursor: pointer;
          padding: 8px 18px; border-radius: 20px; font-size: 13px;
          font-weight: 700; font-family: 'Sora', sans-serif; transition: all 0.2s; }
        .tab-btn.active { background: #111; color: #fff; }
        .tab-btn:not(.active) { color: #888; }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
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
        <div style={{ background: "#fff", borderBottom: "1px solid #eee",
          padding: "14px 24px", display: "flex", alignItems: "center",
          justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "#111",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontSize: 16 }}>🛺</div>
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: "#111" }}>Campus Ride</p>
              <p style={{ margin: 0, fontSize: 11, color: "#888" }}>Driver console</p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <PulseDot color={isOnline ? "#27ae60" : "#ccc"} />
              <span style={{ fontSize: 12, fontWeight: 700,
                color: isOnline ? "#27ae60" : "#999" }}>
                {isOnline ? "Online" : "Offline"}
              </span>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#111" }}>{user.name}</p>
              <p style={{ margin: 0, fontSize: 11, color: "#888" }}>Driver</p>
            </div>
            <button onClick={onLogout} style={{ background: "none", border: "1px solid #eee",
              borderRadius: 8, padding: "6px 14px", fontSize: 12, cursor: "pointer",
              color: "#888", fontFamily: "inherit" }}>Logout</button>
          </div>
        </div>

        <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 16px" }}>

          {/* ── online toggle ── */}
          <div style={{ background: "#fff", borderRadius: 18, padding: 24, marginBottom: 20,
            border: "1px solid #eee" }}>
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
              <div style={{ marginTop: 16, padding: "10px 14px", background: "#f0fff4",
                borderRadius: 10, border: "1px solid #b7f5cf",
                fontSize: 13, color: "#27ae60", fontWeight: 600 }}>
                🟢 Waiting for ride requests near IIT Roorkee campus
              </div>
            )}
            {!isOnline && (
              <div style={{ marginTop: 16, padding: "10px 14px", background: "#f5f5f5",
                borderRadius: 10, border: "1px solid #e5e5e5",
                fontSize: 13, color: "#aaa" }}>
                You won't receive any requests while offline
              </div>
            )}
          </div>

          {/* ── stats ── */}
          <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
            <StatCard label="Rides today" value={completed} sub="completed" color="#1a73e8" />
            <StatCard label="Rating" value={`⭐ ${rating}`} sub="average" />
            <StatCard label="Status" value={isOnline ? "Active" : "Idle"}
              sub={isOnline ? "online" : "offline"} color={isOnline ? "#27ae60" : "#888"} />
          </div>

          {/* ── active ride ── */}
          {activeRide && (
            <ActiveRideCard ride={activeRide} onComplete={handleComplete} />
          )}

          {/* ── requests + history tabs ── */}
          {!activeRide && (
            <>
              <div style={{ background: "#f0f0f0", borderRadius: 12, padding: 4,
                display: "inline-flex", marginBottom: 16 }}>
                <button className={`tab-btn ${tab === "requests" ? "active" : ""}`}
                  onClick={() => setTab("requests")}>
                  Requests {requests.length > 0 && `(${requests.length})`}
                </button>
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

              {tab === "history" && (
                <div style={{ background: "#fff", borderRadius: 18, padding: 20,
                  border: "1px solid #eee" }}>
                  <p style={{ margin: "0 0 12px", fontWeight: 700, fontSize: 15, color: "#111" }}>
                    Ride history
                  </p>
                  {history.length === 0
                    ? <p style={{ color: "#aaa", fontSize: 14, textAlign: "center", padding: "24px 0" }}>
                        No rides yet
                      </p>
                    : history.slice().reverse().map(r => <HistoryRow key={r.id} ride={r} />)
                  }
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
