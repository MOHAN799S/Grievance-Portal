"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Clock, MapPin, MessageSquare,
  FileText, RefreshCw, ChevronRight, AlertCircle, Calendar,
  LogOut, X, ChevronDown, ChevronUp, Shield,
  Play, Pause, Volume2, VolumeX, Brain,
  Image as ImageIcon, Mic
} from "lucide-react";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// ── Spam is shown as Pending to citizens ─────────────────────────────────────
function normaliseStatus(raw) {
  return raw === "Spam" ? "Pending" : raw;
}

const STATUS_CONFIG = {
  Resolved: { label: "Resolved", color: "#166534", bg: "#f0fdf4", border: "#bbf7d0", dot: "#22c55e" },
  Pending:  { label: "Pending",  color: "#92400e", bg: "#fffbeb", border: "#fde68a", dot: "#f59e0b" },
};

const PRIORITY_CONFIG = {
  Immediate: { color: "#7f1d1d", bg: "#fef2f2", border: "#fecaca", label: "Critical" },
  Critical:  { color: "#7f1d1d", bg: "#fef2f2", border: "#fecaca", label: "Critical" },
  High:      { color: "#7c2d12", bg: "#fff7ed", border: "#fed7aa", label: "High"     },
  Medium:    { color: "#374151", bg: "#f9fafb", border: "#e5e7eb", label: "Medium"   },
  Low:       { color: "#374151", bg: "#f9fafb", border: "#e5e7eb", label: "Low"      },
};

const FILTERS = ["All", "Pending", "Resolved"];

