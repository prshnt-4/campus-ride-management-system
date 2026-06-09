// src/pages/PassengerHome.jsx
// npm install leaflet
// Add to index.html <head>:
//   <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />

import { useState, useEffect, useRef } from "react";
import { rideStore } from "../rideStore";
import RatingModal from "./RatingModal";

// ── IIT Roorkee landmarks ──────────────────────────────────────────
const CAMPUS_CENTER = [29.8673, 77.8956];
const CAMPUS_LOCATIONS = [
  { id: "gate_main",    label: "Main Gate",            coords: [29.8631, 77.8932] },
  { id: "gate_civil",   label: "Civil Lines Gate",     coords: [29.8702, 77.8968] },
  { id: "thomso",       label: "Thomso Bhawan",        coords: [29.8678, 77.8945] },
  { id: "convocation",  label: "Convocation Hall",     coords: [29.8661, 77.8961] },
  { id: "library",      label: "James Thomason Library",coords:[29.8669, 77.8950] },
  { id: "lecture_hall", label: "Lecture Hall Complex", coords: [29.8654, 77.8940] },
  { id: "hostel_bhawan",label: "Bhawan (Hostels)",     coords: [29.8690, 77.8980] },
  { id: "sports",       label: "Sports Complex",       coords: [29.8640, 77.8995] },
  { id: "hospital",     label: "IITR Hospital",        coords: [29.8710, 77.8925] },
  { id: "admin",        label: "Admin Block",          coords: [29.8665, 77.8955] },
  { id: "canteen",      label: "New Canteen",          coords: [29.8680, 77.8942] },
  { id: "workshop",     label: "Workshop / Machine Lab",coords:[29.8648, 77.8925] },
];

const STATUS_CONFIG = {
  idle:       { color: "#888",    bg: "#f5f5f5", label: "No active ride" },
  requesting: { color: "#e67e22", bg: "#fff8f0", label: "Finding a driver…" },
  accepted:   { color: "#1a73e8", bg: "#f0f6ff", label: "Driver is coming" },
  in_progress:{ color: "#8e44ad", bg: "#fdf5ff", label: "Ride in progress" },
  completed:  { color: "#27ae60", bg: "#f0fff4", label: "Ride completed" },
  cancelled:  { color: "#e74c3c", bg: "#fff0f0", label: "Ride cancelled" },
};

// ── tiny select ───────────────────────────────────────────────────
function LocationSelect({ label, value, onChange, exclude }) {
  return (
    <div style={{ flex: 1 }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 700,
        letterSpacing: "0.06em", textTransform: "uppercase",
        color: "#888", marginBottom: 6 }}>{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ width: "100%", padding: "10px 12px", borderRadius: 10,
          border: "1.5px solid #e5e5e5", background: "#fafafa",
          fontSize: 13, color: "#111", fontFamily: "inherit",
          outline: "none", cursor: "pointer" }}
      >
        <option value="">— select —</option>
        {CAMPUS_LOCATIONS.filter(l => l.id !== exclude).map(l => (
          <option key={l.id} value={l.id}>{l.label}</option>
        ))}
      </select>
    </div>
  );
}

// ── driver card ───────────────────────────────────────────────────
function DriverCard({ driver }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12,
      padding: "10px 14px", borderRadius: 12, background: "#f9f9f9",
      border: "1px solid #eee", marginBottom: 8 }}>
      <div style={{ width: 38, height: 38, borderRadius: "50%",
        background: "#111", display: "flex", alignItems: "center",
        justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 14,
        flexShrink: 0 }}>{driver.name[0]}</div>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "#111" }}>{driver.name}</p>
        <p style={{ margin: 0, fontSize: 12, color: "#888" }}>{driver.vehicle} · ⭐ {driver.rating}</p>
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color: "#27ae60",
        background: "#f0fff4", padding: "3px 10px", borderRadius: 20,
        border: "1px solid #b7f5cf" }}>Online</span>
    </div>
  );
}

