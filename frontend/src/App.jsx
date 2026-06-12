// src/App.jsx
import { useState, useEffect } from "react";
import AuthPage        from "./pages/AuthPage";
import PassengerHome   from "./pages/PassengerHome";
import DriverHome      from "./pages/DriverHome";
import DriverDashboard from "./pages/DriverDashboard";
import { rideStore } from "./rideStore";
import socket from "./socket";

export default function App() {
  const [user,   setUser]   = useState(null);
  const [screen, setScreen] = useState("auth");
  const [rideNotification, setRideNotification] = useState(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("rnn_user");
      if (saved) {
        const u = JSON.parse(saved);
        setUser(u);
        setScreen(u.role === "driver" ? "driver" : "passenger");
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (user?.role !== "driver") return undefined;

    const handleRideRequest = (ride) => {
      if (!rideStore.canDriverAcceptRide(user.id, ride)) return;

      setRideNotification(ride);
    };

    socket.on("ride-request-update", handleRideRequest);
    return () => socket.off("ride-request-update", handleRideRequest);
  }, [user]);

  useEffect(() => {
    if (!rideNotification) return undefined;
    const timeoutId = setTimeout(() => setRideNotification(null), 10000);
    return () => clearTimeout(timeoutId);
  }, [rideNotification]);

  function handleAuth(u) {
    setUser(u);
    localStorage.setItem("rnn_user", JSON.stringify(u));
    setScreen(u.role === "driver" ? "driver" : "passenger");
  }

  function handleLogout() {
    localStorage.removeItem("rnn_user");
    localStorage.removeItem("rnn_token");
    setUser(null);
    setRideNotification(null);
    setScreen("auth");
  }

  function openRideRequests() {
    setRideNotification(null);
    setScreen("driver");
    setTimeout(() => window.dispatchEvent(new Event("open-driver-requests")), 50);
  }

  let page = <AuthPage onAuthSuccess={handleAuth} />;

  if (screen === "passenger") {
    page = <PassengerHome user={user} onLogout={handleLogout} />;
  } else if (screen === "driver") {
    page = (
      <DriverHome
        user={user}
        onLogout={handleLogout}
        onDashboard={() => setScreen("dashboard")}
      />
    );
  } else if (screen === "dashboard") {
    page = <DriverDashboard user={user} onBack={() => setScreen("driver")} />;
  }

  return (
    <>
      {page}
      {rideNotification && user?.role === "driver" && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 10000,
          width: "min(340px, calc(100vw - 40px))",
          boxSizing: "border-box", padding: 16,
          border: "1px solid #c0d8f8", borderRadius: 16,
          background: "#fff", color: "#111",
          boxShadow: "0 10px 36px rgba(0,0,0,0.16)",
          fontFamily: "'Sora', sans-serif",
        }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>
            New ride request
          </p>
          <p style={{ margin: "6px 0 14px", color: "#666", fontSize: 12 }}>
            {rideNotification.seatsRequired || rideNotification.passengerCount || 1} seat
            {(rideNotification.seatsRequired || rideNotification.passengerCount || 1) !== 1 ? "s" : ""} required
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setRideNotification(null)} style={{
              flex: 1, padding: "10px 12px", borderRadius: 10,
              border: "1px solid #e5e5e5", background: "#f7f7f7",
              color: "#777", fontWeight: 700, cursor: "pointer"
            }}>
              Dismiss
            </button>
            <button onClick={openRideRequests} style={{
              flex: 2, padding: "10px 12px", borderRadius: 10,
              border: "none", background: "#111", color: "#fff",
              fontWeight: 700, cursor: "pointer"
            }}>
              View request
            </button>
          </div>
        </div>
      )}
    </>
  );
}