async function fetchGrievanceHistory() {
  const token = localStorage.getItem("citizenToken");
  const res = await fetch(`${API_BASE}/api/grievances`, {
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.message || "Failed to fetch");
  return data.data;
}

/* ── Badges ─────────────────────────────────────────────────────────────────── */
function StatusBadge({ status, size = "sm" }) {
  const display = normaliseStatus(status);
  const cfg = STATUS_CONFIG[display] || STATUS_CONFIG.Pending;
  const p  = size === "lg" ? "5px 14px" : "3px 10px";
  const fs = size === "lg" ? 11 : 10;
  return (
    <span style={{ background: cfg.bg, border: `1.5px solid ${cfg.border}`, color: cfg.color, display: "inline-flex", alignItems: "center", gap: 5, fontSize: fs, fontWeight: 800, padding: p, borderRadius: 30, letterSpacing: "0.04em", whiteSpace: "nowrap", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.dot, flexShrink: 0 }} />
      {cfg.label}
    </span>
  );
}

function PriorityBadge({ priority, size = "sm" }) {
  const cfg = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.Low;
  const p  = size === "lg" ? "5px 14px" : "3px 10px";
  const fs = size === "lg" ? 11 : 10;
  return (
    <span style={{ background: cfg.bg, border: `1.5px solid ${cfg.border}`, color: cfg.color, display: "inline-flex", alignItems: "center", gap: 5, fontSize: fs, fontWeight: 800, padding: p, borderRadius: 30, letterSpacing: "0.04em", whiteSpace: "nowrap", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
      {cfg.label}
    </span>
  );
}

/* ── Audio Player ─────────────────────────────────────────────────────────────── */
function AudioPlayer({ src }) {
  const audioRef    = useRef(null);
  const progressRef = useRef(null);
  const [playing, setPlaying]     = useState(false);
  const [muted,   setMuted]       = useState(false);
  const [currentTime, setCurrent] = useState(0);
  const [duration, setDuration]   = useState(0);
  const [loaded,   setLoaded]     = useState(false);

  const fmt = (s) => (!s || isNaN(s)) ? "0:00" : `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,"0")}`;
  const toggle = () => { const a = audioRef.current; if(!a) return; playing ? a.pause() : a.play(); setPlaying(p=>!p); };
  const seek   = (e) => {
    if (!progressRef.current || !duration) return;
    const r = progressRef.current.getBoundingClientRect();
    const p = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    if (audioRef.current) audioRef.current.currentTime = p * duration;
  };
  const pct  = duration ? (currentTime / duration) * 100 : 0;
  const bars = Array.from({ length: 22 }, (_, i) => 9 + Math.sin(i*1.1)*6 + Math.cos(i*1.8)*3);

  return (
    <div style={{ display:"inline-flex",alignItems:"center",gap:8,background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:40,padding:"5px 10px 5px 5px",maxWidth:260,width:"100%" }}>
      <audio ref={audioRef} src={src}
        onLoadedMetadata={e=>{ setDuration(e.target.duration); setLoaded(true); }}
        onTimeUpdate={e=>setCurrent(e.target.currentTime)}
        onEnded={()=>setPlaying(false)} muted={muted} />
      <button onClick={toggle} style={{ width:30,height:30,borderRadius:"50%",flexShrink:0,background:"#0f172a",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>
        {playing ? <Pause size={11} color="#fff" fill="#fff"/> : <Play size={11} color="#fff" fill="#fff" style={{marginLeft:1}}/>}
      </button>
      <div style={{ flex:1,display:"flex",flexDirection:"column",gap:4,minWidth:0 }}>
        <div style={{ display:"flex",alignItems:"center",gap:1.5,height:18 }}>
          {bars.map((h,i)=>(
            <div key={i} style={{ width:2,height:h,borderRadius:2,flexShrink:0,background:(i/22)*100<pct?"#475569":"#d1d5db",transition:"background 0.1s" }}/>
          ))}
        </div>
        <div ref={progressRef} onClick={seek} style={{ height:2,background:"#e2e8f0",borderRadius:1,cursor:"pointer" }}>
          <div style={{ height:"100%",width:`${pct}%`,background:"#374151",borderRadius:1,transition:"width 0.1s" }}/>
        </div>
      </div>
      <span style={{ fontSize:8.5,fontFamily:"monospace",fontWeight:700,color:"#94a3b8",flexShrink:0,whiteSpace:"nowrap" }}>
        {fmt(currentTime)}<span style={{color:"#d1d5db",margin:"0 1px"}}>/</span>{loaded?fmt(duration):"--:--"}
      </span>
      <button onClick={()=>setMuted(m=>!m)} style={{ border:"none",background:"none",cursor:"pointer",padding:0,flexShrink:0 }}>
        {muted ? <VolumeX size={10} color="#d1d5db"/> : <Volume2 size={10} color="#94a3b8"/>}
      </button>
    </div>
  );
}

/* ── Collapsible Section ─────────────────────────────────────────────────────── */
function Section({ title, icon: Icon, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ border:"1px solid #e2e8f0",borderRadius:12,overflow:"hidden",marginBottom:8 }}>
      <button onClick={()=>setOpen(o=>!o)} style={{ width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",background:"#f8fafc",border:"none",cursor:"pointer",fontFamily:"inherit" }}>
        <div style={{ display:"flex",alignItems:"center",gap:7 }}>
          {Icon && <Icon size={13} color="#9ca3af"/>}
          <span style={{ fontSize:10,fontWeight:800,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.1em" }}>{title}</span>
        </div>
        {open ? <ChevronUp size={13} color="#cbd5e1"/> : <ChevronDown size={13} color="#cbd5e1"/>}
      </button>
      {open && <div style={{ padding:"12px 14px",background:"#fff",borderTop:"1px solid #f1f5f9" }}>{children}</div>}
    </div>
  );
}

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",padding:"6px 0",borderBottom:"1px solid #f8fafc",gap:12 }}>
      <span style={{ fontSize:11,color:"#94a3b8",fontWeight:600,flexShrink:0 }}>{label}</span>
      <span style={{ fontSize:11,fontWeight:800,color:"#1e293b",textAlign:"right" }}>{value}</span>
    </div>
  );
}

function ConfBar({ label, value }) {
  const pct = value != null ? (value * 100).toFixed(1) : null;
  return (
    <div style={{ marginBottom:10 }}>
      <div style={{ display:"flex",justifyContent:"space-between",marginBottom:4 }}>
        <span style={{ fontSize:11,color:"#64748b",fontWeight:700 }}>{label}</span>
        <span style={{ fontSize:11,fontFamily:"monospace",fontWeight:800,color:"#374151" }}>{pct!=null?`${pct}%`:"—"}</span>
      </div>
      <div style={{ height:4,background:"#f1f5f9",borderRadius:2,overflow:"hidden" }}>
        <div style={{ width:`${pct||0}%`,height:"100%",background:"#374151",borderRadius:2,transition:"width 0.7s ease" }}/>
      </div>
    </div>
  );
}

/* ── Drawer ──────────────────────────────────────────────────────────────────── */
function GrievanceDrawer({ g, onClose }) {
  const displayStatus = normaliseStatus(g.status);
  const date    = new Date(g.createdAt);
  const dateStr = date.toLocaleDateString("en-IN", { day:"2-digit", month:"long", year:"numeric" });
  const timeStr = date.toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit", hour12:true });

  // ── Explanation: ONLY final_reason shown to citizen ─────────────────────────
  // categoryTokens, urgencyTokens, categoryDecision, urgencyDecision,
  // prioritySummary are intentionally not displayed here.
  const exp         = g.explanation || {};
  const finalReason = exp.finalReason || exp.final_reason || "";

  // AI scores — support both camelCase and snake_case field names
  const catConf  = g.categoryConfidence ?? g.category_confidence ?? null;
  const urgConf  = g.urgencyConfidence  ?? g.urgency_confidence  ?? null;
  const priScore = g.priorityScore      ?? g.priority_score      ?? null;
  const hasAI    = catConf != null || urgConf != null || priScore != null || !!finalReason;

  const [imgOpen, setImgOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position:"fixed",inset:0,background:"rgba(2,6,23,0.5)",zIndex:40,backdropFilter:"blur(4px)",animation:"fadeIn 0.2s ease" }}/>

      {/* Fullscreen image */}
      {imgOpen && g.imageUrl && (
        <div onClick={()=>setImgOpen(false)} style={{ position:"fixed",inset:0,zIndex:60,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.9)",padding:20,cursor:"zoom-out" }}>
          <img src={g.imageUrl} alt="Evidence full" style={{ maxWidth:"100%",maxHeight:"90vh",borderRadius:12,objectFit:"contain" }}/>
        </div>
      )}

      {/* Bottom sheet */}
      <div style={{ position:"fixed",bottom:0,left:0,right:0,zIndex:50,background:"#fff",borderRadius:"20px 20px 0 0",maxHeight:"92vh",display:"flex",flexDirection:"column",animation:"slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)",boxShadow:"0 -8px 40px rgba(0,0,0,0.15)" }}>

        {/* Drag handle */}
        <div style={{ display:"flex",justifyContent:"center",padding:"10px 0 0" }}>
          <div style={{ width:36,height:4,background:"#e2e8f0",borderRadius:2 }}/>
        </div>

        {/* Sheet header */}
        <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",padding:"12px 18px 14px",borderBottom:"1px solid #f1f5f9" }}>
          <div style={{ flex:1,paddingRight:12,minWidth:0 }}>
            <div style={{ fontSize:17,fontWeight:900,color:"#0f172a",letterSpacing:"-0.03em",lineHeight:1.2 }}>{g.category} Grievance</div>
            <div style={{ fontFamily:"monospace",fontSize:10,color:"#94a3b8",marginTop:3 }}>
              #{g._id?.slice(-8).toUpperCase()} · {dateStr} · {timeStr}
            </div>
            <div style={{ display:"flex",gap:6,marginTop:8,flexWrap:"wrap" }}>
              <StatusBadge status={g.status} size="lg"/>
              <PriorityBadge priority={g.priority} size="lg"/>
              {g.language && (
                <span style={{ fontSize:10,fontWeight:700,padding:"5px 10px",borderRadius:30,background:"#f1f5f9",color:"#64748b",border:"1px solid #e2e8f0" }}>
                  🌐 {g.language}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} style={{ width:34,height:34,borderRadius:10,border:"1px solid #e2e8f0",background:"#f8fafc",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0 }}>
            <X size={14} color="#64748b"/>
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex:1,overflowY:"auto",padding:"12px 18px 56px" }}>

          {/* Complaint Details */}
          <Section title="Complaint Details" icon={FileText} defaultOpen>
            <InfoRow label="Area / Location" value={g.area}/>
            <InfoRow label="Category"        value={g.category}/>
            <InfoRow label="Priority Level"  value={g.priority}/>
            {/* Show normalised status — Spam shows as Pending */}
            <InfoRow label="Current Status"  value={displayStatus}/>
            <InfoRow label="Submitted At"    value={`${dateStr} at ${timeStr}`}/>
            {g.language   && <InfoRow label="Language"   value={g.language}/>}
            {g.ticketId   && <InfoRow label="Ticket ID"  value={`#${g.ticketId}`}/>}
            {g.department && <InfoRow label="Department" value={g.department}/>}
            <div style={{ marginTop:12,paddingTop:12,borderTop:"1px dashed #e2e8f0" }}>
              <div style={{ fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.1em",color:"#9ca3af",marginBottom:6 }}>Description</div>
              <p style={{ fontSize:12,color:"#374151",lineHeight:1.7,margin:0,background:"#f8fafc",padding:"10px 12px",borderRadius:8,border:"1px solid #f1f5f9" }}>{g.description}</p>
            </div>
          </Section>

          {/* AI Assessment — confidence bars + priority score + final_reason only */}
          {hasAI && (
            <Section title="AI Assessment" icon={Brain} defaultOpen>
              {catConf  != null && <ConfBar label={`Category: ${g.category}`}             value={catConf}/>}
              {urgConf  != null && <ConfBar label={`Urgency: ${g.urgency || g.priority}`} value={urgConf}/>}
              {priScore != null && (
                <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",background:"#f9fafb",border:"1px solid #e5e7eb",borderRadius:10,padding:"9px 12px",marginTop:6 }}>
                  <div>
                    <div style={{ fontSize:9,textTransform:"uppercase",fontWeight:800,color:"#9ca3af",letterSpacing:"0.1em" }}>Priority Score</div>
                    <div style={{ fontSize:22,fontWeight:900,color:"#111827",letterSpacing:"-0.03em",marginTop:1 }}>{priScore.toFixed(3)}</div>
                  </div>
                  <Brain size={24} color="#e5e7eb" strokeWidth={1.5}/>
                </div>
              )}
              {/* Only final_reason shown — all other explanation fields hidden */}
              {finalReason && (
                <div style={{ marginTop:14,paddingTop:12,borderTop:"1px solid #f1f5f9" }}>
                  <div style={{ fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.1em",color:"#9ca3af",marginBottom:8 }}>AI Reasoning</div>
                  <p style={{ fontSize:12,color:"#374151",lineHeight:1.75,margin:0,background:"#f8fafc",padding:"10px 12px",borderRadius:8,border:"1px solid #f1f5f9" }}>{finalReason}</p>
                </div>
              )}
            </Section>
          )}

          {/* Photo Evidence */}
          {g.imageUrl && (
            <Section title="Photo Evidence" icon={ImageIcon} defaultOpen>
              <div style={{ position:"relative",cursor:"zoom-in",borderRadius:12,overflow:"hidden",border:"1px solid #e2e8f0" }} onClick={()=>setImgOpen(true)}>
                <img src={g.imageUrl} alt="Evidence" style={{ width:"100%",maxHeight:360,objectFit:"cover",display:"block" }}/>
                <div style={{ position:"absolute",bottom:10,right:10,background:"rgba(0,0,0,0.45)",borderRadius:6,padding:"3px 9px",fontSize:9,color:"#fff",fontWeight:700,backdropFilter:"blur(6px)",display:"flex",alignItems:"center",gap:4 }}>
                  <ImageIcon size={9}/> Tap to expand
                </div>
              </div>
            </Section>
          )}

          {/* Voice Note */}
          {g.audioUrl && (
            <Section title="Voice Note" icon={Mic} defaultOpen>
              <AudioPlayer src={g.audioUrl}/>
            </Section>
          )}

          {/* Official Response */}
          {g.adminReply && (
            <Section title="Official Response" icon={MessageSquare} defaultOpen>
              {g.estimatedTime && (
                <div style={{ display:"flex",alignItems:"center",gap:5,background:"#f9fafb",border:"1px solid #e5e7eb",borderRadius:7,padding:"6px 10px",marginBottom:8 }}>
                  <Clock size={11} color="#6b7280"/>
                  <span style={{ fontSize:11,fontWeight:700,color:"#374151" }}>Expected: {g.estimatedTime}</span>
                </div>
              )}
              <p style={{ fontSize:12,color:"#374151",lineHeight:1.7,margin:0,background:"#f9fafb",padding:"10px 12px",borderRadius:8,border:"1px solid #e5e7eb",borderLeft:"2px solid #d1d5db" }}>{g.adminReply}</p>
            </Section>
          )}

        </div>
      </div>
    </>
  );
}

/* ── Card ────────────────────────────────────────────────────────────────────── */
function GrievanceCard({ g, index, onClick }) {
  const date          = new Date(g.createdAt);
  const formattedDate = date.toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" });
  const formattedTime = date.toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" });

  return (
    <div className="gcard" style={{ animationDelay:`${index*50}ms` }} onClick={onClick}>
      <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:10,marginBottom:9 }}>
        <div style={{ display:"flex",alignItems:"center",gap:5,flexWrap:"wrap" }}>
          {/* Spam normalised to Pending in StatusBadge */}
          <StatusBadge status={g.status}/>
          <PriorityBadge priority={g.priority}/>
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:6,flexShrink:0 }}>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontFamily:"monospace",fontSize:10,color:"#374151",fontWeight:700 }}>{formattedDate}</div>
            <div style={{ fontFamily:"monospace",fontSize:9,color:"#94a3b8" }}>{formattedTime}</div>
          </div>
          <div style={{ width:24,height:24,borderRadius:7,background:"#f1f5f9",display:"flex",alignItems:"center",justifyContent:"center" }}>
            <ChevronRight size={12} color="#94a3b8"/>
          </div>
        </div>
      </div>

      <div style={{ marginBottom:9 }}>
        <div style={{ fontSize:13,fontWeight:800,color:"#0f172a",marginBottom:4,letterSpacing:"-0.01em" }}>{g.category} Issue</div>
        <div style={{ fontSize:12,color:"#64748b",lineHeight:1.6,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical" }}>{g.description}</div>
      </div>

      <div style={{ display:"flex",alignItems:"center",gap:6,flexWrap:"wrap" }}>
        <div style={{ display:"flex",alignItems:"center",gap:3 }}>
          <MapPin size={10} color="#94a3b8"/>
          <span style={{ fontSize:10,color:"#64748b",fontWeight:600 }}>{g.area}</span>
        </div>
        <span style={{ color:"#e2e8f0" }}>·</span>
        <span style={{ fontFamily:"monospace",fontSize:9,color:"#94a3b8" }}>#{g._id?.slice(-6).toUpperCase()}</span>
        {g.imageUrl && <span style={{ marginLeft:"auto",fontSize:10,color:"#6b7280",fontWeight:700,display:"flex",alignItems:"center",gap:2 }}><ImageIcon size={10}/> Photo</span>}
        {g.audioUrl && <span style={{ fontSize:10,color:"#6b7280",fontWeight:700,display:"flex",alignItems:"center",gap:2 }}><Mic size={10}/> Audio</span>}
      </div>

      {g.adminReply && (
        <div style={{ background:"#f9fafb",border:"1px solid #e5e7eb",borderLeft:"2px solid #d1d5db",borderRadius:8,padding:"7px 10px",marginTop:9 }}>
          <div style={{ display:"flex",alignItems:"center",gap:4,marginBottom:3 }}>
            <MessageSquare size={9} color="#9ca3af"/>
            <span style={{ fontSize:9,fontWeight:800,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.08em" }}>Official Response</span>
          </div>
          <p style={{ fontSize:11,color:"#374151",lineHeight:1.5,margin:0,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical" }}>{g.adminReply}</p>
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{ display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"56px 24px",textAlign:"center" }}>
      <div style={{ width:60,height:60,background:"#f8fafc",border:"1.5px solid #e2e8f0",borderRadius:18,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:14 }}>
        <FileText size={26} color="#cbd5e1"/>
      </div>
      <div style={{ fontSize:15,fontWeight:900,color:"#0f172a",marginBottom:6 }}>No reports yet</div>
      <div style={{ fontSize:12,color:"#9ca3af",lineHeight:1.7,maxWidth:240,marginBottom:20 }}>Your submitted grievances will appear here once you file a report.</div>
      <Link href="/citizen/lodge" style={{ display:"inline-flex",alignItems:"center",gap:6,padding:"10px 20px",borderRadius:12,background:"#0f172a",color:"#fff",fontSize:12,fontWeight:800,textDecoration:"none" }}>
        Lodge a Grievance →
      </Link>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  const is401 = message.includes("401");
  return (
    <div style={{ display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"56px 24px",textAlign:"center" }}>
      <div style={{ width:52,height:52,background:"#fef2f2",border:"1.5px solid #fecaca",borderRadius:16,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:14 }}>
        <AlertCircle size={24} color="#dc2626"/>
      </div>
      <div style={{ fontSize:14,fontWeight:900,color:"#0f172a",marginBottom:6 }}>{is401?"Session Expired":"Failed to load"}</div>
      <div style={{ fontSize:12,color:"#9ca3af",marginBottom:18,maxWidth:240,lineHeight:1.6 }}>{is401?"Please sign in again.":message}</div>
      {is401
        ? <Link href="/citizen/login" style={{ display:"inline-flex",alignItems:"center",gap:5,padding:"9px 18px",borderRadius:11,background:"#0f172a",color:"#fff",fontSize:12,fontWeight:800,textDecoration:"none" }}>Sign In Again</Link>
        : <button onClick={onRetry} style={{ display:"inline-flex",alignItems:"center",gap:5,padding:"9px 16px",borderRadius:11,background:"#0f172a",color:"#fff",fontSize:12,fontWeight:700,border:"none",cursor:"pointer",fontFamily:"inherit" }}><RefreshCw size={12}/> Try Again</button>
      }
    </div>
  );
}

/* ── Main Page ───────────────────────────────────────────────────────────────── */
export default function CitizenHistory() {
  const router = useRouter();
  const [grievances,   setGrievances]   = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [activeFilter, setActiveFilter] = useState("All");
  const [userName,     setUserName]     = useState("");
  const [selected,     setSelected]     = useState(null);
  const [scrolled,     setScrolled]     = useState(false);

  const loadHistory = useCallback(async () => {
    setLoading(true); setError(null);
    try { setGrievances(await fetchGrievanceHistory()); }
    catch (err) { setError(err.message || "Something went wrong."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const token   = localStorage.getItem("citizenToken");
    const userStr = localStorage.getItem("citizen_user");
    if (!token || !userStr) { router.push("/citizen/login"); return; }
    try {
      const user = JSON.parse(userStr);
      setUserName(user.fullName || user.name || user.email?.split("@")[0] || "");
      loadHistory();
    } catch { router.push("/citizen/login"); }
  }, [router, loadHistory]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleLogout = () => {
    ["citizenToken","citizenRefreshToken","citizen_user"].forEach(k=>localStorage.removeItem(k));
    router.push("/citizen/login");
  };

  // ── Counts: Spam is counted under Pending ────────────────────────────────────
  const counts = {
    All:      grievances.length,
    Pending:  grievances.filter(g => g.status === "Pending" || g.status === "Spam").length,
    Resolved: grievances.filter(g => g.status === "Resolved").length,
  };

  // ── Filter: Pending tab includes Spam records ────────────────────────────────
  const filtered = activeFilter === "All"
    ? grievances
    : activeFilter === "Pending"
      ? grievances.filter(g => g.status === "Pending" || g.status === "Spam")
      : grievances.filter(g => g.status === activeFilter);

  const resolvedPct = grievances.length ? Math.round((counts.Resolved / grievances.length) * 100) : 0;

  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=Fira+Code:wght@400;600&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; scroll-behavior: smooth; }
    body { background: #f9fafb; font-family: 'Plus Jakarta Sans', system-ui, sans-serif; -webkit-tap-highlight-color: transparent; }

    .ch-root { min-height: 100vh; width: 100%; background: #f9fafb; color: #111827; padding-bottom: 64px; position: relative; overflow-x: hidden; }

    .ch-nav {
      position: sticky; top: 0; z-index: 20;
      background: ${scrolled ? "rgba(255,255,255,0.95)" : "rgba(249,250,251,0.8)"};
      backdrop-filter: blur(16px);
      border-bottom: 1px solid ${scrolled ? "#e2e8f0" : "transparent"};
      transition: all 0.25s ease;
      box-shadow: ${scrolled ? "0 1px 12px rgba(0,0,0,0.05)" : "none"};
    }
    .ch-nav-inner { max-width: 680px; margin: 0 auto; padding: 0 clamp(14px,4vw,24px); height: clamp(54px,7vw,64px); display: flex; align-items: center; gap: 8px; }
    .nav-brand { display: flex; align-items: center; gap: 10px; text-decoration: none; flex: 1; min-width: 0; }
    .nav-logo-box { background: #111827; padding: 9px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.12); display: flex; flex-shrink: 0; transition: transform 0.2s; }
    .nav-logo-box:hover { transform: scale(1.06); }
    .nav-title { font-size: clamp(15px,3.5vw,18px); font-weight: 900; color: #0f172a; letter-spacing: -0.03em; }
    .nav-title span { color: #2563eb; }
    .nav-sub { font-size: 9px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.15em; margin-top: 1px; }

    .icon-btn { width: clamp(30px,5vw,36px); height: clamp(30px,5vw,36px); border-radius: 10px; border: 1px solid #e2e8f0; background: rgba(255,255,255,0.8); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.15s; flex-shrink: 0; }
    .icon-btn:hover { background: #f1f5f9; transform: scale(1.08); }
    .logout-btn { width: clamp(30px,5vw,36px); height: clamp(30px,5vw,36px); border-radius: 10px; border: 1px solid #fecaca; background: #fef2f2; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.15s; flex-shrink: 0; }
    .logout-btn:hover { background: #fee2e2; transform: scale(1.08); }

    .ch-page { max-width: 680px; margin: 0 auto; padding: clamp(16px,4vw,28px) clamp(14px,4vw,24px); }

    .greeting { margin-bottom: 18px; }
    .greeting-badge { display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; border-radius: 20px; background: #fff; border: 1px solid #e2e8f0; font-size: 10px; font-weight: 800; color: #64748b; box-shadow: 0 1px 4px rgba(0,0,0,0.05); margin-bottom: 10px; }
    .greeting-dot { width: 7px; height: 7px; border-radius: 50%; background: #9ca3af; position: relative; flex-shrink: 0; }
    @keyframes pulse { 0%,100%{transform:scale(1);opacity:0.5} 50%{transform:scale(2.2);opacity:0} }
    .greeting-dot::after { content:""; position:absolute; inset:-2px; border-radius:50%; background:#9ca3af; animation:pulse 1.8s ease infinite; }
    .greeting h1 { font-size: clamp(22px,5.5vw,32px); font-weight: 900; color: #111827; letter-spacing: -0.04em; line-height: 1.1; }
    .greeting-sub { font-size: clamp(11px,2.5vw,13px); color: #9ca3af; font-weight: 600; margin-top: 5px; }

    .summary { background: #fff; border: 1px solid #e2e8f0; border-radius: 18px; padding: clamp(12px,3vw,18px) clamp(14px,4vw,20px); margin-bottom: 14px; display: flex; align-items: center; gap: clamp(8px,2vw,18px); box-shadow: 0 1px 8px rgba(0,0,0,0.04); flex-wrap: wrap; }
    .sum-stat { text-align: center; flex: 1; min-width: 50px; }
    .sum-val { font-size: clamp(20px,5vw,30px); font-weight: 900; color: #111827; letter-spacing: -0.05em; line-height: 1; }
    .sum-lbl { font-size: clamp(8px,1.8vw,10px); font-weight: 800; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.1em; margin-top: 3px; }
    .sum-sep { width: 1px; height: 40px; background: #f1f5f9; flex-shrink: 0; }
    .res-col { flex: 2; min-width: 120px; }
    .res-label { display: flex; justify-content: space-between; font-size: 11px; font-weight: 700; color: #9ca3af; margin-bottom: 7px; }
    .res-track { height: 5px; background: #f1f5f9; border-radius: 3px; overflow: hidden; }
    .res-fill { height: 100%; background: #374151; border-radius: 3px; transition: width 1.2s cubic-bezier(0.34,1.56,0.64,1); }

    .filter-row { display: flex; gap: 3px; margin-bottom: 12px; background: #f1f5f9; padding: 3px; border-radius: 11px; width: 100%; }
    .ftab { flex: 1; padding: clamp(5px,1.5vw,8px) 8px; border-radius: 8px; font-size: clamp(10px,2.5vw,12px); font-weight: 800; cursor: pointer; border: none; font-family: inherit; transition: all 0.15s; display: flex; align-items: center; justify-content: center; gap: 4px; color: #64748b; background: transparent; }
    .ftab:hover { background: rgba(255,255,255,0.5); color: #374151; }
    .ftab.on { background: #fff; color: #0f172a; box-shadow: 0 1px 5px rgba(0,0,0,0.08); }
    .ftab-n { font-size: 9px; padding: 1px 5px; border-radius: 5px; background: #e5e7eb; color: #64748b; font-family: monospace; }
    .ftab.on .ftab-n { background: #0f172a; color: #fff; }

    .gcard { background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; padding: clamp(11px,3vw,14px) clamp(12px,3.5vw,15px); margin-bottom: 7px; cursor: pointer; transition: box-shadow 0.2s, border-color 0.2s, transform 0.2s cubic-bezier(0.34,1.56,0.64,1); animation: fadeUp 0.38s ease both; }
    .gcard:hover { border-color: #d1d5db; box-shadow: 0 3px 12px rgba(0,0,0,0.06); transform: translateY(-2px); }
    .gcard:active { transform: scale(0.99); }

    @keyframes fadeUp  { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
    @keyframes slideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
    @keyframes fadeIn  { from{opacity:0} to{opacity:1} }

    .skel { background: linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; border-radius: 6px; }
    @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
    .skel-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 14px; margin-bottom: 7px; }

    @media (max-width: 400px) {
      .sum-sep { display: none; }
      .res-col { flex-basis: 100%; }
      .sum-stat { flex: 1 1 30%; }
    }
    @media (min-width: 600px) {
      .gcard { margin-bottom: 10px; }
    }
  `;

  return (
    <>
      <style>{CSS}</style>
      <div className="ch-root">

        {/* Nav */}
        <nav className="ch-nav">
          <div className="ch-nav-inner">
            <button className="icon-btn" onClick={()=>router.back()} aria-label="Go back">
              <ArrowLeft size={15} color="#64748b"/>
            </button>
            <Link href="/" className="nav-brand">
              <div className="nav-logo-box"><Shield size={16} color="#fff"/></div>
              <div>
                <div className="nav-title">Civic<span>Connect</span></div>
                <div className="nav-sub">Municipal Corp</div>
              </div>
            </Link>
            <button className="icon-btn" onClick={loadHistory} aria-label="Refresh">
              <RefreshCw size={12} color="#64748b"/>
            </button>
            <button className="logout-btn" onClick={handleLogout} aria-label="Logout">
              <LogOut size={13} color="#dc2626"/>
            </button>
          </div>
        </nav>

        <div className="ch-page">

          {/* Greeting */}
          <div className="greeting">
            <div className="greeting-badge">
              <span className="greeting-dot"/>
              My Account
            </div>
            <h1>{userName ? <>Welcome back, {userName.split(" ")[0]}</> : <>My Reports</>}</h1>
            <p className="greeting-sub">Track and manage your submitted grievances</p>
          </div>

          {/* Summary strip */}
          {!loading && !error && grievances.length > 0 && (
            <div className="summary">
              <div className="sum-stat">
                <div className="sum-val">{counts.All}</div>
                <div className="sum-lbl">Total</div>
              </div>
              <div className="sum-sep"/>
              <div className="sum-stat">
                <div className="sum-val" style={{color:"#6b7280"}}>{counts.Pending}</div>
                <div className="sum-lbl">Pending</div>
              </div>
              <div className="sum-sep"/>
              <div className="sum-stat">
                <div className="sum-val" style={{color:"#374151"}}>{counts.Resolved}</div>
                <div className="sum-lbl">Resolved</div>
              </div>
              <div className="sum-sep"/>
              <div className="res-col">
                <div className="res-label">
                  <span>Resolution Rate</span>
                  <span style={{fontFamily:"monospace",color:"#0f172a",fontWeight:900}}>{resolvedPct}%</span>
                </div>
                <div className="res-track">
                  <div className="res-fill" style={{width:`${resolvedPct}%`}}/>
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          {!loading && !error && grievances.length > 0 && (
            <div className="filter-row">
              {FILTERS.map(f=>(
                <button key={f} className={`ftab${activeFilter===f?" on":""}`} onClick={()=>setActiveFilter(f)}>
                  {f} <span className="ftab-n">{counts[f]}</span>
                </button>
              ))}
            </div>
          )}

          {/* Skeletons */}
          {loading && [1,2,3].map(i=>(
            <div key={i} className="skel-card">
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
                <div className="skel" style={{width:130,height:20}}/>
                <div className="skel" style={{width:70,height:20}}/>
              </div>
              <div className="skel" style={{width:"50%",height:16,marginBottom:9}}/>
              <div className="skel" style={{width:"100%",height:12,marginBottom:5}}/>
              <div className="skel" style={{width:"70%",height:12}}/>
            </div>
          ))}

          {/* Error */}
          {!loading && error && (
            <div style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:16}}>
              <ErrorState message={error} onRetry={loadHistory}/>
            </div>
          )}

          {/* Empty */}
          {!loading && !error && grievances.length===0 && (
            <div style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:16}}>
              <EmptyState/>
            </div>
          )}

          {/* Cards */}
          {!loading && !error && filtered.map((g,i)=>(
            <GrievanceCard key={g._id} g={g} index={i} onClick={()=>setSelected(g)}/>
          ))}

          {/* Filtered empty */}
          {!loading && !error && grievances.length>0 && filtered.length===0 && (
            <div style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:16,padding:"48px 24px",textAlign:"center"}}>
              <Calendar size={24} color="#e2e8f0" style={{margin:"0 auto 10px",display:"block"}}/>
              <div style={{fontSize:13,fontWeight:700,color:"#9ca3af"}}>No {activeFilter.toLowerCase()} reports found</div>
            </div>
          )}

        </div>
      </div>

      {selected && <GrievanceDrawer g={selected} onClose={()=>setSelected(null)}/>}
    </>
  );
}