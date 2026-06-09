// src/components/RatingModal.jsx
// Shown to passenger immediately after a ride is marked "completed"
// Props:
//   ride       - the completed ride object
//   onSubmit   - called with { stars, tags, feedback }
//   onSkip     - called when passenger dismisses without rating

import { useState } from "react";

const QUICK_TAGS = [
  { id: "on_time",    label: "On time"       },
  { id: "safe_drive", label: "Safe driving"  },
  { id: "friendly",   label: "Friendly"      },
  { id: "clean",      label: "Clean vehicle" },
  { id: "smooth",     label: "Smooth ride"   },
  { id: "helpful",    label: "Helpful"       },
];

const NEGATIVE_TAGS = [
  { id: "late",       label: "Was late"       },
  { id: "rash_drive", label: "Rash driving"   },
  { id: "rude",       label: "Rude behaviour" },
  { id: "dirty",      label: "Dirty vehicle"  },
];

const LOCS = {
  main_gate:"Main Gate", civil_gate:"Civil Gate", library:"Library",
  convocation:"Convocation Hall", lhc:"Lecture Hall", bhawan:"Bhawan Hostels",
  sports:"Sports Complex", hospital:"Hospital", admin:"Admin Block",
  canteen:"New Canteen", workshop:"Workshop",
};

const STAR_LABELS = ["","Poor","Fair","Good","Great","Excellent"];

function ModalOverlay({ children }) {
  return (
    <div style={{
      position:"fixed",inset:0,zIndex:999,
      background:"rgba(0,0,0,0.5)",
      display:"flex",alignItems:"flex-end",justifyContent:"center",
    }}>
      <style>{`
        @keyframes slideUp { from{transform:translateY(100%)}to{transform:translateY(0)} }
        @keyframes fadeIn  { from{opacity:0}to{opacity:1} }
        @keyframes popIn   { 0%{transform:scale(.7);opacity:0} 60%{transform:scale(1.1)}100%{transform:scale(1);opacity:1} }
      `}</style>
      <div style={{
        width:"100%",maxWidth:460,
        background:"#fff",borderRadius:"20px 20px 0 0",
        overflow:"hidden",animation:"slideUp 0.32s ease",
        fontFamily:"'Sora',sans-serif",
      }}>
        {children}
      </div>
    </div>
  );
}

