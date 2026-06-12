// src/pages/PassengerHome.jsx
// npm install leaflet
// Add to index.html <head>:
//   <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />

import { useState, useEffect, useRef } from "react";
import { rideStore } from "../rideStore";
import RatingModal from "./RatingModal";
import socket from "../socket";


// ── IIT Roorkee landmarks ──────────────────────────────────────────
const CAMPUS_CENTER = [29.8673, 77.8956];
const CAMPUS_LOCATIONS = [
  { id: "gate_main", label: "Main Gate", coords: [29.8631, 77.8932] },
  { id: "gate_civil", label: "Civil Lines Gate", coords: [29.8702, 77.8968] },
  { id: "thomso", label: "Thomso Bhawan", coords: [29.8678, 77.8945] },
  { id: "convocation", label: "Convocation Hall", coords: [29.8661, 77.8961] },
  { id: "library", label: "James Thomason Library", coords: [29.8669, 77.8950] },
  { id: "lecture_hall", label: "Lecture Hall Complex", coords: [29.8654, 77.8940] },
  { id: "hostel_bhawan", label: "Bhawan (Hostels)", coords: [29.8690, 77.8980] },
  { id: "sports", label: "Sports Complex", coords: [29.8640, 77.8995] },
  { id: "hospital", label: "IITR Hospital", coords: [29.8710, 77.8925] },
  { id: "admin", label: "Admin Block", coords: [29.8665, 77.8955] },
  { id: "canteen", label: "New Canteen", coords: [29.8680, 77.8942] },
  { id: "workshop", label: "Workshop / Machine Lab", coords: [29.8648, 77.8925] },
];

const STATUS_CONFIG = {
  idle:        { color: "#888",    bg: "#f5f5f5", label: "No active ride" },
  requesting:  { color: "#e67e22", bg: "#fff8f0", label: "Finding a driver…" },
  scheduled:   { color: "#8e44ad", bg: "#f3e5f5", label: "⏱️ Ride scheduled for later" },
  accepted:    { color: "#1a73e8", bg: "#f0f6ff", label: "Driver is heading to your pickup" },
  at_pickup:   { color: "#e67e22", bg: "#fff8f0", label: "📍 Your driver has arrived at pickup!" },
  in_progress: { color: "#8e44ad", bg: "#fdf5ff", label: "🚀 Ride in progress – on the way!" },
  completed:   { color: "#27ae60", bg: "#f0fff4", label: "Ride completed ✓" },
  cancelled:   { color: "#e74c3c", bg: "#fff0f0", label: "Ride cancelled" },
};

// generate a deterministic fake rick plate from driver id
function rickPlate(driverId = "") {
  const codes = ["UK07","UK06","UK14","RJ14","DL01"];
  const code = codes[driverId.charCodeAt(0) % codes.length] || "UK07";
  const num  = ((driverId.charCodeAt(1) || 3) * 137 + 1000) % 9000 + 1000;
  return `${code} E-${num}`;
}

// ── tiny select ───────────────────────────────────────────────────
function LocationSelect({ label, value, onChange, exclude }) {
  return (
    <div style={{ flex: 1 }}>
      <label style={{
        display: "block", fontSize: 11, fontWeight: 700,
        letterSpacing: "0.06em", textTransform: "uppercase",
        color: "#888", marginBottom: 6
      }}>{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          width: "100%", padding: "10px 12px", borderRadius: 10,
          border: "1.5px solid #e5e5e5", background: "#fafafa",
          fontSize: 13, color: "#111", fontFamily: "inherit",
          outline: "none", cursor: "pointer"
        }}
      >
        <option value="">— select —</option>
        {CAMPUS_LOCATIONS.filter(l => l.id !== exclude).map(l => (
          <option key={l.id} value={l.id}>{l.label}</option>
        ))}
      </select>
    </div>
  );
}

// ── small online driver list card ───────────────────────────────────
function DriverCard({ driver }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "10px 14px", borderRadius: 12, background: "#f9f9f9",
      border: "1px solid #eee", marginBottom: 8
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: "50%",
        background: "linear-gradient(135deg,#1a1a2e,#16213e)",
        display: "flex", alignItems: "center",
        justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 14,
        flexShrink: 0
      }}>{driver.name[0]}</div>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "#111" }}>{driver.name}</p>
        <p style={{ margin: 0, fontSize: 12, color: "#888" }}>{rickPlate(driver.id)} · ⭐ {driver.rating}</p>
        <p style={{ margin: "4px 0 0", fontSize: 11, color: "#666" }}>
          {driver.availableSeats != null ? `${driver.availableSeats} seats available` : "Seat info not available"}
        </p>
      </div>
      <span style={{
        fontSize: 11, fontWeight: 700, color: "#27ae60",
        background: "#f0fff4", padding: "3px 10px", borderRadius: 20,
        border: "1px solid #b7f5cf"
      }}>Online</span>
    </div>
  );
}

