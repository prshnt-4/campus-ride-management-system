// src/pages/DriverDashboard.jsx
// Requires Chart.js — already in index.html via CDN
// Reads from rideStore localStorage keys: rnn_r (rides), rnn_d (drivers)

import { useState, useEffect, useRef } from "react";

// ── Hardcoded design tokens (no CSS vars — they don't exist in Vite) ──
const C = {
  bgPrimary:   "#ffffff",
  bgSecondary: "#f4f4f0",
  bgTertiary:  "#e8e8e4",
  bgSuccess:   "#f0fff4",
  bgWarning:   "#fffbf0",
  bgDanger:    "#fff0f0",
  bgInfo:      "#f0f6ff",
  textPrimary:   "#111111",
  textSecondary: "#555555",
  textTertiary:  "#aaaaaa",
  textSuccess:   "#27ae60",
  textWarning:   "#d97706",
  textDanger:    "#e74c3c",
  textInfo:      "#1a73e8",
  borderTertiary: "#eeeeee",
  borderSuccess:  "#b7f5cf",
  borderWarning:  "#fde68a",
  borderDanger:   "#fcc",
};

// ── localStorage keys — must match rideStore.js ──
const RIDES_KEY   = "rnn_r";
const DRIVERS_KEY = "rnn_d";

const LOCS = {
  gate_main:    "Main Gate",
  gate_civil:   "Civil Lines Gate",
  thomso:       "Thomso Bhawan",
  convocation:  "Convocation Hall",
  library:      "Library",
  lecture_hall: "Lecture Hall",
  hostel_bhawan:"Bhawan Hostels",
  sports:       "Sports Complex",
  hospital:     "IITR Hospital",
  admin:        "Admin Block",
  canteen:      "New Canteen",
  workshop:     "Workshop",
};
function loc(id) { return LOCS[id] || id; }

function readRides()   { try { return JSON.parse(localStorage.getItem(RIDES_KEY)   || "[]"); } catch { return []; } }
function readRatings(driverId) {
  try { return JSON.parse(localStorage.getItem("rnn_ratings_" + driverId) || "[]"); } catch { return []; }
}

function computeStats(driverId, period) {
  const allRides = readRides();
  const myRides  = allRides.filter(r => r.driverId === driverId);

  const now    = Date.now();
  const cutoff = period === "today"
    ? new Date().setHours(0, 0, 0, 0)
    : period === "week"
    ? now - 7 * 24 * 60 * 60 * 1000
    : 0;

  const rides = myRides.filter(r => r.createdAt >= cutoff);

  const allReceived = allRides.filter(r => {
    const rejected = (r.rejectedBy || []).includes(driverId);
    const accepted = r.driverId === driverId;
    return (rejected || accepted) && r.createdAt >= cutoff;
  });

  const completed      = rides.filter(r => r.status === "completed");
  const cancelled      = rides.filter(r => r.status === "cancelled");
  const totalAssigned  = rides.length;
  const totalReceived  = allReceived.length;

  const acceptanceRate = totalReceived > 0
    ? Math.round((allReceived.filter(r => r.driverId === driverId).length / totalReceived) * 100)
    : 100;

  const cancellationRate = totalAssigned > 0
    ? Math.round((cancelled.length / totalAssigned) * 100)
    : 0;

  // ratings — prefer dedicated rnn_ratings_<id> store, fall back to ride-embedded
  const ratingsRaw = readRatings(driverId).filter(r => r.stars > 0);
  const avgRating  = ratingsRaw.length > 0
    ? (ratingsRaw.reduce((s, r) => s + r.stars, 0) / ratingsRaw.length).toFixed(1)
    : "—";

  const starCounts = [5, 4, 3, 2, 1].map(s => ({
    star: s, count: ratingsRaw.filter(r => r.stars === s).length,
  }));

  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const label = d.toLocaleDateString("en-IN", { weekday: "short" });
    const start = new Date(d).setHours(0, 0, 0, 0);
    const end   = new Date(d).setHours(23, 59, 59, 999);
    const count = myRides.filter(
      r => r.createdAt >= start && r.createdAt <= end && r.status === "completed"
    ).length;
    days.push({ label, count });
  }

  const routeMap = {};
  completed.forEach(r => {
    const key = r.pickup + "|" + r.destination;
    routeMap[key] = (routeMap[key] || 0) + 1;
  });
  const topRoutes = Object.entries(routeMap)
    .map(([k, c]) => { const [p, d] = k.split("|"); return { pickup: p, destination: d, count: c }; })
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const recentReviews = [...ratingsRaw]
    .filter(r => r.feedback && r.feedback !== "skipped" && r.tags?.length > 0 || r.feedback)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 5);

  return {
    completed: completed.length,
    cancelledCount: cancelled.length,
    totalRides: totalAssigned,
    acceptanceRate,
    cancellationRate,
    avgRating,
    starCounts,
    ratings: ratingsRaw,
    recentReviews,
    days,
    topRoutes,
    recentRides: [...myRides].sort((a, b) => b.createdAt - a.createdAt).slice(0, 20),
  };
}

