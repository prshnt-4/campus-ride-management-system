import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import AuthPage from "./pages/AuthPage";
import DriverHome from "./pages/DriverHome";
import PassengerHome from "./pages/PassengerHome";

export default function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("rnn_user");
      if (saved) setUser(JSON.parse(saved));
    } catch {
      localStorage.removeItem("rnn_user");
    }
  }, []);

  function handleAuth(userData) {
    localStorage.setItem("rnn_user", JSON.stringify(userData));
    setUser(userData);
  }

  function handleLogout() {
    localStorage.removeItem("rnn_user");
    localStorage.removeItem("rnn_token");
    setUser(null);
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            user ? (
              <Navigate to={user.role === "driver" ? "/driver" : "/passenger"} replace />
            ) : (
              <Navigate to="/auth" replace />
            )
          }
        />
        <Route
          path="/auth"
          element={
            user ? (
              <Navigate to={user.role === "driver" ? "/driver" : "/passenger"} replace />
            ) : (
              <AuthPage onAuthSuccess={handleAuth} />
            )
          }
        />
        <Route
          path="/driver"
          element={
            user?.role === "driver" ? (
              <DriverHome user={user} onLogout={handleLogout} />
            ) : (
              <Navigate to="/auth" replace />
            )
          }
        />
        <Route
          path="/passenger"
          element={
            user?.role === "passenger" ? (
              <PassengerHome user={user} onLogout={handleLogout} />
            ) : (
              <Navigate to="/auth" replace />
            )
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