// ── live driver info card (shown when ride is assigned) ─────────────
function DriverInfoCard({ ride }) {
  if (!ride || !ride.driverName) return null;
  const driverData = rideStore.getDriverStatus(ride.driverId);
  const rating     = driverData?.rating || "4.8";
  const ratings    = rideStore.getRatings(ride.driverId) || [];
  const plate      = ride.rickPlate || rickPlate(ride.driverId);
  const seatsLeft  = driverData?.availableSeats ?? 0;
  const totalSeats = driverData?.totalSeats || 4;

  const statusPill = {
    at_pickup:   { label: "Arrived at pickup 📍",  color: "#e67e22", bg: "#fff3e0" },
    in_progress: { label: "Ride in progress 🚀",  color: "#8e44ad", bg: "#f3e5f5" },
  }[ride.status] || null;

  return (
    <div style={{
      background: "#fff", borderRadius: 18, padding: 20, marginBottom: 16,
      border: "1.5px solid #e5e5e5",
      boxShadow: "0 4px 20px rgba(0,0,0,0.06)"
    }}>
      <p style={{ margin: "0 0 14px", fontSize: 12, fontWeight: 700,
        textTransform: "uppercase", letterSpacing: "0.07em", color: "#aaa" }}>
        Your Driver
      </p>

      {/* top row */}
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start", marginBottom: 16 }}>
        {/* avatar */}
        <div style={{
          width: 58, height: 58, borderRadius: 16, flexShrink: 0,
          background: "linear-gradient(135deg,#1a1a2e 0%,#3a3a6e 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 22, color: "#fff", fontWeight: 800,
          boxShadow: "0 4px 14px rgba(26,26,46,0.35)"
        }}>
          {ride.driverName[0]}
        </div>

        {/* details */}
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontWeight: 800, fontSize: 17, color: "#111" }}>
            {ride.driverName}
          </p>
          <p style={{ margin: "3px 0 6px", fontSize: 13, color: "#666" }}>
            {ride.vehicle || "E-Rickshaw"}
          </p>
          <p style={{ margin: 0, fontSize: 12, color: "#888" }}>
            Seats: <strong style={{ color: "#111" }}>{totalSeats}</strong> · Available: <strong style={{ color: "#27ae60" }}>{seatsLeft}</strong>
          </p>

          {/* rating row */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{
              background: "#111", color: "#fff", borderRadius: 8,
              padding: "3px 10px", fontSize: 12, fontWeight: 700,
              display: "flex", alignItems: "center", gap: 4
            }}>
              ⭐ {rating}
            </span>
            <span style={{ fontSize: 12, color: "#aaa" }}>
              {ratings.length} review{ratings.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {statusPill && (
          <span style={{
            fontSize: 11, fontWeight: 700, padding: "5px 12px",
            borderRadius: 20, whiteSpace: "nowrap",
            background: statusPill.bg, color: statusPill.color,
            border: `1px solid ${statusPill.color}33`
          }}>
            {statusPill.label}
          </span>
        )}
      </div>

      {/* rick number */}
      <div style={{
        background: "#f8f9ff", border: "1.5px dashed #c0ccf0",
        borderRadius: 10, padding: "10px 14px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 14
      }}>
        <div>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: "#888",
            textTransform: "uppercase", letterSpacing: "0.07em" }}>E-Rickshaw No.</p>
          <p style={{ margin: "2px 0 0", fontSize: 16, fontWeight: 800,
            color: "#1a1a2e", letterSpacing: "0.05em" }}>{plate}</p>
        </div>
        <div style={{ fontSize: 28 }}>🛺</div>
      </div>

      {/* recent reviews */}
      {ratings.length > 0 && (
        <div>
          <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700,
            color: "#aaa", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Recent Reviews
          </p>
          {ratings.slice(-2).reverse().map((r, i) => (
            <div key={i} style={{
              background: "#fafafa", borderRadius: 10, padding: "8px 12px",
              marginBottom: 6, border: "1px solid #f0f0f0"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                <span style={{ fontSize: 12 }}>{"\u2b50".repeat(r.stars)}</span>
                <span style={{ fontSize: 11, color: "#aaa" }}>
                  {new Date(r.createdAt).toLocaleDateString()}
                </span>
              </div>
              {r.feedback && (
                <p style={{ margin: 0, fontSize: 12, color: "#555", fontStyle: "italic" }}>
                  "{r.feedback}"
                </p>
              )}
              {r.tags?.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                  {r.tags.map(t => (
                    <span key={t} style={{
                      fontSize: 10, background: "#f0f0f0", borderRadius: 12,
                      padding: "2px 8px", color: "#666"
                    }}>{t}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RideEtaCard({ ride }) {
  const [secondsRemaining, setSecondsRemaining] = useState(30);

  useEffect(() => {
    if (!ride || ride.status !== "in_progress") return undefined;
    const startedAt = ride.startedAt || ride.updatedAt;
    const timerId = setInterval(() => {
      const remaining = 30 - Math.floor((Date.now() - startedAt) / 1000);
      setSecondsRemaining(Math.min(30, Math.max(0, remaining)));
    }, 1000);
    return () => clearInterval(timerId);
  }, [ride]);

  if (!ride || !["accepted", "at_pickup", "in_progress"].includes(ride.status)) return null;

  const destination = CAMPUS_LOCATIONS.find(location => location.id === ride.destination)?.label || ride.destination;
  const isWaitingAtPickup = ride.status === "accepted" || ride.status === "at_pickup";

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      gap: 16, marginBottom: 16, padding: "16px 18px",
      border: "1px solid #d8def5", borderRadius: 16,
      background: "linear-gradient(135deg,#f8f9ff,#eef2ff)"
    }}>
      <div>
        <p style={{
          margin: 0, fontSize: 10, fontWeight: 800, color: "#6676c8",
          textTransform: "uppercase", letterSpacing: "0.08em"
        }}>
          Estimated arrival
        </p>
        <p style={{ margin: "5px 0 0", fontSize: 13, color: "#555" }}>
          {isWaitingAtPickup ? "Driver is at your pickup point" : `To ${destination}`}
        </p>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#111" }}>
          {isWaitingAtPickup ? "Now" : `${secondsRemaining}s`}
        </p>
        <p style={{ margin: "2px 0 0", fontSize: 10, color: "#888" }}>
          {isWaitingAtPickup ? "ready for pickup" : "remaining"}
        </p>
      </div>
    </div>
  );
}

// ── confirm pickup banner (at_pickup) ───────────────────────────
function ConfirmPickupBanner({ ride, onConfirm }) {
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    if (!ride || ride.status !== "at_pickup") return undefined;
    const t = setInterval(() => setPulse(p => !p), 800);
    return () => clearInterval(t);
  }, [ride]);

  if (!ride || ride.status !== "at_pickup") return null;

  return (
    <div style={{
      background: "linear-gradient(135deg,#fff3e0,#ffe0b2)",
      border: "2px solid #e67e22",
      borderRadius: 18, padding: 20, marginBottom: 16,
      boxShadow: "0 8px 32px rgba(230,126,34,0.2)",
      animation: "slideIn 0.4s ease"
    }}>
      {/* animated icon + heading */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <span style={{
          fontSize: 32, display: "inline-block",
          transform: pulse ? "scale(1.15)" : "scale(1)",
          transition: "transform 0.3s"
        }}>&#x1F6FA;</span>
        <div>
          <p style={{ margin: 0, fontWeight: 800, fontSize: 16, color: "#7d4800" }}>
            Your driver has arrived!
          </p>
          <p style={{ margin: "2px 0 0", fontSize: 13, color: "#a06000" }}>
            {ride.driverName} is waiting at {CAMPUS_LOCATIONS.find(l => l.id === ride.pickup)?.label}
          </p>
        </div>
      </div>

      <button
        onClick={() => onConfirm(ride.id)}
        style={{
          width: "100%", padding: "15px 0", borderRadius: 14, border: "none",
          background: "linear-gradient(135deg,#e67e22,#d35400)",
          color: "#fff", fontWeight: 800, fontSize: 16,
          cursor: "pointer", fontFamily: "inherit",
          boxShadow: "0 6px 20px rgba(211,84,0,0.45)",
          letterSpacing: "0.02em",
          transition: "transform 0.15s"
        }}
        onMouseEnter={e => e.currentTarget.style.transform = "scale(1.02)"}
        onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
      >
        ✓ Confirm Pickup &amp; Start Ride
      </button>

      <p style={{ margin: "10px 0 0", fontSize: 11, color: "#a06000", textAlign: "center" }}>
        Tap confirm once you're seated in the rickshaw
      </p>
    </div>
  );
}

// ── ride history tab ──────────────────────────────────────────
const STATUS_BADGE = {
  completed:   { color: "#27ae60", bg: "#f0fff4", label: "Completed" },
  cancelled:   { color: "#e74c3c", bg: "#fff0f0", label: "Cancelled" },
  at_pickup:   { color: "#e67e22", bg: "#fff8f0", label: "At Pickup" },
  in_progress: { color: "#8e44ad", bg: "#f3e5f5", label: "In Progress" },
  requesting:  { color: "#e67e22", bg: "#fff8f0", label: "Requesting" },
  scheduled:   { color: "#8e44ad", bg: "#f3e5f5", label: "Scheduled" },
  accepted:    { color: "#1a73e8", bg: "#e8f0fe", label: "Accepted" },
};

function HistoryRideCard({ ride }) {
  const badge = STATUS_BADGE[ride.status] || { color: "#888", bg: "#f5f5f5", label: ride.status };
  const pickupLabel = CAMPUS_LOCATIONS.find(l => l.id === ride.pickup)?.label || ride.pickup;
  const destLabel   = CAMPUS_LOCATIONS.find(l => l.id === ride.destination)?.label || ride.destination;
  const dateStr = new Date(ride.createdAt).toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  });
  const ratings = ride.rated ? rideStore.getRatings(ride.driverId) : [];
  const myRating = ratings.find(r => r.rideId === ride.id);

  return (
    <div style={{
      background: "#fff", borderRadius: 16, padding: "16px 18px",
      marginBottom: 12, border: "1px solid #eee",
      boxShadow: "0 2px 12px rgba(0,0,0,0.04)"
    }}>
      {/* top row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 15 }}>&#x1F4CD;</span>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "#111" }}>{pickupLabel}</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
            <span style={{ fontSize: 15 }}>&#x1F3C1;</span>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "#e74c3c" }}>{destLabel}</p>
          </div>
        </div>
        <span style={{
          fontSize: 11, fontWeight: 700, padding: "4px 12px",
          borderRadius: 20, background: badge.bg, color: badge.color,
          border: `1px solid ${badge.color}33`, whiteSpace: "nowrap", flexShrink: 0,
          marginLeft: 8
        }}>{badge.label}</span>
      </div>

      {/* divider */}
      <div style={{ borderTop: "1px solid #f0f0f0", margin: "10px 0" }} />

      {/* bottom row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {ride.driverName && (
            <p style={{ margin: 0, fontSize: 12, color: "#555" }}>
              <span style={{ color: "#aaa" }}>Driver:</span> <strong>{ride.driverName}</strong>
              {ride.driverId && <span style={{ color: "#aaa" }}> · {rickPlate(ride.driverId)}</span>}
            </p>
          )}
          {ride.scheduledTime && (
            <p style={{ margin: 0, fontSize: 11, color: "#8e44ad", fontWeight: 700 }}>
              ⏱ Scheduled for: {new Date(ride.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
          <p style={{ margin: 0, fontSize: 11, color: "#bbb" }}>{dateStr}</p>
        </div>
        {myRating && (
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: 13 }}>
              {[1,2,3,4,5].map(s => (
                <span key={s} style={{ color: s <= myRating.stars ? "#f4b942" : "#e0e0e0" }}>★</span>
              ))}
            </div>
            {myRating.feedback && (
              <p style={{ margin: "2px 0 0", fontSize: 11, color: "#aaa", maxWidth: 160,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                "{myRating.feedback}"
              </p>
            )}
          </div>
        )}
        {!myRating && ride.status === "completed" && (
          <span style={{ fontSize: 11, color: "#ccc" }}>Not rated</span>
        )}
      </div>
    </div>
  );
}

function PassengerHistoryTab({ passengerId }) {
  const history = rideStore.getPassengerHistory(passengerId);

  if (history.length === 0) {
    return (
      <div style={{
        background: "#fff", borderRadius: 18, padding: "40px 24px",
        border: "1px solid #eee", textAlign: "center"
      }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>&#x1F6FA;</div>
        <p style={{ fontWeight: 700, fontSize: 16, color: "#333", margin: "0 0 6px" }}>No rides yet</p>
        <p style={{ fontSize: 13, color: "#aaa", margin: 0 }}>Your ride history will appear here</p>
      </div>
    );
  }

  const completed = history.filter(r => r.status === "completed").length;
  const cancelled = history.filter(r => r.status === "cancelled").length;

  return (
    <div>
      {/* summary strip */}
      <div style={{
        display: "flex", gap: 12, marginBottom: 16
      }}>
        {[{label:"Total Rides",val:history.length,color:"#1a73e8"},
          {label:"Completed",val:completed,color:"#27ae60"},
          {label:"Cancelled",val:cancelled,color:"#e74c3c"},
        ].map(s => (
          <div key={s.label} style={{
            flex: 1, background: "#fff", borderRadius: 14,
            padding: "14px 16px", border: "1px solid #eee",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
          }}>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: "#aaa",
              textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</p>
            <p style={{ margin: "4px 0 0", fontSize: 24, fontWeight: 800, color: s.color }}>{s.val}</p>
          </div>
        ))}
      </div>

      {/* ride list */}
      {history.map(r => <HistoryRideCard key={r.id} ride={r} />)}
    </div>
  );
}

// ── ride status bar ──────────────────────────────────────────────
function StatusBar({ ride, onCancel }) {
  if (!ride || ride.status === "idle") return null;
  const cfg = STATUS_CONFIG[ride.status] || STATUS_CONFIG.idle;
  return (
    <div style={{
      padding: "12px 16px", borderRadius: 14, marginBottom: 16,
      background: cfg.bg, border: `1.5px solid ${cfg.color}44`,
      display: "flex", alignItems: "center", justifyContent: "space-between"
    }}>
      <div>
        <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: cfg.color }}>{cfg.label}</p>
        {ride.pickup && (
          <p style={{ margin: "2px 0 0", fontSize: 11, color: "#888" }}>
            {CAMPUS_LOCATIONS.find(l => l.id === ride.pickup)?.label} → {CAMPUS_LOCATIONS.find(l => l.id === ride.destination)?.label}
          </p>
        )}
      </div>
      {(ride.status === "requesting" || ride.status === "accepted" || ride.status === "scheduled") && (
        <button onClick={onCancel} style={{
          background: "#fff0f0", border: "1px solid #fcc",
          color: "#e74c3c", borderRadius: 8, padding: "6px 14px",
          fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit"
        }}>Cancel</button>
      )}
      {ride.status === "completed" && (
        <span style={{ fontSize: 22 }}>✓</span>
      )}
    </div>
  );
}

// ── map component ─────────────────────────────────────────────────
// Three separate effects to avoid unnecessary re-renders:
//  1. Map init (once)
//  2. Static location pins + route (only on pickup/destination change)
//  3. Driver markers (only when driver positions change)
function CampusMap({ pickupId, destinationId, drivers, onLocationClick }) {
  const mapRef          = useRef(null);
  const mapInstance     = useRef(null);
  const locationMarkersRef = useRef([]);
  const routeRef        = useRef(null);
  const driverMarkersRef = useRef(new Map());  // id → { marker, targetLat, targetLng, rafId }
  const lastRouteRef    = useRef({ pickupId: null, destinationId: null });

  // ── Effect 1: init map (runs once) ──────────────────────────────
  useEffect(() => {
    if (mapInstance.current || typeof window === "undefined" || !window.L) return;
    const L = window.L;
    const map = L.map(mapRef.current, { center: CAMPUS_CENTER, zoom: 15.5, zoomControl: true });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors", maxZoom: 19,
    }).addTo(map);
    L.polygon(
      [[29.8610,77.8900],[29.8730,77.8900],[29.8730,77.9020],[29.8610,77.9020]],
      { color:"#1a73e8", weight:2, fillColor:"#1a73e8", fillOpacity:0.05, dashArray:"6 4" }
    ).addTo(map);
    mapInstance.current = map;
  }, []);

  // ── Effect 2: static pins + route (only on pickup/dest change) ──
  useEffect(() => {
    if (!mapInstance.current || !window.L) return;
    const L = window.L;
    const map = mapInstance.current;

    // Remove old static markers and route
    locationMarkersRef.current.forEach(m => map.removeLayer(m));
    locationMarkersRef.current = [];
    if (routeRef.current) { map.removeLayer(routeRef.current); routeRef.current = null; }

    const makeIcon = (color, size) => L.divIcon({
      className: "",
      html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};
             border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.25);"></div>`,
      iconSize: [size, size], iconAnchor: [size/2, size/2],
    });

    CAMPUS_LOCATIONS.forEach(loc => {
      const isPickup = loc.id === pickupId;
      const isDest   = loc.id === destinationId;
      const color = isPickup ? "#27ae60" : isDest ? "#e74c3c" : "#ccc";
      const size  = (isPickup || isDest) ? 32 : 16;
      const m = L.marker(loc.coords, { icon: makeIcon(color, size) })
        .addTo(map)
        .bindTooltip(loc.label, { permanent: isPickup || isDest, direction: "top", offset: [0, -size/2] })
        .on("click", () => onLocationClick(loc.id));
      locationMarkersRef.current.push(m);
    });

    if (pickupId && destinationId) {
      const p = CAMPUS_LOCATIONS.find(l => l.id === pickupId);
      const d = CAMPUS_LOCATIONS.find(l => l.id === destinationId);
      if (p && d) {
        routeRef.current = L.polyline([p.coords, d.coords], {
          color: "#1a73e8", weight: 4, dashArray: "8 5", opacity: 0.8,
        }).addTo(map);
        if (lastRouteRef.current.pickupId !== pickupId || lastRouteRef.current.destinationId !== destinationId) {
          map.fitBounds([p.coords, d.coords], { padding: [60, 60] });
        }
      }
    }
    lastRouteRef.current = { pickupId, destinationId };
  }, [pickupId, destinationId]);

  // ── Effect 3: driver markers with RAF interpolation ──────────────
  useEffect(() => {
    if (!mapInstance.current || !window.L) return;
    const L   = window.L;
    const map = mapInstance.current;

    const currentIds = new Set();

    drivers.forEach(driver => {
      if (!driver.coords) return;
      currentIds.add(driver.id);

      const entry = driverMarkersRef.current.get(driver.id);

      if (entry) {
        entry.targetLat = driver.coords[0];
        entry.targetLng = driver.coords[1];

      } else {
        const dIcon = L.divIcon({
          className: "",
          html: `<div style="
            background: linear-gradient(135deg,#1a1a2e,#16213e);
            color:#fff; padding:5px 10px; border-radius:20px;
            font-size:11px; font-weight:700; white-space:nowrap;
            box-shadow:0 3px 14px rgba(0,0,0,0.4),0 0 0 2px rgba(255,255,255,0.12);
            display:flex; align-items:center; gap:4px; letter-spacing:.02em;
          ">🛺 ${driver.name.split(" ")[0]}</div>`,
          iconAnchor: [0, 0],
        });

        const marker = L.marker(driver.coords, { icon: dIcon }).addTo(map);

        const state = {
          marker,
          curLat: driver.coords[0],
          curLng: driver.coords[1],
          targetLat: driver.coords[0],
          targetLng: driver.coords[1],
          rafId: null,
          alive: true,
        };

        const SMOOTHING = 0.07;

        function tick() {
          if (!state.alive) return;

          const dLat = state.targetLat - state.curLat;
          const dLng = state.targetLng - state.curLng;

          if (Math.abs(dLat) > 0.000001 || Math.abs(dLng) > 0.000001) {
            state.curLat += dLat * SMOOTHING;
            state.curLng += dLng * SMOOTHING;
            state.marker.setLatLng([state.curLat, state.curLng]);
          }

          state.rafId = requestAnimationFrame(tick);
        }

        state.rafId = requestAnimationFrame(tick);
        driverMarkersRef.current.set(driver.id, state);
      }
    });

    driverMarkersRef.current.forEach((state, id) => {
      if (!currentIds.has(id)) {
        state.alive = false;
        if (state.rafId) cancelAnimationFrame(state.rafId);
        map.removeLayer(state.marker);
        driverMarkersRef.current.delete(id);
      }
    });
  }, [drivers]);

  return (
    <div style={{ position: "relative" }}>
      <div ref={mapRef} style={{
        width: "100%", height: 340, borderRadius: 16,
        border: "1.5px solid #e5e5e5", overflow: "hidden"
      }} />
      <div style={{
        position: "absolute", top: 10, left: 10, background: "#ffffffdd",
        borderRadius: 10, padding: "6px 12px", fontSize: 11, color: "#555",
        backdropFilter: "blur(4px)", border: "1px solid #eee"
      }}>
        🟢 Pickup &nbsp; 🔴 Drop &nbsp; 🛺 Driver
      </div>
    </div>
  );
}