// ── Components ───────────────────────────────────────────────────

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{ background: C.bgSecondary, borderRadius: 12, padding: "16px 18px", flex: 1, minWidth: 120 }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase",
        letterSpacing: "0.07em", color: C.textTertiary, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: color || C.textPrimary, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: C.textTertiary, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function RidesBarChart({ days }) {
  const ref = useRef(null);
  const chartRef = useRef(null);
  useEffect(() => {
    if (!ref.current || !window.Chart) return;
    if (chartRef.current) chartRef.current.destroy();
    chartRef.current = new window.Chart(ref.current, {
      type: "bar",
      data: {
        labels: days.map(d => d.label),
        datasets: [{ label: "Rides", data: days.map(d => d.count),
          backgroundColor: "#1D9E75", borderRadius: 6, borderSkipped: false }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false },
          tooltip: { callbacks: { label: ctx => ` ${ctx.raw} ride${ctx.raw !== 1 ? "s" : ""}` } } },
        scales: {
          x: { grid: { display: false }, ticks: { color: "#888", font: { size: 11 } } },
          y: { beginAtZero: true, ticks: { stepSize: 1, color: "#888", font: { size: 11 } },
            grid: { color: "rgba(0,0,0,0.05)" } },
        },
      },
    });
    return () => { if (chartRef.current) chartRef.current.destroy(); };
  }, [days]);
  return <div style={{ position: "relative", height: 200 }}><canvas ref={ref} /></div>;
}

