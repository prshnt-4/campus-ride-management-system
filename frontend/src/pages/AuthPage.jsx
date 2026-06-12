import { useState } from "react";

/* ─────────────────────────────────────────
   RentOnNow / Campus Ride – Auth Page
   Drop into src/pages/AuthPage.jsx
   Needs: npm install lucide-react
   Uses: Tailwind CSS (already in Vite template)
   Backend: replace API_BASE with your Express URL
───────────────────────────────────────── */

const API_BASE = "https://campus-ride-management-system-backend.onrender.com/api"

// ── tiny helper ──────────────────────────
async function apiFetch(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Something went wrong");
  return data;
}

// ── icons (inline svg so no extra dep) ───
const IconCar = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 17H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1"/>
    <path d="M14 17H9"/>
    <circle cx="7.5" cy="17.5" r="2.5"/>
    <circle cx="17.5" cy="17.5" r="2.5"/>
    <path d="M14 9V6a2 2 0 0 0-2-2H6L3 9"/>
    <path d="M20 13v4a1 1 0 0 1-1 1h-1"/>
    <path d="M21 9h-6v4h6z"/>
  </svg>
);

const IconUser = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4"/>
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
  </svg>
);

const IconEye = ({ open }) => open ? (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
) : (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

// ── reusable field ────────────────────────
function Field({ label, type = "text", value, onChange, placeholder, required, extra }) {
  const [show, setShow] = useState(false);
  const isPass = type === "password";
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{
        display: "block", fontSize: 12, fontWeight: 600,
        letterSpacing: "0.06em", textTransform: "uppercase",
        color: "#8a8a8a", marginBottom: 6,
      }}>{label}</label>
      <div style={{ position: "relative" }}>
        <input
          type={isPass && show ? "text" : type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          style={{
            width: "100%", boxSizing: "border-box",
            padding: isPass ? "11px 44px 11px 14px" : "11px 14px",
            fontSize: 14, borderRadius: 10,
            border: "1.5px solid #e5e5e5",
            background: "#fafafa", color: "#111",
            outline: "none", transition: "border 0.2s",
            fontFamily: "inherit",
          }}
          onFocus={e => e.target.style.borderColor = "#1a73e8"}
          onBlur={e => e.target.style.borderColor = "#e5e5e5"}
        />
        {isPass && (
          <button
            type="button"
            onClick={() => setShow(s => !s)}
            style={{
              position: "absolute", right: 12, top: "50%",
              transform: "translateY(-50%)",
              background: "none", border: "none",
              cursor: "pointer", color: "#aaa", padding: 0,
              display: "flex", alignItems: "center",
            }}
          >
            <IconEye open={show} />
          </button>
        )}
      </div>
      {extra && <p style={{ fontSize: 11, color: "#aaa", margin: "4px 0 0" }}>{extra}</p>}
    </div>
  );
}

// ── role toggle ───────────────────────────
function RoleToggle({ role, setRole }) {
  const btn = (r, label, Icon) => (
    <button
      type="button"
      onClick={() => setRole(r)}
      style={{
        flex: 1, display: "flex", alignItems: "center",
        justifyContent: "center", gap: 8,
        padding: "10px 0", borderRadius: 10, fontSize: 14, fontWeight: 600,
        border: "none", cursor: "pointer", transition: "all 0.2s",
        background: role === r ? "#111" : "transparent",
        color: role === r ? "#fff" : "#888",
      }}
    >
      <Icon /> {label}
    </button>
  );
  return (
    <div style={{
      display: "flex", background: "#f0f0f0",
      borderRadius: 12, padding: 4, marginBottom: 28,
    }}>
      {btn("passenger", "Passenger", IconUser)}
      {btn("driver", "Driver", IconCar)}
    </div>
  );
}

// ── spinner ───────────────────────────────
function Spinner() {
  return (
    <span style={{
      display: "inline-block", width: 18, height: 18,
      border: "2.5px solid rgba(255,255,255,0.3)",
      borderTop: "2.5px solid #fff",
      borderRadius: "50%",
      animation: "spin 0.7s linear infinite",
    }} />
  );
}