// ── wallet modal ──────────────────────────────────────────────────
function WalletModal({ balance, onAdd, onClose }) {
  const [amount, setAmount] = useState(100);
  const [method, setMethod] = useState("upi");

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
          <p style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Add Funds</p>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer" }}>✕</button>
        </div>

        <p style={{ margin: "0 0 16px", fontSize: 14, color: "#555" }}>Current Balance: <strong style={{ color: "#27ae60" }}>₹{balance}</strong></p>

        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#888", marginBottom: 6 }}>Amount (₹)</label>
        <input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))}
          style={{ width: "100%", padding: "12px", borderRadius: 10, border: "1.5px solid #eee", marginBottom: 16, fontSize: 16, fontFamily: "inherit" }} />

        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#888", marginBottom: 6 }}>Payment Method</label>
        <select value={method} onChange={e => setMethod(e.target.value)}
          style={{ width: "100%", padding: "12px", borderRadius: 10, border: "1.5px solid #eee", marginBottom: 24, fontSize: 14, fontFamily: "inherit", background: "#fafafa" }}>
          <option value="upi">UPI (GPay, PhonePe, Paytm)</option>
          <option value="card">Credit / Debit Card</option>
          <option value="netbanking">Net Banking</option>
        </select>

        <button onClick={() => onAdd(amount)}
          style={{ width: "100%", padding: "14px 0", borderRadius: 12, background: "#111", color: "#fff", fontWeight: 700, border: "none", cursor: "pointer", fontFamily: "inherit" }}>
          Proceed to Pay ₹{amount}
        </button>
      </div>
    </div>
  );
}

