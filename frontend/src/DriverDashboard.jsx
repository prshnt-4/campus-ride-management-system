// src/pages/DriverDashboard.jsx
// Add to index.html <head>:
//   <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js"></script>
// Reads from the same localStorage keys as rideStore.js (rnn_r, rnn_d)

import { useState, useEffect, useRef } from "react";

const LOCS = {
  main_gate: "Main Gate", civil_gate: "Civil Gate", library: "Library",
  convocation: "Convocation Hall", lhc: "Lecture Hall", bhawan: "Bhawan Hostels",
  sports: "Sports Complex", hospital: "Hospital", admin: "Admin Block",
  canteen: "New Canteen", workshop: "Workshop",
};
function loc(id) { return LOCS[id] || id; }

function readRides() {
  try { return JSON.parse(localStorage.getItem("rnn_r") || "[]"); } catch { return []; }
}
function readDrivers() {
  try { return JSON.parse(localStorage.getItem("rnn_d") || "{}"); } catch { return {}; }
}

// ── compute all stats from raw rides ─────────────────────────────
function computeStats(driverId, period) {
  const allRides = readRides();
  const myRides  = allRides.filter(r => r.driverId === driverId);

  const now = Date.now();
  const cutoff = period === "today"
    ? new Date().setHours(0, 0, 0, 0)
    : period === "week"
    ? now - 7 * 24 * 60 * 60 * 1000
    : 0;

  const rides = myRides.filter(r => r.createdAt >= cutoff);

  // read from rideStore also the "received" requests this driver saw
  const allReceived = allRides.filter(r => {
    const rejected = (r.rejectedBy || []).includes(driverId);
    const accepted = r.driverId === driverId;
    return (rejected || accepted) && r.createdAt >= cutoff;
  });

  const completed  = rides.filter(r => r.status === "completed");
  const cancelled  = rides.filter(r => r.status === "cancelled");
  const totalAssigned = rides.length;
  const totalReceived = allReceived.length;

  const acceptanceRate = totalReceived > 0
    ? Math.round((allReceived.filter(r => r.driverId === driverId).length / totalReceived) * 100)
    : 100;

  const cancellationRate = totalAssigned > 0
    ? Math.round((cancelled.length / totalAssigned) * 100)
    : 0;

  // mock ratings from localStorage or generate from completed rides
  let ratings = [];
  try { ratings = JSON.parse(localStorage.getItem("rnn_ratings_" + driverId) || "[]"); } catch {}
  const avgRating = ratings.length > 0
    ? (ratings.reduce((s, r) => s + r.stars, 0) / ratings.length).toFixed(1)
    : "—";

  const starCounts = [5, 4, 3, 2, 1].map(s => ({
    star: s,
    count: ratings.filter(r => r.stars === s).length,
  }));

  // rides per day last 7 days
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const label = d.toLocaleDateString("en-IN", { weekday: "short" });
    const start = new Date(d).setHours(0, 0, 0, 0);
    const end   = new Date(d).setHours(23, 59, 59, 999);
    const count = myRides.filter(r => r.createdAt >= start && r.createdAt <= end && r.status === "completed").length;
    days.push({ label, count });
  }

  // top routes
  const routeMap = {};
  completed.forEach(r => {
    const key = r.pickup + "|" + r.destination;
    routeMap[key] = (routeMap[key] || 0) + 1;
  });
  const topRoutes = Object.entries(routeMap)
    .map(([k, c]) => { const [p, d] = k.split("|"); return { pickup: p, destination: d, count: c }; })
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    completed: completed.length,
    totalRides: totalAssigned,
    acceptanceRate,
    cancellationRate,
    avgRating,
    starCounts,
    ratings,
    days,
    topRoutes,
    recentRides: [...myRides].sort((a, b) => b.createdAt - a.createdAt).slice(0, 20),
  };
}