// ── ride status bar ───────────────────────────────────────────────
function StatusBar({ ride, onCancel }) {
  if (!ride || ride.status === "idle") return null;
  const cfg = STATUS_CONFIG[ride.status] || STATUS_CONFIG.idle;
  return (
    <div style={{ padding: "14px 18px", borderRadius: 14, marginBottom: 16,
      background: cfg.bg, border: `1.5px solid ${cfg.color}22` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: cfg.color }}>{cfg.label}</p>
          {ride.driverName && (
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#555" }}>
              Driver: <strong>{ride.driverName}</strong> · {ride.vehicle}
            </p>
          )}
          {ride.pickup && (
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "#888" }}>
              {CAMPUS_LOCATIONS.find(l=>l.id===ride.pickup)?.label} → {CAMPUS_LOCATIONS.find(l=>l.id===ride.destination)?.label}
            </p>
          )}
        </div>
        {(ride.status === "requesting" || ride.status === "accepted") && (
          <button onClick={onCancel} style={{ background: "#fff0f0", border: "1px solid #fcc",
            color: "#e74c3c", borderRadius: 8, padding: "6px 14px",
            fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            Cancel
          </button>
        )}
        {ride.status === "completed" && (
          <span style={{ fontSize: 22 }}>✓</span>
        )}
      </div>
    </div>
  );
}

// ── map component ─────────────────────────────────────────────────
function CampusMap({ pickupId, destinationId, drivers, onLocationClick }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    if (mapInstance.current) return;
    if (typeof window === "undefined" || !window.L) return;
    const L = window.L;
    const map = L.map(mapRef.current, { center: CAMPUS_CENTER, zoom: 15.5, zoomControl: true });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);
    mapInstance.current = map;

    // campus boundary polygon (approximate IIT Roorkee boundary)
    const boundary = [
      [29.8620, 77.8900],[29.8720, 77.8900],[29.8720, 77.9010],[29.8620, 77.9010]
    ];
    L.polygon(boundary, {
      color: "#1a73e8", weight: 2, fillColor: "#1a73e8", fillOpacity: 0.05, dashArray: "6 4"
    }).addTo(map);
  }, []);

  useEffect(() => {
    if (!mapInstance.current || !window.L) return;
    const L = window.L;
    const map = mapInstance.current;
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];

    const makeIcon = (color, size = 28) => L.divIcon({
      className: "",
      html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};
              border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.25);
              display:flex;align-items:center;justify-content:center;"></div>`,
      iconSize: [size, size], iconAnchor: [size/2, size/2],
    });

    // campus location pins
    CAMPUS_LOCATIONS.forEach(loc => {
      const isPickup = loc.id === pickupId;
      const isDest   = loc.id === destinationId;
      const color = isPickup ? "#27ae60" : isDest ? "#e74c3c" : "#ccc";
      const size  = (isPickup || isDest) ? 32 : 16;
      const marker = L.marker(loc.coords, { icon: makeIcon(color, size) })
        .addTo(map)
        .bindTooltip(loc.label, { permanent: isPickup || isDest, direction: "top", offset: [0, -size/2] })
        .on("click", () => onLocationClick(loc.id));
      markersRef.current.push(marker);
    });

    // draw route line if both selected
    if (pickupId && destinationId) {
      const p = CAMPUS_LOCATIONS.find(l => l.id === pickupId);
      const d = CAMPUS_LOCATIONS.find(l => l.id === destinationId);
      if (p && d) {
        const line = window.L.polyline([p.coords, d.coords], {
          color: "#1a73e8", weight: 4, dashArray: "8 5", opacity: 0.8,
        }).addTo(map);
        markersRef.current.push(line);
        map.fitBounds([p.coords, d.coords], { padding: [60, 60] });
      }
    }

    // driver markers
    drivers.forEach(driver => {
      if (!driver.coords) return;
      const dIcon = L.divIcon({
        className: "",
        html: `<div style="background:#111;color:#fff;padding:4px 8px;border-radius:20px;
                font-size:11px;font-weight:700;white-space:nowrap;
                box-shadow:0 2px 8px rgba(0,0,0,0.3);">🛺 ${driver.name.split(" ")[0]}</div>`,
        iconAnchor: [0, 0],
      });
      const m = L.marker(driver.coords, { icon: dIcon }).addTo(map);
      markersRef.current.push(m);
    });
  }, [pickupId, destinationId, drivers]);

  return (
    <div style={{ position: "relative" }}>
      <div ref={mapRef} style={{ width: "100%", height: 340, borderRadius: 16,
        border: "1.5px solid #e5e5e5", overflow: "hidden" }} />
      <div style={{ position: "absolute", top: 10, left: 10, background: "#ffffffdd",
        borderRadius: 10, padding: "6px 12px", fontSize: 11, color: "#555",
        backdropFilter: "blur(4px)", border: "1px solid #eee" }}>
        🟢 Pickup &nbsp; 🔴 Drop &nbsp; 🛺 Driver
      </div>
    </div>
  );
}