// ── MAIN PASSENGER PAGE ───────────────────────────────────────────
export default function PassengerHome({ user, onLogout }) {
  const [pickup, setPickup]           = useState("");
  const [destination, setDestination] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [passengerCount, setPassengerCount] = useState(1);
  const [ride, setRide]               = useState(null);
  const [drivers, setDrivers]         = useState([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [mapClickMode, setMapClickMode] = useState(null);
  const [tab, setTab]                 = useState("request"); // "request" | "drivers" | "history"
  const [showRating, setShowRating]   = useState(false);
  const [showWallet, setShowWallet]   = useState(false);
  const prevStatusRef = useRef(null);

const syncRideData = async () => {
  try {
    const res = await fetch(
      `${API_BASE}/drivers/available`
    );

    const data = await res.json();

    if (data.success) {
      setDrivers(data.onlineDrivers);
    }
  } catch (err) {
    console.log(err);
  }

  setWalletBalance(
    rideStore.getUserWallet(user.id)
  );

  const myRide =
    rideStore.getPassengerRide(user.id);

  if (myRide) {
    if (
      myRide.status === "completed" &&
      prevStatusRef.current !== "completed"
    ) {
      setShowRating(true);
    }

    prevStatusRef.current = myRide.status;
    setRide(myRide);
  }
};

  // poll store every 1.5 s
  useEffect(() => {
    const timeoutId = setTimeout(syncRideData, 0);
    const id = setInterval(syncRideData, 1500);
    return () => {
      clearTimeout(timeoutId);
      clearInterval(id);
    };
  }, [user.id]);

  // socket listeners
  useEffect(() => {
    socket.on("driver-status-update",   syncRideData);
    socket.on("driver-location-update", syncRideData);
    socket.on("ride-accepted-update",   syncRideData);
    socket.on("ride-arrived-update",    syncRideData);
    socket.on("ride-started-update",    syncRideData);
    socket.on("ride-completed-update",  syncRideData);
    socket.on("ride-cancelled-update",  syncRideData);
    socket.on("wallet-update-event",    syncRideData);
    return () => {
      socket.off("driver-status-update",   syncRideData);
      socket.off("driver-location-update", syncRideData);
      socket.off("ride-accepted-update",   syncRideData);
      socket.off("ride-arrived-update",    syncRideData);
      socket.off("ride-started-update",    syncRideData);
      socket.off("ride-completed-update",  syncRideData);
      socket.off("ride-cancelled-update",  syncRideData);
      socket.off("wallet-update-event",    syncRideData);
    };
  }, []);

  function handleRequestRide() {
    if (!pickup || !destination) return;

    const onlineDrivers = rideStore.getOnlineDrivers();
    if (onlineDrivers.length === 0) return;

    let st = null;
    if (scheduleTime) {
      const mins = parseInt(scheduleTime.split("_")[1]);
      st = Date.now() + mins * 60000;
    }

    const newRide = rideStore.requestRide({
      passengerId: user.id,
      passengerName: user.name,
      pickup,
      destination,
      scheduledTime: st,
      passengerCount,
      seatsRequired: passengerCount,
    });

    if (st) {
      socket.emit("ride-scheduled", newRide);
    } else {
      socket.emit("ride-request", newRide);
    }

    setRide(newRide);
    setScheduleTime(""); // reset schedule
    setPassengerCount(1);
  }

  function handleCancel() {
    if (!ride) return;
    rideStore.cancelRide(ride.id, "passenger");
    socket.emit("ride-cancelled", ride);
    setRide({ ...ride, status: "cancelled" });
  }

  function handleAddFunds(amount) {
    rideStore.addFunds(user.id, amount);
    socket.emit("wallet-update", { passengerId: user.id });
    setShowWallet(false);
  }

  function handleConfirmPickup(rideId) {
    // Passenger confirms they're in the rickshaw → start the ride
    rideStore.startRide(rideId);
    socket.emit("ride-started", { rideId, status: "in_progress", driverId: ride?.driverId });
    syncRideData();
  }

  function handleMapClick(locId) {
    if (mapClickMode === "pickup")      { setPickup(locId);      setMapClickMode(null); }
    else if (mapClickMode === "destination") { setDestination(locId); setMapClickMode(null); }
  }

  const activeRide = ride && ![ "idle", "completed", "cancelled" ].includes(ride.status);
  const showDriverCard = ride && ["accepted","at_pickup","in_progress"].includes(ride.status);
  const activeDriverFit = rideStore.getAvailableDrivers(passengerCount);
  const hasSuitableDriver = activeDriverFit.length > 0;
  const canSubmitRequest = pickup && destination && !activeRide && drivers.length > 0;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&display=swap');
        @keyframes slideIn { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes ripple  { 0%{box-shadow:0 0 0 0 rgba(230,126,34,.5)} 100%{box-shadow:0 0 0 10px rgba(230,126,34,0)} }
      `}</style>
      <div style={{ minHeight: "100vh", background: "#f4f4f0", fontFamily: "'Sora', sans-serif" }}>

        {/* navbar */}
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
            }}>🎓</div>
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: "#111" }}>Campus Ride</p>
              <p style={{ margin: 0, fontSize: 11, color: "#888" }}>IIT Roorkee</p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div onClick={() => setShowWallet(true)} style={{ marginRight: 20, textAlign: "right", paddingRight: 20, borderRight: "1px solid #eee", cursor: "pointer" }}>
              <p style={{ margin: 0, fontSize: 10, color: "#888", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Wallet <span>+</span></p>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#27ae60" }}>₹{walletBalance}</p>
            </div>
            <div style={{ textAlign: "right", marginRight: 12 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#111" }}>{user.name}</p>
              <p style={{ margin: 0, fontSize: 11, color: "#888" }}>Passenger</p>
            </div>
            <button onClick={onLogout} style={{
              background: "none", border: "1px solid #eee",
              borderRadius: 8, padding: "6px 14px", fontSize: 12, cursor: "pointer",
              color: "#888", fontFamily: "inherit"
            }}>Logout</button>
          </div>
        </div>

        <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px" }}>

          {/* status bar */}
          <StatusBar ride={ride} onCancel={handleCancel} />

          {/* confirm pickup banner – glows when driver has arrived */}
          <ConfirmPickupBanner ride={ride} onConfirm={handleConfirmPickup} />

          {/* live driver info card */}
          {showDriverCard && <DriverInfoCard ride={ride} />}

          <RideEtaCard ride={ride} />

          {/* map */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: "#111" }}>IIT Roorkee Campus</p>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className={`map-btn ${mapClickMode === "pickup" ? "active" : ""}`}
                  onClick={() => setMapClickMode(m => m === "pickup" ? null : "pickup")}>
                  📍 Set pickup
                </button>
                <button
                  className={`map-btn ${mapClickMode === "destination" ? "active" : ""}`}
                  onClick={() => setMapClickMode(m => m === "destination" ? null : "destination")}>
                  🏁 Set drop
                </button>
              </div>
            </div>
            {mapClickMode && (
              <p style={{ fontSize: 12, color: "#1a73e8", marginBottom: 8, fontWeight: 600 }}>
                👆 Click a location pin on the map to set {mapClickMode === "pickup" ? "pickup" : "destination"}
              </p>
            )}
            <CampusMap pickupId={pickup} destinationId={destination} drivers={drivers} onLocationClick={handleMapClick} />
          </div>

          {/* tabs */}
          <div className="ride-tab-bar passenger-tabs">
            <button className={`tab-btn ${tab === "request" ? "active" : ""}`}
              onClick={() => setTab("request")}>Request Ride</button>
            <button className={`tab-btn ${tab === "drivers" ? "active" : ""}`}
              onClick={() => setTab("drivers")}>
              Online Drivers ({drivers.length})
            </button>
            <button className={`tab-btn ${tab === "history" ? "active" : ""}`}
              onClick={() => setTab("history")}>My History</button>
          </div>

          {/* REQUEST tab */}
          {tab === "request" && (
            <div style={{ background: "#fff", borderRadius: 18, padding: 24, border: "1px solid #eee" }}>
              <div style={{ display: "flex", gap: 14, marginBottom: 18 }}>
                <LocationSelect label="Pickup location" value={pickup} onChange={setPickup} exclude={destination} />
                <LocationSelect label="Drop-off location" value={destination} onChange={setDestination} exclude={pickup} />
              </div>

              {/* Schedule time picker & Passenger count */}
              <div style={{ display: "flex", gap: 14, marginBottom: 18 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#888", marginBottom: 6 }}>Pickup Time</label>
                  <select value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1.5px solid #e5e5e5", background: "#fafafa", fontSize: 13, fontFamily: "inherit" }}>
                    <option value="">Now (Immediate)</option>
                    <option value="in_15">In 15 minutes</option>
                    <option value="in_30">In 30 minutes</option>
                    <option value="in_60">In 1 hour</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#888", marginBottom: 6 }}>Passengers</label>
                  <select value={passengerCount} onChange={e => setPassengerCount(Number(e.target.value))} style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1.5px solid #e5e5e5", background: "#fafafa", fontSize: 13, fontFamily: "inherit" }}>
                    <option value={1}>1 (₹10)</option>
                    <option value={2}>2 (₹20)</option>
                    <option value={3}>3 (₹30)</option>
                    <option value={4}>4 (₹40)</option>
                  </select>
                </div>
              </div>

              {pickup && destination && (
                <div style={{
                  background: "#f8f9ff", borderRadius: 12, padding: "12px 16px",
                  marginBottom: 18, display: "flex", gap: 20, border: "1px solid #e0e5ff"
                }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>From</p>
                    <p style={{ margin: "2px 0 0", fontSize: 13, fontWeight: 700, color: "#111" }}>
                      {CAMPUS_LOCATIONS.find(l => l.id === pickup)?.label}
                    </p>
                  </div>
                  <div style={{ fontSize: 20, alignSelf: "center", color: "#bbb" }}>→</div>
                  <div>
                    <p style={{ margin: 0, fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>To</p>
                    <p style={{ margin: "2px 0 0", fontSize: 13, fontWeight: 700, color: "#111" }}>
                      {CAMPUS_LOCATIONS.find(l => l.id === destination)?.label}
                    </p>
                  </div>
                </div>
              )}

              {drivers.length === 0 && (
                <div style={{
                  background: "#fff8f0", border: "1px solid #ffe0b2",
                  borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#e67e22"
                }}>
                  ⚠️ No drivers are online right now. Try again shortly.
                </div>
              )}

              {drivers.length > 0 && !hasSuitableDriver && (
                <div style={{
                  background: "#fff8f0", border: "1px solid #ffe0b2",
                  borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#e67e22"
                }}>
                  ⚠️ Matching drivers may be busy right now. You can still request the ride; only a driver with {passengerCount} available seat{passengerCount > 1 ? "s" : ""} can accept it.
                </div>
              )}

              <button
                onClick={handleRequestRide}
                disabled={!canSubmitRequest}
                style={{
                  width: "100%", padding: "14px 0", borderRadius: 12,
                  background: !canSubmitRequest ? "#ddd" : "#111",
                  color: !canSubmitRequest ? "#999" : "#fff",
                  fontWeight: 700, fontSize: 15, border: "none",
                  cursor: !canSubmitRequest ? "not-allowed" : "pointer",
                  fontFamily: "inherit", letterSpacing: "0.01em",
                }}>
                {activeRide ? `Ride ${ride.status}…` : scheduleTime ? "Schedule E-Rickshaw ⏱️" : "Request E-Rickshaw 🛺"}
              </button>

              {ride?.status === "completed" && (
                <button onClick={() => { setRide(null); setPickup(""); setDestination(""); }}
                  style={{
                    width: "100%", marginTop: 10, padding: "12px 0", borderRadius: 12,
                    background: "#f0fff4", border: "1.5px solid #b7f5cf", color: "#27ae60",
                    fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit"
                  }}>
                  Book another ride
                </button>
              )}
            </div>
          )}

          {/* DRIVERS tab */}
          {tab === "drivers" && (
            <div style={{ background: "#fff", borderRadius: 18, padding: 24, border: "1px solid #eee" }}>
              <p style={{ margin: "0 0 16px", fontWeight: 700, fontSize: 15, color: "#111" }}>
                Available drivers near campus
              </p>
              {drivers.length === 0
                ? <p style={{ color: "#aaa", fontSize: 14, textAlign: "center", padding: "32px 0" }}>No drivers online right now</p>
                : drivers.map(d => <DriverCard key={d.id} driver={d} />)
              }
            </div>
          )}

          {/* HISTORY tab */}
          {tab === "history" && <PassengerHistoryTab passengerId={user.id} />}

        </div>
      </div>

      {/* Rating modal */}
      {showRating && ride && ride.status === "completed" && (
        <RatingModal
          ride={ride}
          onSubmit={() => setShowRating(false)}
          onSkip={() => setShowRating(false)}
        />
      )}

      {showWallet && <WalletModal balance={walletBalance} onAdd={handleAddFunds} onClose={() => setShowWallet(false)} />}
    </>
  );
}