export default function RatingModal({ ride, onSubmit, onSkip }) {
  const [stars,     setStars]     = useState(0);
  const [hovered,   setHovered]   = useState(0);
  const [tags,      setTags]      = useState([]);
  const [feedback,  setFeedback]  = useState("");
  const [submitted, setSubmitted] = useState(false);

  const display   = hovered || stars;
  const showNeg   = stars > 0 && stars <= 2;
  const activeTags = showNeg ? NEGATIVE_TAGS : QUICK_TAGS;

  function toggleTag(id) {
    setTags(t => t.includes(id) ? t.filter(x => x !== id) : [...t, id]);
  }

  function handleSubmit() {
    if (!stars) return;
    // persist to localStorage — same key DriverDashboard reads
    try {
      const key  = "rnn_ratings_" + ride.driverId;
      const prev = JSON.parse(localStorage.getItem(key) || "[]");
      prev.push({
        rideId: ride.id, driverId: ride.driverId, driverName: ride.driverName,
        passengerId: ride.passengerId, stars, tags, feedback, createdAt: Date.now(),
      });
      localStorage.setItem(key, JSON.stringify(prev));

      // update driver's avg rating in rnn_d
      const drivers = JSON.parse(localStorage.getItem("rnn_d") || "{}");
      if (drivers[ride.driverId]) {
        const avg = (prev.reduce((s,r)=>s+r.stars,0)/prev.length).toFixed(1);
        drivers[ride.driverId].rating = avg;
        localStorage.setItem("rnn_d", JSON.stringify(drivers));
      }

      // mark ride as rated in rnn_r
      const rides = JSON.parse(localStorage.getItem("rnn_r") || "[]");
      const idx   = rides.findIndex(r => r.id === ride.id);
      if (idx !== -1) { rides[idx].rated = true; localStorage.setItem("rnn_r", JSON.stringify(rides)); }
    } catch(e) { console.error(e); }

    setSubmitted(true);
    setTimeout(() => onSubmit({ stars, tags, feedback }), 1400);
  }

  // ── success state ─────────────────────────────────────────────
  if (submitted) {
    const msgs = ["","Drive safe out there!","Thanks for the feedback.","Noted, we'll improve.","Glad it was good!","So happy to hear that!"];
    return (
      <ModalOverlay>
        <div style={{padding:"48px 32px",textAlign:"center"}}>
          <div style={{
            width:72,height:72,borderRadius:"50%",
            background: stars >= 4 ? "#f0fff4" : "#fff8f0",
            display:"flex",alignItems:"center",justifyContent:"center",
            margin:"0 auto 18px",fontSize:32,
            animation:"popIn 0.4s ease forwards",
          }}>
            {stars >= 4 ? "⭐" : stars >= 3 ? "👍" : "🙏"}
          </div>
          <div style={{fontSize:18,fontWeight:700,color:"#111",marginBottom:6}}>
            Rating submitted!
          </div>
          <div style={{fontSize:13,color:"#888"}}>
            {msgs[stars]} Your feedback helps improve campus rides.
          </div>
          <div style={{marginTop:20,display:"flex",justifyContent:"center",gap:4}}>
            {[1,2,3,4,5].map(n=>(
              <span key={n} style={{fontSize:22,color:n<=stars?"#EF9F27":"#e5e5e5"}}>★</span>
            ))}
          </div>
        </div>
      </ModalOverlay>
    );
  }

  // ── main rating UI ────────────────────────────────────────────
  return (
    <ModalOverlay>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&display=swap');
        .rtag { transition: all 0.15s; }
        .rtag:hover { opacity: 0.85; }
        .rstar { transition: all 0.15s; cursor: pointer; border:none; background:none; padding:2px; }
        .rstar:hover { transform: scale(1.2); }
      `}</style>

      {/* handle bar */}
      <div style={{textAlign:"center",padding:"10px 0 0"}}>
        <div style={{width:40,height:4,borderRadius:2,background:"#e5e5e5",display:"inline-block"}}/>
      </div>

      {/* header */}
      <div style={{padding:"14px 22px 0",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{fontSize:15,fontWeight:700,color:"#111"}}>How was your ride?</div>
        <button onClick={onSkip} style={{
          background:"none",border:"none",cursor:"pointer",
          color:"#aaa",fontSize:18,lineHeight:1,padding:4,fontFamily:"inherit",
        }}>✕</button>
      </div>

      {/* trip summary card */}
      <div style={{padding:"14px 22px 0"}}>
        <div style={{
          background:"#f8f8f8",borderRadius:14,padding:"12px 14px",
          display:"flex",gap:12,alignItems:"center",
        }}>
          <div style={{
            width:40,height:40,borderRadius:"50%",
            background:"#111",color:"#fff",
            display:"flex",alignItems:"center",justifyContent:"center",
            fontWeight:700,fontSize:15,flexShrink:0,
          }}>{(ride.driverName||"D")[0]}</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13,fontWeight:700,color:"#111",
              overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
              {ride.driverName || "Your driver"}
            </div>
            <div style={{fontSize:11,color:"#888",marginTop:2,
              overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
              {LOCS[ride.pickup]||ride.pickup} → {LOCS[ride.destination]||ride.destination}
            </div>
          </div>
          <div style={{
            fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:20,
            background:"#f0fff4",color:"#27ae60",border:"1px solid #b7f5cf",flexShrink:0,
          }}>Completed</div>
        </div>
      </div>

      {/* stars */}
      <div style={{padding:"22px 22px 0",textAlign:"center"}}>
        <div style={{display:"flex",justifyContent:"center",gap:6,marginBottom:6}}>
          {[1,2,3,4,5].map(n=>(
            <button
              key={n}
              className="rstar"
              onClick={()=>{ setStars(n); setTags([]); }}
              onMouseEnter={()=>setHovered(n)}
              onMouseLeave={()=>setHovered(0)}
              style={{
                fontSize:38,lineHeight:1,
                color: n <= display ? "#EF9F27" : "#e0e0e0",
                transform: n <= display ? "scale(1.12)" : "scale(1)",
              }}
            >★</button>
          ))}
        </div>
        <div style={{
          height:18,fontSize:13,fontWeight:700,
          color: display >= 4 ? "#27ae60" : display >= 3 ? "#e67e22" : display > 0 ? "#e74c3c" : "#ccc",
          transition:"color 0.2s",
        }}>
          {display ? STAR_LABELS[display] : "Tap a star to rate"}
        </div>
      </div>

      {/* quick tags — slide in after rating */}
      {stars > 0 && (
        <div style={{padding:"16px 22px 0",animation:"fadeIn 0.25s ease"}}>
          <div style={{
            fontSize:11,fontWeight:700,textTransform:"uppercase",
            letterSpacing:"0.07em",color:"#aaa",marginBottom:10,
          }}>
            {showNeg ? "What went wrong?" : "What stood out?"}
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {activeTags.map(tag=>{
              const sel = tags.includes(tag.id);
              return (
                <button key={tag.id} className="rtag" onClick={()=>toggleTag(tag.id)} style={{
                  padding:"6px 14px",borderRadius:20,cursor:"pointer",
                  fontSize:12,fontWeight:600,fontFamily:"inherit",
                  border: sel ? "1.5px solid #111" : "1px solid #e5e5e5",
                  background: sel ? "#111" : "#fff",
                  color: sel ? "#fff" : "#555",
                }}>{tag.label}</button>
              );
            })}
          </div>
        </div>
      )}

      {/* written feedback */}
      {stars > 0 && (
        <div style={{padding:"16px 22px 0",animation:"fadeIn 0.25s ease"}}>
          <div style={{
            fontSize:11,fontWeight:700,textTransform:"uppercase",
            letterSpacing:"0.07em",color:"#aaa",marginBottom:8,
          }}>Add a comment <span style={{color:"#ccc",fontWeight:400,textTransform:"none",letterSpacing:0}}>(optional)</span></div>
          <textarea
            value={feedback}
            onChange={e=>setFeedback(e.target.value)}
            placeholder="Anything else to share about this ride?"
            rows={3}
            style={{
              width:"100%",boxSizing:"border-box",
              padding:"10px 12px",borderRadius:10,
              border:"1.5px solid #e5e5e5",
              background:"#fafafa",color:"#111",
              fontSize:13,fontFamily:"'Sora',sans-serif",
              resize:"none",outline:"none",
              transition:"border 0.2s",
            }}
            onFocus={e=>e.target.style.borderColor="#1a73e8"}
            onBlur={e=>e.target.style.borderColor="#e5e5e5"}
          />
        </div>
      )}

      {/* actions */}
      <div style={{padding:"16px 22px 28px"}}>
        <button
          onClick={handleSubmit}
          disabled={!stars}
          style={{
            width:"100%",padding:"13px 0",borderRadius:12,border:"none",
            background: stars ? "#111" : "#f0f0f0",
            color: stars ? "#fff" : "#bbb",
            fontWeight:700,fontSize:14,
            cursor: stars ? "pointer" : "not-allowed",
            fontFamily:"'Sora',sans-serif",
            transition:"all 0.2s",
          }}
        >
          {stars ? `Submit ${stars}-star rating` : "Select a rating first"}
        </button>
        <button onClick={onSkip} style={{
          width:"100%",marginTop:8,padding:"10px 0",
          background:"none",border:"none",cursor:"pointer",
          fontSize:12,color:"#aaa",fontFamily:"'Sora',sans-serif",
        }}>Skip for now</button>
      </div>
    </ModalOverlay>
  );
}