// ── MAIN PASSENGER PAGE ───────────────────────────────────────────
export default function PassengerHome({ user, onLogout }) {
  const [pickup,      setPickup]      = useState("");
  const [destination, setDestination] = useState("");
  const [ride,        setRide]        = useState(null);
  const [drivers,     setDrivers]     = useState([]);
  const [mapClickMode,setMapClickMode]= useState(null); // "pickup" | "destination" | null
  const [tab,         setTab]         = useState("request"); // "request" | "drivers"
  const [showRating,  setShowRating]  = useState(false);
  const prevStatusRef = useRef(null);

  // poll store every 2s for live updates
  useEffect(() => {
    const sync = () => {
      setDrivers(rideStore.getOnlineDrivers());
      const myRide = rideStore.getPassengerRide(user.id);
      if (myRide) {
        // trigger rating modal the moment status flips to "completed"
        if (myRide.status === "completed" && prevStatusRef.current !== "completed" && !myRide.rated) {
          setShowRating(true);
        }
        prevStatusRef.current = myRide.status;
        setRide(myRide);
      }
    };
    sync();
    const id = setInterval(sync, 2000);
    return () => clearInterval(id);
  }, [user.id]);

  function handleRequestRide() {
    if (!pickup || !destination) return;
    const newRide = rideStore.requestRide({
      passengerId: user.id,
      passengerName: user.name,
      pickup,
      destination,
    });
    setRide(newRide);
  }

  function handleCancel() {
    if (!ride) return;

    rideStore.cancelRide(ride.id, "passenger");
    setRide({ ...ride, status: "cancelled" });
  }

  function handleMapClick(locId) {
    if (mapClickMode === "pickup") { setPickup(locId); setMapClickMode(null); }
    else if (mapClickMode === "destination") { setDestination(locId); setMapClickMode(null); }
  }

  const activeRide = ride && ride.status !== "idle" && ride.status !== "completed" && ride.status !== "cancelled";
  const cfg = STATUS_CONFIG[ride?.status] || STATUS_CONFIG.idle;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&display=swap');
      `}</style>
      <div style={{ minHeight: "100vh", background: "#f4f4f0", fontFamily: "'Sora', sans-serif" }}>

        {/* ── navbar ── */}
        <div style={{ background: "#fff", borderBottom: "1px solid #eee",
          padding: "14px 24px", display: "flex", alignItems: "center",
          justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "#111",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontSize: 16 }}>🎓</div>
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: "#111" }}>Campus Ride</p>
              <p style={{ margin: 0, fontSize: 11, color: "#888" }}>IIT Roorkee</p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ textAlign: "right" }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#111" }}>{user.name}</p>
              <p style={{ margin: 0, fontSize: 11, color: "#888" }}>Passenger</p>
            </div>
            <button onClick={onLogout} style={{ background: "none", border: "1px solid #eee",
              borderRadius: 8, padding: "6px 14px", fontSize: 12, cursor: "pointer",
              color: "#888", fontFamily: "inherit" }}>Logout</button>
          </div>
        </div>

        <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px" }}>

          {/* ── status bar ── */}
          <StatusBar ride={ride} onCancel={handleCancel} />

          {/* ── map ── */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: "#111" }}>
                IIT Roorkee Campus
              </p>
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
            <CampusMap
              pickupId={pickup}
              destinationId={destination}
              drivers={drivers}
              onLocationClick={handleMapClick}
            />
          </div>

          {/* ── tabs ── */}
          <div style={{ background: "#f0f0f0", borderRadius: 12, padding: 4,
            display: "inline-flex", marginBottom: 20 }}>
            <button className={`tab-btn ${tab === "request" ? "active" : ""}`}
              onClick={() => setTab("request")}>Request Ride</button>
            <button className={`tab-btn ${tab === "drivers" ? "active" : ""}`}
              onClick={() => setTab("drivers")}>
              Online Drivers ({drivers.length})
            </button>
          </div>

          {/* ── request tab ── */}
          {tab === "request" && (
            <div style={{ background: "#fff", borderRadius: 18, padding: 24,
              border: "1px solid #eee" }}>
              <div style={{ display: "flex", gap: 14, marginBottom: 18 }}>
                <LocationSelect label="Pickup location" value={pickup}
                  onChange={setPickup} exclude={destination} />
                <LocationSelect label="Drop-off location" value={destination}
                  onChange={setDestination} exclude={pickup} />
              </div>

              {pickup && destination && (
                <div style={{ background: "#f8f9ff", borderRadius: 12, padding: "12px 16px",
                  marginBottom: 18, display: "flex", gap: 20, border: "1px solid #e0e5ff" }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 11, color: "#888", textTransform: "uppercase",
                      letterSpacing: "0.06em", fontWeight: 700 }}>From</p>
                    <p style={{ margin: "2px 0 0", fontSize: 13, fontWeight: 700, color: "#111" }}>
                      {CAMPUS_LOCATIONS.find(l => l.id === pickup)?.label}
                    </p>
                  </div>
                  <div style={{ fontSize: 20, alignSelf: "center", color: "#bbb" }}>→</div>
                  <div>
                    <p style={{ margin: 0, fontSize: 11, color: "#888", textTransform: "uppercase",
                      letterSpacing: "0.06em", fontWeight: 700 }}>To</p>
                    <p style={{ margin: "2px 0 0", fontSize: 13, fontWeight: 700, color: "#111" }}>
                      {CAMPUS_LOCATIONS.find(l => l.id === destination)?.label}
                    </p>
                  </div>
                </div>
              )}

              {drivers.length === 0 && (
                <div style={{ background: "#fff8f0", border: "1px solid #ffe0b2",
                  borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#e67e22" }}>
                  ⚠️ No drivers are online right now. Try again shortly.
                </div>
              )}

              <button
                onClick={handleRequestRide}
                disabled={!pickup || !destination || activeRide || drivers.length === 0}
                style={{
                  width: "100%", padding: "14px 0", borderRadius: 12,
                  background: (!pickup || !destination || activeRide || drivers.length === 0) ? "#ddd" : "#111",
                  color: (!pickup || !destination || activeRide || drivers.length === 0) ? "#999" : "#fff",
                  fontWeight: 700, fontSize: 15, border: "none",
                  cursor: (!pickup || !destination || activeRide || drivers.length === 0) ? "not-allowed" : "pointer",
                  fontFamily: "inherit", letterSpacing: "0.01em",
                }}>
                {activeRide ? `Ride ${ride.status}…` : "Request E-Rickshaw 🛺"}
              </button>

              {ride?.status === "completed" && (
                <button onClick={() => { setRide(null); setPickup(""); setDestination(""); }}
                  style={{ width: "100%", marginTop: 10, padding: "12px 0", borderRadius: 12,
                    background: "#f0fff4", border: "1.5px solid #b7f5cf", color: "#27ae60",
                    fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
                  Book another ride
                </button>
              )}
            </div>
          )}

          {/* ── drivers tab ── */}
          {tab === "drivers" && (
            <div style={{ background: "#fff", borderRadius: 18, padding: 24, border: "1px solid #eee" }}>
              <p style={{ margin: "0 0 16px", fontWeight: 700, fontSize: 15, color: "#111" }}>
                Available drivers near campus
              </p>
              {drivers.length === 0
                ? <p style={{ color: "#aaa", fontSize: 14, textAlign: "center", padding: "32px 0" }}>
                    No drivers online right now
                  </p>
                : drivers.map(d => <DriverCard key={d.id} driver={d} />)
              }
            </div>
          )}
        </div>
      </div>

      {/* ── Rating modal — appears when ride completes ── */}
      {showRating && ride && ride.status === "completed" && (
        <RatingModal
          ride={ride}
          onSubmit={({ stars, tags, feedback }) => {
            setShowRating(false);
          }}
          onSkip={() => setShowRating(false)}
        />
      )}
    </>
  );
}
