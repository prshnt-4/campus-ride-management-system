// src/App.jsx
import { useState, useEffect } from "react";
import AuthPage        from "./pages/AuthPage";
import PassengerHome   from "./pages/PassengerHome";
import DriverHome      from "./pages/DriverHome";
import DriverDashboard from "./pages/DriverDashboard";

export default function App() {
  const [user,   setUser]   = useState(null);
  const [screen, setScreen] = useState("auth");

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

  function handleAuth(u) {
    setUser(u);
    localStorage.setItem("rnn_user", JSON.stringify(u));
    setScreen(u.role === "driver" ? "driver" : "passenger");
  }

  function handleLogout() {
    localStorage.removeItem("rnn_user");
    localStorage.removeItem("rnn_token");
    setUser(null);
    setScreen("auth");
  }

  if (screen === "auth")      return <AuthPage onAuthSuccess={handleAuth} />;
  if (screen === "passenger") return <PassengerHome user={user} onLogout={handleLogout} />;
  if (screen === "driver")    return (
    <DriverHome
      user={user}
      onLogout={handleLogout}
      onDashboard={() => setScreen("dashboard")}
    />
  );
  if (screen === "dashboard") return (
    <DriverDashboard
      user={user}
      onBack={() => setScreen("driver")}
    />
  );

  return <AuthPage onAuthSuccess={handleAuth} />;
}
