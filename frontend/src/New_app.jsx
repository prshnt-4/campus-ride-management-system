// src/App.jsx
// Central router — no react-router needed yet

import { useState, useEffect } from "react";
import AuthPage      from "./pages/AuthPage";
import PassengerHome from "./pages/PassengerHome";
import DriverHome    from "./pages/DriverHome";

export default function App() {
  const [user, setUser] = useState(null);

  // restore session on page refresh
  useEffect(() => {
    try {
      const saved = localStorage.getItem("rnn_user");
      if (saved) setUser(JSON.parse(saved));
    } catch {}
  }, []);

  function handleAuth(u) {
    setUser(u);
    localStorage.setItem("rnn_user", JSON.stringify(u));
  }

  function handleLogout() {
    localStorage.removeItem("rnn_user");
    localStorage.removeItem("rnn_token");
    setUser(null);
  }

  if (!user) return <AuthPage onAuthSuccess={handleAuth} />;
  if (user.role === "driver")    return <DriverHome    user={user} onLogout={handleLogout} />;
  if (user.role === "passenger") return <PassengerHome user={user} onLogout={handleLogout} />;

  // fallback
  return <AuthPage onAuthSuccess={handleAuth} />;
}