// ── toast ─────────────────────────────────
function Toast({ msg, type }) {
  if (!msg) return null;
  return (
    <div style={{
      padding: "10px 14px", borderRadius: 10, fontSize: 13,
      marginBottom: 20, fontWeight: 500,
      background: type === "error" ? "#fff0f0" : "#f0fff4",
      color: type === "error" ? "#c0392b" : "#1a7a4a",
      border: `1px solid ${type === "error" ? "#fcc" : "#b7f5cf"}`,
    }}>
      {msg}
    </div>
  );
}

// ── LOGIN form ────────────────────────────
function LoginForm({ onSwitch, onSuccess }) {
  const [role, setRole] = useState("passenger");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setToast(null);
    try {
      const data = await apiFetch("/auth/login", { email, password, role });
      const userWithRole = { ...data.user, role };
      localStorage.setItem("rnn_token", data.token);
      localStorage.setItem("rnn_user", JSON.stringify(userWithRole));
      onSuccess(userWithRole);
    } catch (err) {
      setToast({ msg: err.message, type: "error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <RoleToggle role={role} setRole={setRole} />
      <Toast {...(toast || {})} />
      <Field label="Email address" type="email" value={email} onChange={setEmail}
        placeholder="you@campus.edu" required />
      <Field label="Password" type="password" value={password} onChange={setPassword}
        placeholder="Enter your password" required />
      <div style={{ textAlign: "right", marginTop: -10, marginBottom: 22 }}>
        <button type="button" style={{
          background: "none", border: "none", fontSize: 13,
          color: "#1a73e8", cursor: "pointer", padding: 0, fontFamily: "inherit",
        }}>Forgot password?</button>
      </div>
      <button type="submit" disabled={loading} style={{
        width: "100%", padding: "13px 0", borderRadius: 12,
        background: "#111", color: "#fff", fontWeight: 700,
        fontSize: 15, border: "none", cursor: loading ? "not-allowed" : "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        gap: 10, opacity: loading ? 0.75 : 1, fontFamily: "inherit",
        letterSpacing: "0.01em",
      }}>
        {loading ? <Spinner /> : null}
        {loading ? "Signing in…" : `Sign in as ${role}`}
      </button>
      <p style={{ textAlign: "center", marginTop: 22, fontSize: 13, color: "#888" }}>
        No account?{" "}
        <button type="button" onClick={onSwitch} style={{
          background: "none", border: "none", color: "#111",
          fontWeight: 700, cursor: "pointer", fontSize: 13, fontFamily: "inherit",
        }}>Create one →</button>
      </p>
    </form>
  );
}

// ── REGISTER form ─────────────────────────
function RegisterForm({ onSwitch, onSuccess }) {
  const [role, setRole] = useState("passenger");
  const [form, setForm] = useState({
    name: "", email: "", phone: "",
    password: "", confirm: "",
    vehicleNumber: "", vehicleModel: "", licenseNumber: "",
  });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const set = (key) => (val) => setForm(f => ({ ...f, [key]: val }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.password !== form.confirm) {
      setToast({ msg: "Passwords don't match", type: "error" }); return;
    }
    if (form.password.length < 6) {
      setToast({ msg: "Password must be at least 6 characters", type: "error" }); return;
    }
    setLoading(true);
    setToast(null);
    try {
      const payload = {
        name: form.name, email: form.email,
        phone: form.phone, password: form.password, role,
        ...(role === "driver" ? {
          vehicleNumber: form.vehicleNumber,
          vehicleModel: form.vehicleModel,
          licenseNumber: form.licenseNumber,
        } : {}),
      };
      const data = await apiFetch("/auth/register", payload);
      const userWithRole = { ...data.user, role };
      localStorage.setItem("rnn_token", data.token);
      localStorage.setItem("rnn_user", JSON.stringify(userWithRole));
      onSuccess(userWithRole);
    } catch (err) {
      setToast({ msg: err.message, type: "error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <RoleToggle role={role} setRole={setRole} />
      <Toast {...(toast || {})} />

      <Field label="Full name" value={form.name} onChange={set("name")}
        placeholder="Arjun Sharma" required />
      <Field label="Email address" type="email" value={form.email} onChange={set("email")}
        placeholder="arjun@campus.edu" required />
      <Field label="Phone number" type="tel" value={form.phone} onChange={set("phone")}
        placeholder="+91 98765 43210" required />
      <Field label="Password" type="password" value={form.password} onChange={set("password")}
        placeholder="Min. 6 characters" required extra="Use a strong password with letters and numbers" />
      <Field label="Confirm password" type="password" value={form.confirm} onChange={set("confirm")}
        placeholder="Repeat password" required />

      {role === "driver" && (
        <div style={{
          background: "#f6f8ff", border: "1.5px dashed #c0ccf0",
          borderRadius: 12, padding: "16px 16px 2px", marginBottom: 18,
        }}>
          <p style={{
            fontSize: 11, fontWeight: 700, letterSpacing: "0.07em",
            textTransform: "uppercase", color: "#6676c8", margin: "0 0 14px",
          }}>Vehicle details</p>
          <Field label="Vehicle number" value={form.vehicleNumber} onChange={set("vehicleNumber")}
            placeholder="RJ14 EC 1234" required />
          <Field label="Vehicle model" value={form.vehicleModel} onChange={set("vehicleModel")}
            placeholder="Bajaj RE E-Rickshaw" required />
          <Field label="License number" value={form.licenseNumber} onChange={set("licenseNumber")}
            placeholder="DL-0420110012345" required
            extra="Your driving license number for verification" />
        </div>
      )}

      <button type="submit" disabled={loading} style={{
        width: "100%", padding: "13px 0", borderRadius: 12,
        background: "#111", color: "#fff", fontWeight: 700,
        fontSize: 15, border: "none", cursor: loading ? "not-allowed" : "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        gap: 10, opacity: loading ? 0.75 : 1, fontFamily: "inherit",
        letterSpacing: "0.01em",
      }}>
        {loading ? <Spinner /> : null}
        {loading ? "Creating account…" : `Create ${role} account`}
      </button>
      <p style={{ textAlign: "center", marginTop: 22, fontSize: 13, color: "#888" }}>
        Already registered?{" "}
        <button type="button" onClick={onSwitch} style={{
          background: "none", border: "none", color: "#111",
          fontWeight: 700, cursor: "pointer", fontSize: 13, fontFamily: "inherit",
        }}>Sign in →</button>
      </p>
    </form>
  );
}

// ── MAIN page ─────────────────────────────
export default function AuthPage({ onAuthSuccess }) {
  const [mode, setMode] = useState("login"); // "login" | "register"

  function handleSuccess(user) {
    // redirect based on role
    if (onAuthSuccess) onAuthSuccess(user);
    else {
      alert(`Welcome, ${user.name}! Role: ${user.role}`);
      // replace with: navigate(user.role === "driver" ? "/driver" : "/passenger")
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&display=swap');
        .auth-card { animation: fadeUp 0.4s ease; }
      `}</style>

      <div style={{
        minHeight: "100vh", display: "flex",
        alignItems: "center", justifyContent: "center",
        background: "#f4f4f0", padding: "24px 16px",
        fontFamily: "'Sora', sans-serif",
      }}>
        <div className="auth-card" style={{
          width: "100%", maxWidth: 420,
          background: "#fff", borderRadius: 20,
          padding: "40px 36px",
          boxShadow: "0 2px 40px rgba(0,0,0,0.08)",
        }}>
          {/* Logo / brand */}
          <div style={{ marginBottom: 32, textAlign: "center" }}>
            <div style={{
              display: "inline-flex", alignItems: "center",
              justifyContent: "center",
              width: 52, height: 52, borderRadius: 14,
              background: "#111", color: "#fff",
              marginBottom: 16,
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 8v4l3 3"/>
                <path d="M8 12h.01"/>
              </svg>
            </div>
            <h1 style={{
              fontSize: 22, fontWeight: 700, color: "#111",
              letterSpacing: "-0.02em", lineHeight: 1.2,
            }}>
              Campus Ride
            </h1>
            <p style={{ fontSize: 13, color: "#aaa", marginTop: 4 }}>
              {mode === "login" ? "Sign in to your account" : "Create your account"}
            </p>
          </div>

          {mode === "login"
            ? <LoginForm onSwitch={() => setMode("register")} onSuccess={handleSuccess} />
            : <RegisterForm onSwitch={() => setMode("login")} onSuccess={handleSuccess} />
          }
        </div>
      </div>
    </>
  );
}