function OutcomeDonut({ completed, cancelledCount, totalRides }) {
  const ref = useRef(null);
  const chartRef = useRef(null);
  const rejected = Math.max(0, totalRides - completed - cancelledCount);
  useEffect(() => {
    if (!ref.current || !window.Chart) return;
    if (chartRef.current) chartRef.current.destroy();
    const data = [completed, cancelledCount, rejected];
    if (data.reduce((a, b) => a + b, 0) === 0) return;
    chartRef.current = new window.Chart(ref.current, {
      type: "doughnut",
      data: {
        labels: ["Completed", "Cancelled", "Declined"],
        datasets: [{ data, backgroundColor: ["#1D9E75", "#E24B4A", "#888780"], borderWidth: 0 }],
      },
      options: { responsive: true, maintainAspectRatio: false, cutout: "72%",
        plugins: { legend: { display: false } } },
    });
    return () => { if (chartRef.current) chartRef.current.destroy(); };
  }, [completed, cancelledCount, totalRides]);

  const total = completed + cancelledCount + rejected;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
      <div style={{ position: "relative", width: 120, height: 120, flexShrink: 0 }}>
        <canvas ref={ref} />
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.textPrimary }}>{total}</div>
          <div style={{ fontSize: 10, color: C.textTertiary }}>rides</div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {[
          { label: "Completed", count: completed,     color: "#1D9E75" },
          { label: "Cancelled", count: cancelledCount,color: "#E24B4A" },
          { label: "Declined",  count: rejected,      color: "#888780" },
        ].map(item => (
          <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: item.color, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: C.textSecondary }}>{item.label}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.textPrimary, marginLeft: "auto", paddingLeft: 16 }}>
              {item.count} {total > 0 ? `(${Math.round(item.count / total * 100)}%)` : ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RatingBreakdown({ starCounts, avgRating }) {
  const total    = starCounts.reduce((s, r) => s + r.count, 0);
  const hasRatings = total > 0 && avgRating !== "—";
  const numRating  = parseFloat(avgRating) || 0;
  return (
    <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
      <div style={{ textAlign: "center", flexShrink: 0 }}>
        <div style={{ fontSize: 36, fontWeight: 700, color: C.textPrimary, lineHeight: 1 }}>
          {hasRatings ? avgRating : "—"}
        </div>
        <div style={{ fontSize: 18, margin: "4px 0 2px", color: "#EF9F27" }}>
          {hasRatings
            ? "★".repeat(Math.round(numRating)) + "☆".repeat(5 - Math.round(numRating))
            : "☆☆☆☆☆"}
        </div>
        <div style={{ fontSize: 11, color: C.textTertiary }}>
          {total > 0 ? `${total} rating${total !== 1 ? "s" : ""}` : "No ratings yet"}
        </div>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
        {starCounts.map(({ star, count }) => {
          const pct = total > 0 ? Math.round(count / total * 100) : 0;
          return (
            <div key={star} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, color: C.textSecondary, width: 14, textAlign: "right" }}>{star}</span>
              <span style={{ fontSize: 11, color: "#EF9F27" }}>★</span>
              <div style={{ flex: 1, height: 6, background: C.bgTertiary, borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: pct + "%", background: "#EF9F27",
                  borderRadius: 3, transition: "width 0.6s ease" }} />
              </div>
              <span style={{ fontSize: 11, color: C.textTertiary, width: 28, textAlign: "right" }}>{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TopRoutes({ routes }) {
  if (routes.length === 0) return (
    <div style={{ textAlign: "center", padding: "24px 0", color: C.textTertiary, fontSize: 13 }}>
      Complete rides to see your most frequent routes
    </div>
  );
  return (
    <div>
      {routes.map((r, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 12,
          padding: "10px 0", borderBottom: `0.5px solid ${C.borderTertiary}` }}>
          <span style={{ width: 22, height: 22, borderRadius: "50%", background: C.bgSecondary,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 700, color: C.textSecondary, flexShrink: 0 }}>{i + 1}</span>
          <div style={{ flex: 1, fontSize: 13, color: C.textPrimary }}>
            {loc(r.pickup)} <span style={{ color: C.textTertiary }}>→</span> {loc(r.destination)}
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 10px",
            background: C.bgSuccess, color: C.textSuccess, borderRadius: 20 }}>{r.count}x</span>
        </div>
      ))}
    </div>
  );
}

function RecentReviews({ reviews }) {
  if (reviews.length === 0) return (
    <div style={{ textAlign: "center", padding: "20px 0", color: C.textTertiary, fontSize: 13 }}>
      No written feedback yet. Complete rides to collect reviews.
    </div>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {reviews.map((r, i) => (
        <div key={i} style={{ padding: "12px 14px", borderRadius: 12,
          background: C.bgSecondary, border: `0.5px solid ${C.borderTertiary}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ color: "#EF9F27", fontSize: 14 }}>
              {"★".repeat(r.stars)}{"☆".repeat(5 - r.stars)}
            </span>
            <span style={{ fontSize: 11, color: C.textTertiary }}>
              {new Date(r.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
            </span>
          </div>
          {r.tags?.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
              {r.tags.map(t => (
                <span key={t} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 12,
                  background: C.bgInfo, color: C.textInfo }}>{t.replace(/_/g, " ")}</span>
              ))}
            </div>
          )}
          {r.feedback && (
            <p style={{ margin: 0, fontSize: 13, color: C.textSecondary, fontStyle: "italic" }}>
              "{r.feedback}"
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function RideHistory({ rides }) {
  if (rides.length === 0) return (
    <div style={{ textAlign: "center", padding: "32px 0", color: C.textTertiary, fontSize: 13 }}>
      No ride history yet
    </div>
  );
  const statusStyle = {
    completed: { bg: C.bgSuccess,  color: C.textSuccess },
    cancelled:  { bg: C.bgDanger,   color: C.textDanger  },
    accepted:   { bg: C.bgInfo,     color: C.textInfo     },
    requesting: { bg: C.bgWarning,  color: C.textWarning  },
  };
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, tableLayout: "fixed" }}>
        <thead>
          <tr style={{ borderBottom: `0.5px solid ${C.borderTertiary}` }}>
            {["Passenger", "From", "To", "Status", "Time"].map(h => (
              <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontWeight: 700,
                fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em",
                color: C.textTertiary }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rides.map((r, i) => {
            const st = statusStyle[r.status] || statusStyle.cancelled;
            return (
              <tr key={r.id || i} style={{ borderBottom: `0.5px solid ${C.borderTertiary}` }}>
                <td style={{ padding: "10px", color: C.textPrimary, fontWeight: 500,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {r.passengerName || "—"}
                </td>
                <td style={{ padding: "10px", color: C.textSecondary,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {loc(r.pickup)}
                </td>
                <td style={{ padding: "10px", color: C.textSecondary,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {loc(r.destination)}
                </td>
                <td style={{ padding: "10px" }}>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20,
                    textTransform: "capitalize", background: st.bg, color: st.color }}>{r.status}</span>
                </td>
                <td style={{ padding: "10px", color: C.textTertiary, whiteSpace: "nowrap" }}>
                  {new Date(r.createdAt).toLocaleString("en-IN", {
                    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ background: C.bgPrimary, border: `0.5px solid ${C.borderTertiary}`,
      borderRadius: 16, padding: "20px 22px", marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary, marginBottom: 16 }}>{title}</div>
      {children}
    </div>
  );
}

function PeriodBtn({ active, label, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: "6px 14px", borderRadius: 20, border: "none",
      background: active ? C.textPrimary : "transparent",
      color: active ? C.bgPrimary : C.textTertiary,
      fontWeight: 700, fontSize: 12, cursor: "pointer",
      fontFamily: "inherit", transition: "all 0.2s",
    }}>{label}</button>
  );
}

// ── MAIN ──────────────────────────────────────────────────────────
export default function DriverDashboard({ user, onBack }) {
  const [period, setPeriod] = useState("week");
  const [stats,  setStats]  = useState(null);
  const [tab,    setTab]    = useState("overview");

  useEffect(() => { setStats(computeStats(user.id, period)); }, [user.id, period]);
  useEffect(() => {
    const id = setInterval(() => setStats(computeStats(user.id, period)), 5000);
    return () => clearInterval(id);
  }, [user.id, period]);

  if (!stats) return null;

  const initials = user.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&display=swap');
      `}</style>

      <div style={{ minHeight: "100vh", background: C.bgSecondary, fontFamily: "'Sora', sans-serif" }}>

        {/* navbar */}
        <div style={{ background: C.bgPrimary, borderBottom: `0.5px solid ${C.borderTertiary}`,
          padding: "12px 20px", display: "flex", alignItems: "center",
          justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {onBack && (
              <button onClick={onBack} style={{ background: "none",
                border: `0.5px solid ${C.borderTertiary}`, borderRadius: 8,
                padding: "5px 12px", fontSize: 12, cursor: "pointer",
                color: C.textSecondary, fontFamily: "inherit", marginRight: 4 }}>
                ← Back
              </button>
            )}
            <div style={{ fontSize: 15, fontWeight: 700, color: C.textPrimary }}>Dashboard</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary }}>{user.name}</div>
              <div style={{ fontSize: 11, color: C.textTertiary }}>{user.vehicle || "E-Rickshaw"}</div>
            </div>
            <div style={{ width: 36, height: 36, borderRadius: "50%",
              background: C.bgInfo, color: C.textInfo,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 700, fontSize: 13 }}>{initials}</div>
          </div>
        </div>

        <div style={{ maxWidth: 820, margin: "0 auto", padding: "20px 16px" }}>

          {/* period switcher */}
          <div style={{ display: "flex", justifyContent: "space-between",
            alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: C.textSecondary }}>Showing stats for:</div>
            <div style={{ background: C.bgSecondary, borderRadius: 24,
              padding: "3px", display: "inline-flex", gap: 2 }}>
              <PeriodBtn active={period === "today"} label="Today"     onClick={() => setPeriod("today")} />
              <PeriodBtn active={period === "week"}  label="This week" onClick={() => setPeriod("week")}  />
              <PeriodBtn active={period === "all"}   label="All time"  onClick={() => setPeriod("all")}   />
            </div>
          </div>

          {/* stat cards */}
          <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
            <StatCard label="Rides completed" value={stats.completed}
              sub="finished trips" color={C.textSuccess} />
            <StatCard label="Acceptance rate" value={stats.acceptanceRate + "%"}
              sub="of requests taken"
              color={stats.acceptanceRate >= 80 ? C.textSuccess
                : stats.acceptanceRate >= 60 ? C.textWarning : C.textDanger} />
            <StatCard label="Cancellation rate" value={stats.cancellationRate + "%"}
              sub="of accepted rides"
              color={stats.cancellationRate <= 10 ? C.textSuccess
                : stats.cancellationRate <= 25 ? C.textWarning : C.textDanger} />
            <StatCard label="Avg rating"
              value={stats.avgRating === "—" ? "—" : "★ " + stats.avgRating}
              sub={stats.ratings.length > 0 ? stats.ratings.length + " reviews" : "no reviews yet"}
              color="#BA7517" />
          </div>

          {/* tab switcher */}
          <div style={{ background: C.bgSecondary, borderRadius: 12,
            padding: "3px", display: "inline-flex", gap: 2, marginBottom: 16 }}>
            {[
              { key: "overview", label: "Overview" },
              { key: "reviews",  label: `Reviews (${stats.recentReviews.length})` },
              { key: "history",  label: "Ride history" },
            ].map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                padding: "7px 18px", borderRadius: 9, border: "none",
                background: tab === t.key ? C.textPrimary : "transparent",
                color: tab === t.key ? C.bgPrimary : C.textTertiary,
                fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
              }}>{t.label}</button>
            ))}
          </div>

          {tab === "overview" && (
            <>
              <Section title="Rides completed — last 7 days">
                <RidesBarChart days={stats.days} />
              </Section>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <Section title="Ride outcomes">
                  <OutcomeDonut
                    completed={stats.completed}
                    cancelledCount={stats.cancelledCount}
                    totalRides={stats.totalRides}
                  />
                </Section>
                <Section title="Rating breakdown">
                  <RatingBreakdown starCounts={stats.starCounts} avgRating={stats.avgRating} />
                </Section>
              </div>

              <Section title="Top routes">
                <TopRoutes routes={stats.topRoutes} />
              </Section>

              <Section title="Performance insights">
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {stats.acceptanceRate < 70 && (
                    <div style={{ padding: "10px 14px", borderRadius: 10, fontSize: 12,
                      background: C.bgWarning, color: C.textWarning,
                      border: `0.5px solid ${C.borderWarning}` }}>
                      <strong>Acceptance rate is low ({stats.acceptanceRate}%)</strong> — accepting more improves visibility.
                    </div>
                  )}
                  {stats.cancellationRate > 20 && (
                    <div style={{ padding: "10px 14px", borderRadius: 10, fontSize: 12,
                      background: C.bgDanger, color: C.textDanger,
                      border: `0.5px solid ${C.borderDanger}` }}>
                      <strong>Cancellation rate is high ({stats.cancellationRate}%)</strong> — affects passenger trust.
                    </div>
                  )}
                  {stats.acceptanceRate >= 80 && stats.cancellationRate <= 10 && (
                    <div style={{ padding: "10px 14px", borderRadius: 10, fontSize: 12,
                      background: C.bgSuccess, color: C.textSuccess,
                      border: `0.5px solid ${C.borderSuccess}` }}>
                      <strong>Great performance!</strong> Acceptance {stats.acceptanceRate}% · Cancellations low.
                    </div>
                  )}
                  {stats.completed === 0 && (
                    <div style={{ padding: "10px 14px", borderRadius: 10, fontSize: 12,
                      background: C.bgSecondary, color: C.textSecondary }}>
                      No rides completed yet. Go online to start receiving requests.
                    </div>
                  )}
                </div>
              </Section>
            </>
          )}

          {tab === "reviews" && (
            <Section title={`Passenger reviews (${stats.recentReviews.length})`}>
              <RecentReviews reviews={stats.recentReviews} />
            </Section>
          )}

          {tab === "history" && (
            <Section title={`All rides (${stats.recentRides.length})`}>
              <RideHistory rides={stats.recentRides} />
            </Section>
          )}
        </div>
      </div>
    </>
  );
}