// ── Stat card ─────────────────────────────────────────────────────
function StatCard({ label, value, sub, color, icon }) {
  return (
    <div style={{
      background: "var(--color-background-secondary)", borderRadius: 12,
      padding: "16px 18px", flex: 1, minWidth: 120,
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase",
        letterSpacing: "0.07em", color: "var(--color-text-tertiary)", marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: color || "var(--color-text-primary)", lineHeight: 1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ── Bar chart (rides per day) ─────────────────────────────────────
function RidesBarChart({ days }) {
  const ref = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!ref.current || !window.Chart) return;
    if (chartRef.current) { chartRef.current.destroy(); }
    chartRef.current = new window.Chart(ref.current, {
      type: "bar",
      data: {
        labels: days.map(d => d.label),
        datasets: [{
          label: "Rides completed",
          data: days.map(d => d.count),
          backgroundColor: "#1D9E75",
          borderRadius: 6,
          borderSkipped: false,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: {
          label: ctx => ` ${ctx.raw} ride${ctx.raw !== 1 ? "s" : ""}`,
        }}},
        scales: {
          x: { grid: { display: false }, ticks: { color: "#888", font: { size: 11 } } },
          y: {
            beginAtZero: true, ticks: { stepSize: 1, color: "#888", font: { size: 11 } },
            grid: { color: "rgba(0,0,0,0.05)" },
          },
        },
      },
    });
    return () => { if (chartRef.current) chartRef.current.destroy(); };
  }, [days]);

  return (
    <div style={{ position: "relative", height: 200 }}>
      <canvas ref={ref} role="img" aria-label="Bar chart showing rides completed per day over the last 7 days" />
    </div>
  );
}

// ── Donut chart (ride outcomes) ───────────────────────────────────
function OutcomeDonut({ completed, cancelled, totalRides }) {
  const ref = useRef(null);
  const chartRef = useRef(null);
  const rejected = Math.max(0, totalRides - completed - cancelled);

  useEffect(() => {
    if (!ref.current || !window.Chart) return;
    if (chartRef.current) chartRef.current.destroy();
    const data = [completed, cancelled, rejected];
    const total = data.reduce((a, b) => a + b, 0);
    if (total === 0) return;
    chartRef.current = new window.Chart(ref.current, {
      type: "doughnut",
      data: {
        labels: ["Completed", "Cancelled", "Declined"],
        datasets: [{
          data,
          backgroundColor: ["#1D9E75", "#E24B4A", "#888780"],
          borderWidth: 0,
          hoverOffset: 4,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: "72%",
        plugins: { legend: { display: false } },
      },
    });
    return () => { if (chartRef.current) chartRef.current.destroy(); };
  }, [completed, cancelled, totalRides]);

  const total = completed + cancelled + rejected;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
      <div style={{ position: "relative", width: 120, height: 120, flexShrink: 0 }}>
        <canvas ref={ref} role="img" aria-label="Donut chart of ride outcomes" />
        <div style={{
          position: "absolute", inset: 0, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", pointerEvents: "none",
        }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: "var(--color-text-primary)" }}>{total}</div>
          <div style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>rides</div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {[
          { label: "Completed", count: completed, color: "#1D9E75" },
          { label: "Cancelled", count: cancelled, color: "#E24B4A" },
          { label: "Declined",  count: rejected,  color: "#888780" },
        ].map(item => (
          <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: item.color, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{item.label}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-primary)", marginLeft: "auto", paddingLeft: 16 }}>
              {item.count} {total > 0 ? `(${Math.round(item.count / total * 100)}%)` : ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Star rating breakdown ─────────────────────────────────────────
function RatingBreakdown({ starCounts, avgRating }) {
  const total = starCounts.reduce((s, r) => s + r.count, 0);
  return (
    <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
      <div style={{ textAlign: "center", flexShrink: 0 }}>
        <div style={{ fontSize: 36, fontWeight: 700, color: "var(--color-text-primary)", lineHeight: 1 }}>
          {avgRating}
        </div>
        <div style={{ fontSize: 18, margin: "4px 0 2px", color: "#EF9F27" }}>
          {"★".repeat(Math.round(parseFloat(avgRating) || 0))}{"☆".repeat(5 - Math.round(parseFloat(avgRating) || 0))}
        </div>
        <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{total} ratings</div>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
        {starCounts.map(({ star, count }) => {
          const pct = total > 0 ? Math.round(count / total * 100) : 0;
          return (
            <div key={star} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, color: "var(--color-text-secondary)", width: 14, textAlign: "right" }}>{star}</span>
              <span style={{ fontSize: 11, color: "#EF9F27" }}>★</span>
              <div style={{ flex: 1, height: 6, background: "var(--color-background-tertiary)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: pct + "%", background: "#EF9F27", borderRadius: 3, transition: "width 0.6s ease" }} />
              </div>
              <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", width: 28, textAlign: "right" }}>{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Top routes table ──────────────────────────────────────────────
function TopRoutes({ routes }) {
  if (routes.length === 0) return (
    <div style={{ textAlign: "center", padding: "24px 0", color: "var(--color-text-tertiary)", fontSize: 13 }}>
      No completed rides yet
    </div>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {routes.map((r, i) => (
        <div key={i} style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "10px 0", borderBottom: "0.5px solid var(--color-border-tertiary)",
        }}>
          <span style={{
            width: 22, height: 22, borderRadius: "50%", background: "var(--color-background-secondary)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", flexShrink: 0,
          }}>{i + 1}</span>
          <div style={{ flex: 1, fontSize: 13, color: "var(--color-text-primary)" }}>
            {loc(r.pickup)} <span style={{ color: "var(--color-text-tertiary)" }}>→</span> {loc(r.destination)}
          </div>
          <span style={{
            fontSize: 11, fontWeight: 700, padding: "2px 10px",
            background: "var(--color-background-success)", color: "var(--color-text-success)",
            borderRadius: 20,
          }}>{r.count}x</span>
        </div>
      ))}
    </div>
  );
}

// ── Ride history table ────────────────────────────────────────────
function RideHistory({ rides }) {
  const statusStyle = {
    completed: { bg: "var(--color-background-success)", color: "var(--color-text-success)" },
    cancelled:  { bg: "var(--color-background-danger)",  color: "var(--color-text-danger)"  },
    accepted:   { bg: "var(--color-background-info)",    color: "var(--color-text-info)"    },
  };

  if (rides.length === 0) return (
    <div style={{ textAlign: "center", padding: "32px 0", color: "var(--color-text-tertiary)", fontSize: 13 }}>
      No ride history yet
    </div>
  );

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, tableLayout: "fixed" }}>
        <thead>
          <tr style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
            {["Passenger", "From", "To", "Status", "Time"].map(h => (
              <th key={h} style={{
                padding: "8px 10px", textAlign: "left", fontWeight: 700, fontSize: 11,
                textTransform: "uppercase", letterSpacing: "0.06em",
                color: "var(--color-text-tertiary)",
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rides.map((r, i) => {
            const st = statusStyle[r.status] || statusStyle.cancelled;
            return (
              <tr key={r.id || i} style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                <td style={{ padding: "10px 10px", color: "var(--color-text-primary)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {r.passengerName || "—"}
                </td>
                <td style={{ padding: "10px 10px", color: "var(--color-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {loc(r.pickup)}
                </td>
                <td style={{ padding: "10px 10px", color: "var(--color-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {loc(r.destination)}
                </td>
                <td style={{ padding: "10px 10px" }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20,
                    textTransform: "capitalize", background: st.bg, color: st.color,
                  }}>{r.status}</span>
                </td>
                <td style={{ padding: "10px 10px", color: "var(--color-text-tertiary)", whiteSpace: "nowrap" }}>
                  {new Date(r.createdAt).toLocaleString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Section wrapper ───────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div style={{
      background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)",
      borderRadius: 16, padding: "20px 22px", marginBottom: 16,
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 16 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

// ── Period pill button ────────────────────────────────────────────
function PeriodBtn({ active, label, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: "6px 14px", borderRadius: 20, border: "none",
      background: active ? "var(--color-text-primary)" : "transparent",
      color: active ? "var(--color-background-primary)" : "var(--color-text-tertiary)",
      fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
      transition: "all 0.2s",
    }}>{label}</button>
  );
}

// ── MAIN DASHBOARD ────────────────────────────────────────────────
export default function DriverDashboard({ user, onBack }) {
  const [period, setPeriod] = useState("week");
  const [stats,  setStats]  = useState(null);
  const [tab,    setTab]    = useState("overview");

  useEffect(() => {
    setStats(computeStats(user.id, period));
  }, [user.id, period]);

  // refresh every 5s in case rides come in
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
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: var(--color-background-tertiary, #f4f4f0); }
      `}</style>

      <div style={{ minHeight: "100vh", background: "var(--color-background-tertiary, #f4f4f0)", fontFamily: "'Sora', sans-serif" }}>

        {/* ── navbar ── */}
        <div style={{
          background: "var(--color-background-primary)", borderBottom: "0.5px solid var(--color-border-tertiary)",
          padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between",
          position: "sticky", top: 0, zIndex: 100,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {onBack && (
              <button onClick={onBack} style={{
                background: "none", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 8,
                padding: "5px 12px", fontSize: 12, cursor: "pointer", color: "var(--color-text-secondary)",
                fontFamily: "inherit", marginRight: 4,
              }}>← Back</button>
            )}
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text-primary)" }}>Dashboard</div>
          </div>

          {/* driver info */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)" }}>{user.name}</div>
              <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{user.vehicle || "E-Rickshaw"}</div>
            </div>
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              background: "var(--color-background-info)", color: "var(--color-text-info)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 700, fontSize: 13,
            }}>{initials}</div>
          </div>
        </div>

        <div style={{ maxWidth: 820, margin: "0 auto", padding: "20px 16px" }}>

          {/* ── period switcher ── */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
              Showing stats for:
            </div>
            <div style={{
              background: "var(--color-background-secondary)", borderRadius: 24,
              padding: "3px", display: "inline-flex", gap: 2,
            }}>
              <PeriodBtn active={period === "today"} label="Today"     onClick={() => setPeriod("today")} />
              <PeriodBtn active={period === "week"}  label="This week" onClick={() => setPeriod("week")}  />
              <PeriodBtn active={period === "all"}   label="All time"  onClick={() => setPeriod("all")}   />
            </div>
          </div>

          {/* ── stat cards ── */}
          <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
            <StatCard
              label="Rides completed"
              value={stats.completed}
              sub="finished trips"
              color="var(--color-text-success)"
            />
            <StatCard
              label="Acceptance rate"
              value={stats.acceptanceRate + "%"}
              sub="of requests taken"
              color={stats.acceptanceRate >= 80 ? "var(--color-text-success)" : stats.acceptanceRate >= 60 ? "var(--color-text-warning)" : "var(--color-text-danger)"}
            />
            <StatCard
              label="Cancellation rate"
              value={stats.cancellationRate + "%"}
              sub="of accepted rides"
              color={stats.cancellationRate <= 10 ? "var(--color-text-success)" : stats.cancellationRate <= 25 ? "var(--color-text-warning)" : "var(--color-text-danger)"}
            />
            <StatCard
              label="Avg rating"
              value={stats.avgRating === "—" ? "—" : "★ " + stats.avgRating}
              sub={stats.ratings.length + " reviews"}
              color="#BA7517"
            />
          </div>

          {/* ── tab switcher ── */}
          <div style={{
            background: "var(--color-background-secondary)", borderRadius: 12,
            padding: "3px", display: "inline-flex", gap: 2, marginBottom: 16,
          }}>
            {["overview", "history"].map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: "7px 18px", borderRadius: 9, border: "none",
                background: tab === t ? "var(--color-text-primary)" : "transparent",
                color: tab === t ? "var(--color-background-primary)" : "var(--color-text-tertiary)",
                fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit", textTransform: "capitalize",
              }}>{t === "overview" ? "Overview" : "Ride history"}</button>
            ))}
          </div>

          {tab === "overview" && (
            <>
              {/* ── rides chart ── */}
              <Section title="Rides completed — last 7 days">
                <RidesBarChart days={stats.days} />
              </Section>

              {/* ── two col row ── */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 0 }}>
                <Section title="Ride outcomes">
                  <OutcomeDonut
                    completed={stats.completed}
                    cancelled={stats.recentRides.filter(r => r.status === "cancelled").length}
                    totalRides={stats.totalRides}
                  />
                </Section>
                <Section title="Rating breakdown">
                  <RatingBreakdown starCounts={stats.starCounts} avgRating={stats.avgRating} />
                </Section>
              </div>

              {/* ── top routes ── */}
              <Section title="Top routes">
                {stats.topRoutes.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "20px 0", color: "var(--color-text-tertiary)", fontSize: 13 }}>
                    Complete rides to see your most frequent routes
                  </div>
                ) : (
                  <TopRoutes routes={stats.topRoutes} />
                )}
              </Section>

              {/* ── performance tips ── */}
              <Section title="Performance insights">
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {stats.acceptanceRate < 70 && (
                    <div style={{
                      padding: "10px 14px", borderRadius: 10, fontSize: 12,
                      background: "var(--color-background-warning)", color: "var(--color-text-warning)",
                      border: "0.5px solid var(--color-border-warning)",
                    }}>
                      <strong>Acceptance rate is low ({stats.acceptanceRate}%)</strong> — accepting more requests improves your visibility to passengers.
                    </div>
                  )}
                  {stats.cancellationRate > 20 && (
                    <div style={{
                      padding: "10px 14px", borderRadius: 10, fontSize: 12,
                      background: "var(--color-background-danger)", color: "var(--color-text-danger)",
                      border: "0.5px solid var(--color-border-danger)",
                    }}>
                      <strong>Cancellation rate is high ({stats.cancellationRate}%)</strong> — frequent cancellations affect passenger trust.
                    </div>
                  )}
                  {stats.acceptanceRate >= 80 && stats.cancellationRate <= 10 && (
                    <div style={{
                      padding: "10px 14px", borderRadius: 10, fontSize: 12,
                      background: "var(--color-background-success)", color: "var(--color-text-success)",
                      border: "0.5px solid var(--color-border-success)",
                    }}>
                      <strong>Great performance!</strong> Your acceptance rate is {stats.acceptanceRate}% and cancellations are low.
                    </div>
                  )}
                  {stats.completed === 0 && (
                    <div style={{
                      padding: "10px 14px", borderRadius: 10, fontSize: 12,
                      background: "var(--color-background-secondary)", color: "var(--color-text-secondary)",
                    }}>
                      No rides completed yet in this period. Go online to start receiving requests.
                    </div>
                  )}
                </div>
              </Section>
            </>
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
