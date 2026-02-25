"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Shield, LayoutDashboard, CheckCircle2, Clock, X, MapPin, Loader2,
  LogOut, Trash2, Ban, FileText, BarChart2, ShieldCheck, Activity,
  Zap, Trash, Bus, Construction, Wind, PawPrint, MoreHorizontal,
  Filter, Droplets, Siren, AlertOctagon, Mic, Play, Pause,
  Image as ImageIcon, Brain, ChevronRight, TrendingUp, Info, Send
} from "lucide-react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const getAdminToken  = () => (typeof window !== "undefined" ? localStorage.getItem("adminToken") : null);
const getAdminUser   = () => { try { return JSON.parse(localStorage.getItem("adminUser") || "null"); } catch { return null; } };
const clearAdminAuth = () => ["adminToken","adminRefreshToken","admin_user"].forEach(k => localStorage.removeItem(k));
const authHeaders    = () => { const t = getAdminToken(); return { "Content-Type":"application/json", ...(t?{Authorization:`Bearer ${t}`}:{}) }; };
function mediaUrl(url) { if (!url) return null; return url.startsWith("http") ? url : `${API}/${url}`; }

const CATEGORIES = [
  { label:"All",              icon:LayoutDashboard },
  { label:"Electricity",      icon:Zap             },
  { label:"Garbage",          icon:Trash           },
  { label:"Pollution",        icon:Wind            },
  { label:"Public Transport", icon:Bus             },
  { label:"Roads",            icon:Construction    },
  { label:"Sanitation",       icon:Droplets        },
  { label:"Stray Animals",    icon:PawPrint        },
  { label:"Water",            icon:Droplets        },
  { label:"Others",           icon:MoreHorizontal  },
];
const knownCats = ["Electricity","Garbage","Pollution","Public Transport","Roads","Sanitation","Stray Animals","Water"];

const URGENCY = {
  Critical:  { label:"Critical", color:"#dc2626" },
  Immediate: { label:"Critical", color:"#dc2626" },
  High:      { label:"High",     color:"#d97706" },
  Medium:    { label:"Medium",   color:"#2563eb" },
  Low:       { label:"Low",      color:"#16a34a" },
};
const STATUS = {
  Resolved: { label:"Resolved", color:"#16a34a", bg:"#f0fdf4" },
  Pending:  { label:"Pending",  color:"#d97706", bg:"#fefce8" },
  Spam:     { label:"Spam",     color:"#dc2626", bg:"#fef2f2" },
};
const URGENCY_PIN = {
  Critical:  { fill:"#dc2626", stroke:"#991b1b" },
  Immediate: { fill:"#dc2626", stroke:"#991b1b" },
  High:      { fill:"#f97316", stroke:"#c2410c" },
  Medium:    { fill:"#3b82f6", stroke:"#1d4ed8" },
  Low:       { fill:"#22c55e", stroke:"#15803d" },
};
function pinColor(p){ return URGENCY_PIN[p] || URGENCY_PIN.Low; }
function getCatIcon(label) { return (CATEGORIES.find(c=>c.label===label)||CATEGORIES[CATEGORIES.length-1]).icon; }
function matchCat(g, cat) {
  if (cat==="All") return true;
  if (cat==="Others") return !knownCats.includes(g.category);
  return g.category===cat;
}

const KAKINADA_AREAS = {
  "kakinada":[16.9891,82.2475],"kakinada city":[16.9891,82.2475],
  "main road":[16.9930,82.2430],"gandhi nagar":[16.9975,82.2380],
  "gandhinagar":[16.9975,82.2380],"surya rao peta":[16.9855,82.2510],
  "suryaraopeta":[16.9855,82.2510],"jagannaikpur":[17.0010,82.2390],
  "raja rao peta":[16.9900,82.2460],"rajaraopeta":[16.9900,82.2460],
  "bhanugudi":[16.9830,82.2530],"rajah street":[16.9910,82.2470],
  "old town":[16.9870,82.2490],"new town":[16.9940,82.2420],
  "srinivasa nagar":[17.0050,82.2350],"ashoknagar":[17.0080,82.2430],
  "ashok nagar":[17.0080,82.2430],"nethaji nagar":[17.0020,82.2460],
  "port area":[17.0050,82.2620],"kakinada port":[17.0050,82.2620],
  "beach road":[16.9920,82.2590],"beach":[16.9920,82.2590],
  "uppada":[16.9500,82.3050],"tallarevu":[16.8950,82.2350],
  "peddapuram":[17.0796,82.1381],"samalkot":[17.0569,82.1722],
  "ramachandrapuram":[16.8355,81.7718],"amalapuram":[16.5775,82.0100],
  "razole":[16.4766,81.8360],"mandapeta":[16.8644,81.9297],
  "pithapuram":[17.1131,82.2537],"tuni":[17.3580,82.5460],
  "rowthulapudi":[17.0700,82.2000],"sarpavaram":[16.9730,82.2800],
  "draksharamam":[16.7938,82.0650],"yeleswaram":[17.1360,82.2360],
  "collector's colony":[16.9870,82.2550],"dairy farm":[17.0100,82.2500],
  "tngo colony":[16.9960,82.2500],"shankar vilas":[16.9940,82.2530],
  "jr ntr road":[16.9920,82.2450],"vivekananda street":[16.9880,82.2440],
  "kaleswara rao nagar":[16.9800,82.2560],"fishing harbour":[17.0120,82.2650],
  "hope island":[16.9700,82.2750],"korukonda":[17.0130,82.1640],
  "biccavolu":[17.0244,82.0778],"prathipadu":[17.1000,82.1600],
  "gollaprolu":[17.0750,82.0500],"kajuluru":[17.0320,82.3100],
  "jagannadhapuram":[17.0200,82.2700],"kathipudi":[17.2200,82.2200],
  "kotananduru":[17.0850,82.1900],"kirlampudi":[17.1900,82.1500],
  "sankhavaram":[17.1600,82.1800],"pedana":[16.2600,81.1500],
  "bank colony":[16.9845,82.2465],
};
const geocodeCache = {};
async function geocodeArea(area) {
  if (!area) return null;
  const key = area.trim().toLowerCase();
  if (KAKINADA_AREAS[key]) return KAKINADA_AREAS[key];
  for (const [k, coords] of Object.entries(KAKINADA_AREAS)) {
    if (key.includes(k) || k.includes(key)) return coords;
  }
  try {
    const q = encodeURIComponent(`${area}, Kakinada, Andhra Pradesh, India`);
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`,{ headers:{ "User-Agent":"CivicConnect-Admin/1.0" } });
    const json = await res.json();
    if (json[0]) return [parseFloat(json[0].lat), parseFloat(json[0].lon)];
  } catch {}
  return null;
}
function spiralOffset(index, total){
  if(total===1) return [0,0];
  const ring=Math.ceil(index/8), pos=index%8;
  const angle=(pos/Math.min(total,8))*2*Math.PI;
  const STEP=0.0014;
  return [Math.sin(angle)*STEP*ring, Math.cos(angle)*STEP*ring];
}

// ── Tiny inline confirm dialog ────────────────────────────────────────────────
function ConfirmBox({ message, onConfirm, onCancel }) {
  return (
    <div style={{ background:"#fff",border:"1px solid #e5e7eb",borderRadius:9,padding:"12px 14px",display:"flex",flexDirection:"column",gap:10 }}>
      <p style={{ margin:0,fontSize:12,color:"#374151",lineHeight:1.5 }}>{message}</p>
      <div style={{ display:"flex",gap:7,justifyContent:"flex-end" }}>
        <button onClick={onCancel} style={{ padding:"5px 14px",borderRadius:6,border:"1px solid #e5e7eb",background:"#fff",color:"#6b7280",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit" }}>Cancel</button>
        <button onClick={onConfirm} style={{ padding:"5px 14px",borderRadius:6,border:"none",background:"#111827",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>Confirm</button>
      </div>
    </div>
  );
}

// ── Tags ──────────────────────────────────────────────────────────────────────
function UrgencyTag({ priority }) {
  const c = URGENCY[priority] || URGENCY.Low;
  return <span style={{ fontSize:10,fontWeight:700,color:c.color }}>{c.label}</span>;
}
function StatusTag({ status }) {
  const c = STATUS[status] || STATUS.Pending;
  return (
    <span style={{ fontSize:10,fontWeight:600,color:c.color,background:c.bg,padding:"1px 8px",borderRadius:4,border:`1px solid ${c.color}25` }}>
      {c.label}
    </span>
  );
}

// ── Minimal Token Bar (monochrome) ────────────────────────────────────────────
function TokenBar({ token, impact, maxImp }) {
  const pct = Math.abs(impact) / maxImp;
  const pos = impact >= 0;
  return (
    <div style={{ display:"flex",alignItems:"center",gap:8,padding:"3px 0" }}>
      {/* negative side */}
      <div style={{ width:80,display:"flex",justifyContent:"flex-end" }}>
        {!pos && (
          <div style={{ height:16,width:`${pct*80}px`,background:"#9ca3af",borderRadius:"3px 0 0 3px",display:"flex",alignItems:"center",justifyContent:"flex-end",paddingRight:4,minWidth:24,maxWidth:80 }}>
            <span style={{ fontSize:8,color:"#fff",fontWeight:700,whiteSpace:"nowrap" }}>{impact.toFixed(2)}</span>
          </div>
        )}
      </div>
      {/* token chip */}
      <div style={{ background:pos?"#f1f5f9":"#f8fafc",border:"1px solid #e2e8f0",borderRadius:4,padding:"1px 8px",minWidth:68,textAlign:"center",flexShrink:0 }}>
        <span style={{ fontSize:11,fontWeight:600,color:pos?"#374151":"#6b7280",fontFamily:"monospace" }}>{token}</span>
      </div>
      {/* positive side */}
      <div style={{ width:80 }}>
        {pos && (
          <div style={{ height:16,width:`${pct*80}px`,background:"#374151",borderRadius:"0 3px 3px 0",display:"flex",alignItems:"center",paddingLeft:4,minWidth:24,maxWidth:80 }}>
            <span style={{ fontSize:8,color:"#fff",fontWeight:700,whiteSpace:"nowrap" }}>+{impact.toFixed(2)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Minimal confidence bar ────────────────────────────────────────────────────
function ConfBar({ label, value, note }) {
  const pct = Math.round(value * 100);
  return (
    <div style={{ display:"flex",flexDirection:"column",gap:4 }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"baseline" }}>
        <span style={{ fontSize:11,color:"#374151",fontWeight:600 }}>{label}</span>
        <div style={{ display:"flex",alignItems:"baseline",gap:5 }}>
          {note && <span style={{ fontSize:9,color:"#94a3b8" }}>{note}</span>}
          <span style={{ fontSize:12,fontWeight:700,color:"#111827",fontFamily:"monospace" }}>{pct}%</span>
        </div>
      </div>
      <div style={{ height:4,background:"#f1f5f9",borderRadius:2,overflow:"hidden" }}>
        <div style={{ height:"100%",width:`${pct}%`,background:"#374151",borderRadius:2,transition:"width 0.6s ease" }}/>
      </div>
    </div>
  );
}

// ── AI Explanation Modal (minimal / monochrome) ───────────────────────────────
function AIExplainModal({ grievance, onClose }) {
  if (!grievance) return null;

  const ex          = grievance.explanation || {};
  const category    = grievance.category;
  const catConf     = grievance.categoryConfidence ?? grievance.category_confidence ?? 0;
  const urgency     = grievance.urgency || grievance.priority;
  const urgConf     = grievance.urgencyConfidence  ?? grievance.urgency_confidence  ?? 0;
  const priScore    = grievance.priorityScore       ?? grievance.priority_score      ?? 0;
  const lang        = grievance.language || "english";
  const text        = grievance.description || "";

  const catTokens        = ex.categoryTokens  || ex.category_tokens  || [];
  const urgTokens        = ex.urgencyTokens   || ex.urgency_tokens   || [];
  const finalReason      = ex.finalReason      || ex.final_reason      || "";
  const categoryDecision = ex.categoryDecision || ex.category_decision || "";
  const urgencyDecision  = ex.urgencyDecision  || ex.urgency_decision  || "";
  const prioritySummary  = ex.prioritySummary  || ex.priority_summary  || "";

  const catMaxImp = Math.max(...catTokens.map(t=>Math.abs(t.impact)), 1);
  const urgMaxImp = Math.max(...urgTokens.map(t=>Math.abs(t.impact)), 1);

  const SectionLabel = ({ children }) => (
    <div style={{ fontSize:9,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8 }}>{children}</div>
  );

  const DecisionBlock = ({ label, text: txt }) => txt ? (
    <div style={{ borderLeft:"2px solid #e2e8f0",paddingLeft:12 }}>
      <div style={{ fontSize:9,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:5 }}>{label}</div>
      <p style={{ fontSize:12,color:"#374151",lineHeight:1.7,margin:0 }}>{txt}</p>
    </div>
  ) : null;

  return (
    <div onClick={onClose} style={{ position:"fixed",inset:0,zIndex:150000,background:"rgba(0,0,0,0.4)",backdropFilter:"blur(3px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:"#fff",width:"100%",maxWidth:640,maxHeight:"92vh",overflowY:"auto",borderRadius:14,boxShadow:"0 24px 60px rgba(0,0,0,0.18)",border:"1px solid #e5e7eb",position:"relative" }}>

        {/* Header */}
        <div style={{ padding:"16px 20px 14px",borderBottom:"1px solid #f1f5f9",position:"sticky",top:0,background:"#fff",zIndex:5,display:"flex",alignItems:"center",justifyContent:"space-between" }}>
          <div style={{ display:"flex",alignItems:"center",gap:8 }}>
            <Brain size={15} color="#374151"/>
            <div>
              <div style={{ fontSize:13,fontWeight:700,color:"#111827" }}>AI Classification Report</div>
              <div style={{ fontSize:10,color:"#9ca3af",marginTop:1 }}>Language: {lang} · ID: #{grievance._id?.slice(-8).toUpperCase()}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ width:28,height:28,borderRadius:"50%",border:"1px solid #e5e7eb",background:"#f9fafb",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>
            <X size={13} color="#6b7280"/>
          </button>
        </div>

        <div style={{ padding:"18px 20px",display:"flex",flexDirection:"column",gap:20 }}>

          {/* Analysed text */}
          <div style={{ background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:8,padding:"10px 14px" }}>
            <SectionLabel>Analysed Text</SectionLabel>
            <p style={{ fontSize:13,color:"#374151",lineHeight:1.6,margin:0,fontStyle:"italic" }}>"{text}"</p>
          </div>

          {/* Score row */}
          <div>
            <SectionLabel>Confidence Overview</SectionLabel>
            <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
              <ConfBar label={`Category — ${category}`}    value={catConf}  note={`${catTokens.length} tokens`}/>
              <ConfBar label={`Urgency — ${urgency}`}      value={urgConf}  note={`${urgTokens.length} tokens`}/>
              <ConfBar label="Priority Score (composite)"  value={priScore} note={priScore>0.7?"high":priScore>0.4?"medium":"low"}/>
            </div>
          </div>

          {/* Meta chips */}
          <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
            {[
              { k:"Category",      v:category },
              { k:"Urgency",       v:urgency },
              { k:"Cat. Conf.",    v:`${(catConf*100).toFixed(1)}%` },
              { k:"Urg. Conf.",    v:`${(urgConf*100).toFixed(1)}%` },
              { k:"Priority Score",v:priScore.toFixed(4) },
              { k:"Language",      v:lang },
            ].map(m=>(
              <div key={m.k} style={{ background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:7,padding:"6px 12px",flex:"1 1 auto",minWidth:80 }}>
                <div style={{ fontSize:9,color:"#94a3b8",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:2 }}>{m.k}</div>
                <div style={{ fontSize:13,fontWeight:700,color:"#111827",fontFamily:"monospace" }}>{m.v}</div>
              </div>
            ))}
          </div>

          {/* Category tokens */}
          {catTokens.length>0&&(
            <div>
              <SectionLabel>Category Token Attribution — "{category}"</SectionLabel>
              <div style={{ background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:8,padding:"10px 14px" }}>
                <div style={{ display:"flex",justifyContent:"space-between",marginBottom:8 }}>
                  <span style={{ fontSize:9,color:"#9ca3af",fontWeight:600 }}>← reduces confidence</span>
                  <span style={{ fontSize:9,color:"#374151",fontWeight:700 }}>boosts confidence →</span>
                </div>
                {catTokens.map((t,i)=><TokenBar key={i} token={t.token} impact={t.impact} maxImp={catMaxImp}/>)}
              </div>
            </div>
          )}

          {/* Urgency tokens */}
          {urgTokens.length>0&&(
            <div>
              <SectionLabel>Urgency Token Attribution — "{urgency}"</SectionLabel>
              <div style={{ background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:8,padding:"10px 14px" }}>
                <div style={{ display:"flex",justifyContent:"space-between",marginBottom:8 }}>
                  <span style={{ fontSize:9,color:"#9ca3af",fontWeight:600 }}>← dampens urgency</span>
                  <span style={{ fontSize:9,color:"#374151",fontWeight:700 }}>raises urgency →</span>
                </div>
                {urgTokens.map((t,i)=><TokenBar key={i} token={t.token} impact={t.impact} maxImp={urgMaxImp}/>)}
              </div>
            </div>
          )}

          {/* Decision blocks */}
          {(categoryDecision||urgencyDecision||prioritySummary)&&(
            <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
              <SectionLabel>Model Decisions</SectionLabel>
              <DecisionBlock label="Category Decision" text={categoryDecision}/>
              <DecisionBlock label="Urgency Decision"  text={urgencyDecision}/>
              <DecisionBlock label="Priority Summary"  text={prioritySummary}/>
            </div>
          )}

          {/* Final reasoning */}
          {finalReason&&(
            <div>
              <SectionLabel>Full Reasoning</SectionLabel>
              <div style={{ background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:8,padding:"12px 14px" }}>
                <p style={{ fontSize:12,color:"#374151",lineHeight:1.75,margin:0 }}>{finalReason}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:"11px 20px",borderTop:"1px solid #f1f5f9",background:"#f9fafb",borderRadius:"0 0 14px 14px",display:"flex",justifyContent:"flex-end" }}>
          <button onClick={onClose} style={{ padding:"7px 20px",borderRadius:7,border:"1px solid #e5e7eb",background:"#fff",color:"#374151",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit" }}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ── Voice Player ──────────────────────────────────────────────────────────────
function VoicePlayer({ src }) {
  const [playing,setPlaying]   = useState(false);
  const [progress,setProgress] = useState(0);
  const [duration,setDuration] = useState(0);
  const audioRef    = useRef(null);
  const progressRef = useRef(null);
  const BARS = Array.from({length:30},(_,i)=>20+Math.sin(i*0.9)*12+Math.cos(i*1.5)*6);
  useEffect(()=>{
    const a=audioRef.current; if(!a) return;
    const onMeta=()=>setDuration(a.duration||0);
    const onTime=()=>setProgress(a.duration?(a.currentTime/a.duration)*100:0);
    const onEnd=()=>{setPlaying(false);setProgress(0);};
    a.addEventListener("loadedmetadata",onMeta);
    a.addEventListener("timeupdate",onTime);
    a.addEventListener("ended",onEnd);
    return()=>{ a.removeEventListener("loadedmetadata",onMeta); a.removeEventListener("timeupdate",onTime); a.removeEventListener("ended",onEnd); };
  },[]);
  const toggle=()=>{ const a=audioRef.current; if(!a)return; playing?a.pause():a.play(); setPlaying(!playing); };
  const seek=(e)=>{
    if(!progressRef.current)return;
    const r=progressRef.current.getBoundingClientRect();
    const p=(e.clientX-r.left)/r.width;
    if(audioRef.current) audioRef.current.currentTime=p*(audioRef.current.duration||0);
  };
  const fmt=(s)=>`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,"0")}`;
  const active=Math.floor((progress/100)*BARS.length);
  return (
    <div style={{display:"inline-flex",alignItems:"center",gap:8,background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:36,padding:"5px 10px 5px 5px",width:"100%",maxWidth:280}}>
      <audio ref={audioRef} src={src} preload="metadata"/>
      <button onClick={toggle} style={{width:30,height:30,borderRadius:"50%",background:"#0f172a",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
        {playing?<Pause size={11} color="#fff"/>:<Play size={11} color="#fff" style={{marginLeft:1}}/>}
      </button>
      <div style={{flex:1,display:"flex",flexDirection:"column",gap:4,minWidth:0}}>
        <div style={{display:"flex",alignItems:"center",gap:1.5,height:18}}>
          {BARS.map((h,i)=>(
            <div key={i} style={{width:2,height:h*0.6,borderRadius:1,flexShrink:0,background:i<active?"#475569":"#d1d5db"}}/>
          ))}
        </div>
        <div ref={progressRef} onClick={seek} style={{height:2,background:"#e2e8f0",borderRadius:1,cursor:"pointer"}}>
          <div style={{height:"100%",width:`${progress}%`,background:"#374151",borderRadius:1,transition:"width 0.1s"}}/>
        </div>
      </div>
      <span style={{fontSize:9,fontFamily:"monospace",fontWeight:700,color:"#94a3b8",flexShrink:0,whiteSpace:"nowrap"}}>
        {fmt((progress/100)*duration)}<span style={{color:"#d1d5db",margin:"0 1px"}}>/</span>{duration?fmt(duration):"--:--"}
      </span>
    </div>
  );
}

// ── Leaflet Map ───────────────────────────────────────────────────────────────
function GrievanceMap({ allGrievances, onOpenDetail }) {
  const mapRef     = useRef(null);
  const leafletRef = useRef(null);
  const [mapStatus, setMapStatus] = useState("idle");
  const [counts,    setCounts]    = useState({total:0,plotted:0});

  useEffect(()=>{
    if(typeof window==="undefined") return;
    const nonSpam = allGrievances.filter(g=>g.status!=="Spam");
    if(!nonSpam.length){ setCounts({total:0,plotted:0}); setMapStatus("idle"); return; }
    let cancelled=false;
    setMapStatus("geocoding");
    setCounts({total:nonSpam.length,plotted:0});
    (async()=>{
      const needAreaLookup = nonSpam.filter(g=>{
        const lat = g.location?.coordinates?.[1]??g.location?.lat??g.lat;
        const lng = g.location?.coordinates?.[0]??g.location?.lng??g.lng;
        return !lat||!lng;
      });
      const uniqueAreas=[...new Set(needAreaLookup.map(g=>(g.area||"").trim()).filter(Boolean))];
      await Promise.all(uniqueAreas.map(area=>{
        const key=area.toLowerCase();
        if(!geocodeCache[key]) geocodeCache[key]=geocodeArea(area);
        return geocodeCache[key];
      }));
      if(cancelled) return;
      const resolvedCoords={};
      for(const g of nonSpam){
        let lat=g.location?.coordinates?.[1]??g.location?.lat??parseFloat(g.lat);
        let lng=g.location?.coordinates?.[0]??g.location?.lng??parseFloat(g.lng);
        if(!lat||!lng||isNaN(lat)||isNaN(lng)){
          const areaKey=(g.area||"").trim().toLowerCase();
          const coords=await geocodeCache[areaKey]||null;
          if(coords){lat=coords[0];lng=coords[1];}
        }
        if(lat&&lng&&!isNaN(lat)&&!isNaN(lng)) resolvedCoords[g._id]=[lat,lng];
      }
      if(cancelled) return;
      const locationGroups={};
      for(const g of nonSpam){
        const coord=resolvedCoords[g._id]; if(!coord) continue;
        const key=`${coord[0].toFixed(4)}_${coord[1].toFixed(4)}`;
        if(!locationGroups[key]) locationGroups[key]={base:coord,items:[]};
        locationGroups[key].items.push(g);
      }
      const plotItems=[];
      for(const {base,items} of Object.values(locationGroups)){
        items.forEach((g,idx)=>{
          const [dLat,dLng]=spiralOffset(idx,items.length);
          plotItems.push({g,lat:base[0]+dLat,lng:base[1]+dLng});
        });
      }
      if(cancelled) return;
      setCounts({total:nonSpam.length,plotted:plotItems.length});
      const areaCount={};
      for(const {g,lat,lng} of plotItems){
        const k=(g.area||"unknown").toLowerCase();
        if(!areaCount[k]) areaCount[k]={lat,lng,area:g.area||"Unknown",count:0};
        areaCount[k].count++;
      }
      const hotspot=Object.values(areaCount).reduce((a,b)=>b.count>a.count?b:a,{count:0,lat:0,lng:0,area:""});
      if(!window.L){
        await new Promise(res=>{
          const lnk=document.createElement("link");lnk.rel="stylesheet";lnk.href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";document.head.appendChild(lnk);
          const scr=document.createElement("script");scr.src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";scr.onload=res;document.head.appendChild(scr);
        });
      }
      if(cancelled||!mapRef.current) return;
      setMapStatus("drawing");
      if(leafletRef.current){leafletRef.current.remove();leafletRef.current=null;}
      const L=window.L;
      const map=L.map(mapRef.current,{center:[16.9891,82.2475],zoom:12,zoomControl:true,scrollWheelZoom:false});
      mapRef.current.addEventListener("wheel",e=>{ if(e.ctrlKey){e.preventDefault();map.scrollWheelZoom.enable();}else map.scrollWheelZoom.disable(); },{passive:false});
      leafletRef.current=map;
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:'© <a href="https://www.openstreetmap.org/copyright">OSM</a>'}).addTo(map);
      if(hotspot.count>1){
        L.circle([hotspot.lat,hotspot.lng],{radius:380,color:"#dc2626",fillColor:"#fca5a5",fillOpacity:0.18,weight:2,dashArray:"8 5"}).addTo(map);
        const lbl=L.divIcon({className:"",html:`<div style="background:#dc2626;color:#fff;font-size:10px;font-weight:800;padding:3px 10px;border-radius:10px;white-space:nowrap;box-shadow:0 2px 8px rgba(220,38,38,0.4)">🔥 Hotspot · ${hotspot.area} · ${hotspot.count} reports</div>`,iconAnchor:[0,0]});
        L.marker([hotspot.lat+0.004,hotspot.lng],{icon:lbl,interactive:false}).addTo(map);
      }
      for(const {g,lat,lng} of plotItems){
        const pc=pinColor(g.priority);
        const isResolved=g.status==="Resolved";
        const size=isResolved?11:15;
        const icon=L.divIcon({className:"",html:`<div style="width:${size}px;height:${size}px;border-radius:50%;background:${pc.fill};border:2.5px solid ${pc.stroke};box-shadow:0 2px 6px rgba(0,0,0,0.28);cursor:pointer;opacity:${isResolved?0.55:1}"></div>`,iconSize:[size,size],iconAnchor:[size/2,size/2]});
        const marker=L.marker([lat,lng],{icon,zIndexOffset:isResolved?0:100}).addTo(map);
        marker.on("click",e=>{L.DomEvent.stopPropagation(e);onOpenDetail(g);});
      }
      if(cancelled){map.remove();leafletRef.current=null;}
      else setMapStatus("done");
    })();
    return()=>{cancelled=true;};
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[allGrievances]);
  useEffect(()=>()=>{if(leafletRef.current){leafletRef.current.remove();leafletRef.current=null;}},[]);
  const isLoading=mapStatus==="geocoding"||mapStatus==="drawing";
  return(
    <div style={{position:"relative",width:"100%",height:"100%"}}>
      {isLoading&&<div style={{position:"absolute",top:12,right:12,zIndex:10000,background:"rgba(255,255,255,0.97)",border:"1px solid #e5e7eb",borderRadius:8,padding:"6px 13px",display:"flex",alignItems:"center",gap:6,fontSize:11,color:"#6b7280"}}><Loader2 size={11} style={{animation:"spin 0.7s linear infinite"}}/>{mapStatus==="geocoding"?"Resolving locations…":"Drawing pins…"}</div>}
      {mapStatus==="done"&&<div style={{position:"absolute",top:2,left:30,zIndex:10000,background:"rgba(255,255,255,0.97)",border:"1px solid #e5e7eb",borderRadius:8,padding:"5px 12px",fontSize:11,color:"#374151",fontWeight:600,display:"flex",alignItems:"center",gap:6}}><span style={{color:"#16a34a",fontSize:13}}>●</span>{counts.plotted}/{counts.total} plotted{counts.plotted<counts.total&&<span style={{color:"#d97706",fontSize:10}}> ({counts.total-counts.plotted} unknown)</span>}</div>}
      <div style={{position:"absolute",bottom:28,left:12,zIndex:10000,background:"rgba(255,255,255,0.97)",border:"1px solid #e5e7eb",borderRadius:9,padding:"9px 12px"}}>
        <div style={{fontSize:9,fontWeight:700,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.09em",marginBottom:6}}>Urgency</div>
        <div style={{display:"flex",flexDirection:"column",gap:5}}>
          {[["Critical","#dc2626","#991b1b"],["High","#f97316","#c2410c"],["Medium","#3b82f6","#1d4ed8"],["Low","#22c55e","#15803d"]].map(([l,f,s])=>(
            <div key={l} style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:11,height:11,borderRadius:"50%",background:f,border:`2px solid ${s}`,flexShrink:0}}/><span style={{fontSize:10,color:"#374151",fontWeight:600}}>{l}</span></div>
          ))}
          <div style={{marginTop:2,paddingTop:5,borderTop:"1px solid #f1f5f9",display:"flex",alignItems:"center",gap:6}}><div style={{width:18,height:0,borderTop:"2px dashed #dc2626",flexShrink:0}}/><span style={{fontSize:10,color:"#dc2626",fontWeight:700}}>Hotspot</span></div>
          <div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:9,height:9,borderRadius:"50%",background:"#22c55e",border:"2px solid #15803d",opacity:0.5,flexShrink:0}}/><span style={{fontSize:10,color:"#94a3b8",fontWeight:600}}>Resolved</span></div>
        </div>
      </div>
      <div ref={mapRef} style={{width:"100%",height:"100%"}}/>
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const router=useRouter();
  const [adminUser,       setAdminUser]      = useState(null);
  const [authReady,       setAuthReady]      = useState(false);
  const [grievances,      setGrievances]     = useState([]);
  const [loading,         setLoading]        = useState(true);
  const [activeCategory,  setActiveCategory] = useState("All");
  const [activeUrgency,   setActiveUrgency]  = useState("All");
  const [activeStatus,    setActiveStatus]   = useState("All");
  const [isSmartSort,     setIsSmartSort]    = useState(false);
  const [selected,        setSelected]       = useState(null);
  const [resolvingId,     setResolvingId]    = useState(null);
  const [viewingImage,    setViewingImage]   = useState(null);
  const [aiExplain,       setAiExplain]      = useState(null);

  // Inline UI state (replace prompt/confirm)
  const [replyText,       setReplyText]      = useState("Your issue has been resolved successfully.");
  const [showReplyBox,    setShowReplyBox]   = useState(false);     // in detail modal
  const [confirmSpam,     setConfirmSpam]    = useState(false);     // in detail modal
  const [confirmDelete,   setConfirmDelete]  = useState(null);      // grievance._id

  useEffect(()=>{
    const token=getAdminToken(),user=getAdminUser();
    if(!token||!user){router.replace("/admin/login");return;}
    setAdminUser(user);setAuthReady(true);
  },[router]);

  const fetchGrievances=useCallback(async()=>{
    const token=getAdminToken();if(!token)return;
    setLoading(true);
    try{
      const res=await fetch(`${API}/api/grievances`,{headers:{Authorization:`Bearer ${token}`},credentials:"include",cache:"no-store"});
      if(res.status===401){clearAdminAuth();router.replace("/admin/login");return;}
      const data=await res.json();
      if(data.success) setGrievances(data.data);
    }catch(e){console.error(e);}
    finally{setLoading(false);}
  },[router]);

  useEffect(()=>{if(authReady) fetchGrievances();},[authReady,fetchGrievances]);

  const handleLogout=async()=>{
    try{await fetch(`${API}/api/auth/logout`,{method:"POST",headers:{Authorization:`Bearer ${getAdminToken()}`},credentials:"include"});}catch{}
    clearAdminAuth();router.replace("/admin/login");
  };

  // Resolve — uses inline replyText state, no window.prompt
  const handleResolve=async()=>{
    if(!selected||!replyText.trim()) return;
    const id=selected._id;
    setResolvingId(id);
    setShowReplyBox(false);
    try{
      const res=await fetch(`${API}/api/grievances/${id}`,{method:"PUT",headers:authHeaders(),body:JSON.stringify({status:"Resolved",adminReply:replyText.trim(),estimatedTime:"Completed"})});
      const data=await res.json();
      if(data.success){
        setGrievances(p=>p.map(g=>g._id===id?{...g,status:"Resolved",adminReply:replyText.trim()}:g));
        setSelected(p=>({...p,status:"Resolved",adminReply:replyText.trim()}));
      }
    }catch(e){console.error(e);}
    finally{setResolvingId(null);}
  };

  // Spam — uses inline confirmSpam state, no window.confirm
  const handleSpam=async()=>{
    if(!selected) return;
    const id=selected._id;
    setConfirmSpam(false);
    try{
      const res=await fetch(`${API}/api/grievances/${id}`,{method:"PUT",headers:authHeaders(),body:JSON.stringify({status:"Spam"})});
      if(res.ok){setGrievances(p=>p.map(g=>g._id===id?{...g,status:"Spam"}:g));setSelected(null);}
    }catch(e){console.error(e);}
  };

  // Delete — uses inline confirmDelete, no window.confirm
  const handleDelete=async(id)=>{
    setConfirmDelete(null);
    try{
      const res=await fetch(`${API}/api/grievances/${id}`,{method:"DELETE",headers:{Authorization:`Bearer ${getAdminToken()}`},credentials:"include"});
      if(res.ok){setGrievances(p=>p.filter(g=>g._id!==id));if(selected?._id===id)setSelected(null);}
    }catch(e){console.error(e);}
  };

  // Reset inline UI when modal closes
  const closeDetail = () => {
    setSelected(null);
    setShowReplyBox(false);
    setConfirmSpam(false);
    setReplyText("Your issue has been resolved successfully.");
  };

  const nonSpam    = grievances.filter(g=>g.status!=="Spam");
  const spamList   = grievances.filter(g=>g.status==="Spam");
  const isSpamView = activeStatus==="Spam";
  const catCount   = (cat)=>nonSpam.filter(g=>matchCat(g,cat)).length;
  const cnt        = (k,v)=>nonSpam.filter(g=>g[k]===v).length;
  const resolvedPct= nonSpam.length?Math.round((cnt("status","Resolved")/nonSpam.length)*100):0;

  const getDisplayList=()=>{
    if(isSpamView) return spamList;
    let list=nonSpam;
    if(activeCategory!=="All") list=list.filter(g=>matchCat(g,activeCategory));
    if(activeUrgency!=="All"){const vals=activeUrgency==="Critical"?["Immediate","Critical"]:[activeUrgency];list=list.filter(g=>vals.includes(g.priority));}
    if(activeStatus!=="All"&&activeStatus!=="Spam") list=list.filter(g=>g.status===activeStatus);
    const w={Immediate:4,Critical:4,High:3,Medium:2,Low:1};
    return isSmartSort
      ?[...list].sort((a,b)=>(b.status==="Resolved"?-1:w[b.priority]||0)-(a.status==="Resolved"?-1:w[a.priority]||0))
      :[...list].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  };
  const displayList  = getDisplayList();
  const catBreakdown = CATEGORIES.slice(1).map(cat=>({...cat,count:catCount(cat.label)})).sort((a,b)=>b.count-a.count);
  const maxCat       = catBreakdown[0]?.count||1;

  if(!authReady) return(
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#f9fafb",fontFamily:"system-ui",gap:8,color:"#6b7280",fontSize:13}}>
      <Loader2 size={15} style={{animation:"spin 0.7s linear infinite"}}/>Verifying session…
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return(
    <div style={{fontFamily:"'DM Sans','Segoe UI',system-ui,sans-serif",background:"#f3f4f6",minHeight:"100vh",color:"#111827"}}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.35}}
        *{box-sizing:border-box}
        ::-webkit-scrollbar{display:none}
        .leaflet-container{font-family:'DM Sans',system-ui,sans-serif!important}
      `}</style>

      {/* HEADER */}
      <header style={{background:"#fff",borderBottom:"1px solid #e5e7eb",height:54,padding:"0 24px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:50,boxShadow:"0 1px 3px rgba(0,0,0,0.05)"}}>
        <div style={{display:"flex",alignItems:"center",gap:11}}>
          <div style={{width:32,height:32,borderRadius:9,background:"#eff6ff",border:"1px solid #bfdbfe",display:"flex",alignItems:"center",justifyContent:"center"}}><Shield size={16} color="#2563eb"/></div>
          <div>
            <div style={{fontSize:15,fontWeight:800,color:"#111827",letterSpacing:"-0.02em",lineHeight:1}}>Civic<span style={{color:"#2563eb"}}>Connect</span></div>
            <div style={{fontSize:9,color:"#94a3b8",letterSpacing:"0.09em",fontWeight:600,marginTop:1}}>ADMIN PORTAL · MUNICIPAL CORP</div>
          </div>
          <div style={{width:1,height:22,background:"#e2e8f0",margin:"0 6px"}}/>
          <span style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:"#16a34a",fontWeight:700}}>
            <span style={{width:7,height:7,borderRadius:"50%",background:"#16a34a",animation:"blink 2s infinite",display:"inline-block"}}/>LIVE
          </span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {adminUser?.name&&<span style={{fontSize:11,fontWeight:700,color:"#2563eb",background:"#eff6ff",border:"1px solid #bfdbfe",padding:"3px 12px",borderRadius:16}}>{adminUser.name}</span>}
          <button onClick={()=>setActiveStatus(s=>s==="Spam"?"All":"Spam")} style={{display:"flex",alignItems:"center",gap:5,padding:"5px 12px",borderRadius:7,border:"1px solid #fecaca",background:"#fff5f5",color:"#dc2626",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
            <Ban size={10}/>Spam<span style={{background:"#fecaca",color:"#991b1b",fontSize:9,padding:"1px 6px",borderRadius:8,fontWeight:700}}>{spamList.length}</span>
          </button>
          <button onClick={handleLogout} style={{display:"flex",alignItems:"center",gap:5,padding:"5px 12px",borderRadius:7,border:"1px solid #e2e8f0",background:"#f8fafc",color:"#64748b",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
            <LogOut size={10}/>Logout
          </button>
        </div>
      </header>

      {/* CATEGORY NAV */}
      <nav style={{background:"#fff",borderBottom:"1px solid #e5e7eb",padding:"0 20px",display:"flex",overflowX:"auto"}}>
        {CATEGORIES.map(cat=>{
          const Icon=cat.icon,on=activeCategory===cat.label;
          return(
            <button key={cat.label} onClick={()=>{setActiveCategory(cat.label);if(activeStatus==="Spam")setActiveStatus("All");setActiveUrgency("All");}}
              style={{display:"flex",alignItems:"center",gap:5,padding:"0 13px",height:42,fontSize:12,fontWeight:on?700:500,color:on?"#111827":"#6b7280",background:"none",border:"none",borderBottom:`2px solid ${on?"#374151":"transparent"}`,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0,fontFamily:"inherit"}}>
              <Icon size={11} color={on?"#374151":"#9ca3af"}/>{cat.label}
              <span style={{fontSize:9,padding:"1px 5px",borderRadius:4,background:on?"#f1f5f9":"#f9fafb",color:on?"#374151":"#9ca3af",fontFamily:"monospace"}}>{catCount(cat.label)}</span>
            </button>
          );
        })}
      </nav>

      <div style={{maxWidth:1440,margin:"0 auto",padding:"16px 20px 60px"}}>

        {isSpamView&&(
          <div style={{background:"#fff",border:"1px solid #fecaca",borderLeft:"3px solid #dc2626",borderRadius:9,padding:"10px 16px",display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
            <AlertOctagon size={14} color="#dc2626"/>
            <div>
              <div style={{fontWeight:700,fontSize:12,color:"#991b1b"}}>Spam Folder — {spamList.length} record{spamList.length!==1?"s":""}</div>
              <div style={{fontSize:11,color:"#b91c1c"}}>Hidden from citizens. Permanently delete records here.</div>
            </div>
            <button onClick={()=>setActiveStatus("All")} style={{marginLeft:"auto",padding:"4px 12px",borderRadius:7,border:"1px solid #e5e7eb",background:"#fff",color:"#6b7280",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>← Back</button>
          </div>
        )}

        {!isSpamView&&(
          <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:14}}>
            <span style={{fontSize:10,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.1em",display:"flex",alignItems:"center",gap:3}}><Filter size={9}/>Urgency</span>
            {["All","Critical","High","Medium","Low"].map(u=>(
              <button key={u} onClick={()=>setActiveUrgency(u)}
                style={{padding:"3px 12px",borderRadius:14,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit",border:`1px solid ${activeUrgency===u?"#d1d5db":"#e5e7eb"}`,background:activeUrgency===u?"#f1f5f9":"#fff",color:activeUrgency===u?"#111827":"#6b7280"}}>{u}</button>
            ))}
            <div style={{marginLeft:"auto",display:"flex",gap:2,background:"#f1f5f9",padding:2,borderRadius:7}}>
              {["All","Pending","Resolved"].map(s=>(
                <button key={s} onClick={()=>setActiveStatus(s)}
                  style={{padding:"3px 13px",borderRadius:5,fontSize:11,fontWeight:600,cursor:"pointer",border:"none",fontFamily:"inherit",background:activeStatus===s?"#374151":"transparent",color:activeStatus===s?"#fff":"#6b7280"}}>{s}</button>
              ))}
            </div>
          </div>
        )}

        <div style={{display:"grid",gridTemplateColumns:"1fr 268px",gap:14,marginBottom:14}}>
          {/* List */}
          <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:10,overflow:"hidden"}}>
            <div style={{padding:"11px 16px",borderBottom:"1px solid #f1f5f9",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <span style={{fontSize:12,fontWeight:700,color:"#374151",display:"flex",alignItems:"center",gap:5}}>
                {isSpamView?<><Ban size={12} color="#dc2626"/>Spam</>:<><LayoutDashboard size={12} color="#94a3b8"/>{activeCategory==="All"?"All Grievances":activeCategory}</>}
              </span>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{display:"flex",alignItems:"center",gap:6,background:"#f9fafb",border:"1px solid #e5e7eb",padding:"3px 10px",borderRadius:6}}>
                  <span style={{fontSize:10,fontWeight:600,color:!isSmartSort?"#111827":"#94a3b8"}}>Time</span>
                  <button onClick={()=>setIsSmartSort(!isSmartSort)} style={{width:30,height:15,borderRadius:8,border:"none",padding:1,position:"relative",cursor:"pointer",background:isSmartSort?"#2563eb":"#d1d5db",transition:"background 0.2s"}}>
                    <div style={{width:12,height:12,background:"#fff",borderRadius:"50%",position:"absolute",top:1.5,left:2,transition:"transform 0.2s",transform:isSmartSort?"translateX(13px)":"none"}}/>
                  </button>
                  <span style={{fontSize:10,fontWeight:600,color:isSmartSort?"#111827":"#94a3b8"}}>Priority</span>
                </div>
                <span style={{fontSize:10,fontFamily:"monospace",background:"#f3f4f6",border:"1px solid #e5e7eb",padding:"2px 7px",borderRadius:4,color:"#6b7280"}}>{displayList.length}</span>
              </div>
            </div>
            <div style={{maxHeight:520,overflowY:"auto"}}>
              {loading?(
                <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:48,color:"#94a3b8",gap:7,fontSize:12}}>
                  <Loader2 size={14} style={{animation:"spin 0.7s linear infinite"}}/>Loading grievances…
                </div>
              ):displayList.length===0?(
                <div style={{textAlign:"center",padding:"48px 16px",color:"#94a3b8"}}>
                  <FileText size={26} color="#e2e8f0" style={{margin:"0 auto 10px",display:"block"}}/>
                  <div style={{fontWeight:600,fontSize:13,color:"#374151"}}>No records found</div>
                  <div style={{fontSize:11,marginTop:4}}>{grievances.length===0?"No grievances yet.":"Try adjusting filters."}</div>
                </div>
              ):displayList.map(g=>{
                const Icon=getCatIcon(g.category);
                const hasAI=!!(g.explanation||g.categoryConfidence||g.category_confidence);
                return(
                  <div key={g._id} onClick={()=>{ setSelected(g); setShowReplyBox(false); setConfirmSpam(false); setReplyText("Your issue has been resolved successfully."); }}
                    style={{display:"grid",gridTemplateColumns:"30px 1fr auto",gap:12,padding:"11px 16px",borderBottom:"1px solid #f8fafc",cursor:"pointer",alignItems:"start"}}
                    onMouseEnter={e=>e.currentTarget.style.background="#f8fafc"}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <div style={{width:30,height:30,borderRadius:7,background:"#f1f5f9",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Icon size={13} color="#64748b"/></div>
                    <div>
                      <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:3,flexWrap:"wrap"}}>
                        <span style={{fontSize:13,fontWeight:600,color:"#111827"}}>{g.category}</span>
                        <UrgencyTag priority={g.priority}/>
                        <StatusTag status={g.status}/>
                        {g.audioUrl&&<span style={{display:"flex",alignItems:"center",gap:2,fontSize:9,color:"#94a3b8"}}><Mic size={8}/>Voice</span>}
                        {g.imageUrl&&<span style={{display:"flex",alignItems:"center",gap:2,fontSize:9,color:"#94a3b8"}}><ImageIcon size={8}/>Photo</span>}
                        {hasAI&&<span style={{display:"flex",alignItems:"center",gap:2,fontSize:9,color:"#374151",background:"#f1f5f9",padding:"1px 6px",borderRadius:4,fontWeight:600,border:"1px solid #e2e8f0"}}><Brain size={7}/>AI</span>}
                      </div>
                      <div style={{fontSize:12,color:"#64748b",marginBottom:3,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:1,WebkitBoxOrient:"vertical"}}>{g.description}</div>
                      <div style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:"#94a3b8"}}>
                        <MapPin size={9}/>{g.area}{g.citizenName&&<><span>·</span>{g.citizenName}</>}
                      </div>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:5}}>
                      <span style={{fontSize:10,color:"#94a3b8",fontFamily:"monospace",whiteSpace:"nowrap"}}>{new Date(g.createdAt).toLocaleString("en-IN",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}</span>
                      {/* Inline delete confirm for spam list items */}
                      {isSpamView&&(
                        confirmDelete===g._id ? (
                          <div onClick={e=>e.stopPropagation()}>
                            <ConfirmBox
                              message="Permanently delete this record?"
                              onConfirm={()=>handleDelete(g._id)}
                              onCancel={()=>setConfirmDelete(null)}
                            />
                          </div>
                        ) : (
                          <button onClick={e=>{e.stopPropagation();setConfirmDelete(g._id);}} style={{display:"flex",alignItems:"center",gap:4,padding:"2px 8px",borderRadius:5,border:"1px solid #fecaca",background:"#fff",color:"#dc2626",fontSize:10,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
                            <Trash2 size={9}/>Delete
                          </button>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sidebar */}
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:10,overflow:"hidden"}}>
              <div style={{padding:"10px 14px",borderBottom:"1px solid #f1f5f9",fontSize:12,fontWeight:700,color:"#374151",display:"flex",alignItems:"center",gap:5}}><ShieldCheck size={12} color="#94a3b8"/>Summary</div>
              {[
                {l:"Total Filed",   v:grievances.length, icon:FileText},
                {l:"Active",        v:nonSpam.length,    icon:Activity},
                {l:"Pending",       v:cnt("status","Pending"),  icon:Clock},
                {l:"Resolved",      v:cnt("status","Resolved"), icon:CheckCircle2},
                {l:"Critical",      v:nonSpam.filter(g=>g.priority==="Immediate"||g.priority==="Critical").length, icon:Siren},
                {l:"Spam Filtered", v:spamList.length,   icon:Ban},
              ].map(s=>(
                <div key={s.l} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 14px",borderBottom:"1px solid #f8fafc"}}>
                  <span style={{display:"flex",alignItems:"center",gap:5,fontSize:12,color:"#64748b"}}><s.icon size={10} color="#94a3b8"/>{s.l}</span>
                  <span style={{fontSize:12,fontWeight:700,color:"#111827",fontFamily:"monospace"}}>{s.v}</span>
                </div>
              ))}
              <div style={{padding:"10px 14px"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:5,fontSize:11}}>
                  <span style={{color:"#64748b",fontWeight:600}}>Resolution Rate</span>
                  <span style={{fontFamily:"monospace",fontWeight:700,color:"#111827"}}>{resolvedPct}%</span>
                </div>
                <div style={{height:4,background:"#f1f5f9",borderRadius:2,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${resolvedPct}%`,background:"#2563eb",borderRadius:2,transition:"width 0.8s"}}/>
                </div>
              </div>
            </div>
            <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:10,overflow:"hidden"}}>
              <div style={{padding:"10px 14px",borderBottom:"1px solid #f1f5f9",fontSize:12,fontWeight:700,color:"#374151",display:"flex",alignItems:"center",gap:5}}><BarChart2 size={12} color="#94a3b8"/>By Category</div>
              <div style={{padding:"10px 14px",display:"flex",flexDirection:"column",gap:7}}>
                {catBreakdown.filter(c=>c.count>0).length===0
                  ?<div style={{fontSize:11,color:"#94a3b8",textAlign:"center",padding:"8px 0"}}>No data</div>
                  :catBreakdown.filter(c=>c.count>0).map(cat=>{
                    const Icon=cat.icon,pct=(cat.count/maxCat)*100;
                    return(
                      <div key={cat.label} onClick={()=>setActiveCategory(cat.label)} style={{display:"flex",alignItems:"center",gap:7,cursor:"pointer"}}>
                        <span style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:"#64748b",minWidth:96,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}><Icon size={9} color="#94a3b8"/>{cat.label}</span>
                        <div style={{flex:1,height:4,background:"#f1f5f9",borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",width:`${pct}%`,background:"#374151",borderRadius:2}}/></div>
                        <span style={{fontSize:10,color:"#94a3b8",minWidth:16,textAlign:"right",fontFamily:"monospace"}}>{cat.count}</span>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>

        {/* MAP */}
        <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,overflow:"hidden",boxShadow:"0 2px 16px rgba(0,0,0,0.05)"}}>
          <div style={{padding:"13px 20px",borderBottom:"1px solid #f1f5f9",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{width:30,height:30,borderRadius:8,background:"#fff5f5",border:"1px solid #fecaca",display:"flex",alignItems:"center",justifyContent:"center"}}><MapPin size={14} color="#dc2626"/></div>
              <div>
                <div style={{fontSize:14,fontWeight:700,color:"#111827"}}>Grievance Map · Kakinada District</div>
                <div style={{fontSize:10,color:"#94a3b8",marginTop:1}}>All active grievances plotted. Click any pin to see complaint details.</div>
              </div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:11,background:"#f0fdf4",color:"#16a34a",border:"1px solid #bbf7d0",padding:"3px 10px",borderRadius:10,fontWeight:700}}>{nonSpam.length} total pins</span>
              <span style={{fontSize:11,background:"#fff5f5",color:"#dc2626",border:"1px solid #fecaca",padding:"4px 12px",borderRadius:14,fontWeight:700}}>📍 Live · Kakinada</span>
            </div>
          </div>
          <div style={{height:580,position:"relative"}}>
            <GrievanceMap allGrievances={nonSpam} onOpenDetail={(g)=>{setSelected(g);setShowReplyBox(false);setConfirmSpam(false);setReplyText("Your issue has been resolved successfully.");}}/>
          </div>
        </div>
      </div>

      {/* ── DETAIL MODAL ── */}
      {selected&&(
        <div onClick={closeDetail} style={{position:"fixed",inset:0,zIndex:99999,background:"rgba(15,23,42,0.45)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#fff",width:"100%",maxWidth:500,maxHeight:"92vh",overflowY:"auto",borderRadius:14,boxShadow:"0 32px 80px rgba(0,0,0,0.22)",border:"1px solid #e5e7eb",position:"relative"}}>

            {/* Modal header */}
            <div style={{padding:"18px 22px 14px",borderBottom:"1px solid #f1f5f9",position:"sticky",top:0,background:"#fff",zIndex:5}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:7,flexWrap:"wrap"}}>
                    {(()=>{const Icon=getCatIcon(selected.category);return <div style={{width:26,height:26,borderRadius:7,background:"#f1f5f9",display:"flex",alignItems:"center",justifyContent:"center"}}><Icon size={13} color="#64748b"/></div>;})()}
                    <UrgencyTag priority={selected.priority}/>
                    <StatusTag status={selected.status}/>
                    <span style={{fontSize:10,color:"#94a3b8",background:"#f1f5f9",padding:"2px 7px",borderRadius:4,fontFamily:"monospace"}}>#{selected._id.slice(-8).toUpperCase()}</span>
                  </div>
                  <div style={{fontSize:18,fontWeight:800,color:"#111827",letterSpacing:"-0.02em"}}>{selected.category} Issue</div>
                  <div style={{fontSize:12,color:"#64748b",marginTop:3}}>Filed by <strong>{selected.citizenName||"Anonymous"}</strong>{selected.userEmail&&<> · {selected.userEmail}</>}</div>
                </div>
                <button onClick={closeDetail} style={{padding:7,borderRadius:7,border:"1px solid #e2e8f0",background:"#fff",cursor:"pointer",display:"flex"}}><X size={14} color="#64748b"/></button>
              </div>
            </div>

            <div style={{padding:"14px 22px"}}>
              {/* Location + time */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
                <div style={{background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:8,padding:"9px 11px"}}>
                  <div style={{fontSize:9,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:4}}>Location</div>
                  <div style={{fontSize:12,color:"#111827",display:"flex",alignItems:"center",gap:4}}><MapPin size={10} color="#64748b"/>{selected.area}</div>
                </div>
                <div style={{background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:8,padding:"9px 11px"}}>
                  <div style={{fontSize:9,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:4}}>Submitted</div>
                  <div style={{fontSize:11,color:"#111827",fontFamily:"monospace"}}>{new Date(selected.createdAt).toLocaleString("en-IN",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"})}</div>
                </div>
              </div>

              {/* Description */}
              <div style={{marginBottom:12}}>
                <div style={{fontSize:9,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:5}}>Description</div>
                <div style={{background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:8,padding:"10px 12px",fontSize:13,color:"#111827",lineHeight:1.65,whiteSpace:"pre-wrap"}}>{selected.description}</div>
              </div>

              {/* AI classification mini-strip */}
              {(selected.categoryConfidence||selected.category_confidence)&&(
                <div style={{background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:9,padding:"11px 13px",marginBottom:12}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <Brain size={12} color="#374151"/>
                      <span style={{fontSize:11,fontWeight:700,color:"#374151"}}>AI Classification</span>
                    </div>
                    <button onClick={()=>{closeDetail();setAiExplain(selected);}}
                      style={{display:"flex",alignItems:"center",gap:3,padding:"4px 10px",borderRadius:6,border:"1px solid #e2e8f0",background:"#fff",color:"#374151",fontSize:10,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
                      <Info size={9}/>Full Report <ChevronRight size={9}/>
                    </button>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                    {[
                      {label:"Category",     value:selected.category,                                                           sub:`${((selected.categoryConfidence||selected.category_confidence||0)*100).toFixed(1)}% conf`},
                      {label:"Urgency",      value:selected.urgency||selected.priority,                                         sub:`${((selected.urgencyConfidence||selected.urgency_confidence||0)*100).toFixed(1)}% conf`},
                      {label:"Priority",     value:(selected.priorityScore||selected.priority_score||0).toFixed(3),             sub:"composite score"},
                    ].map(m=>(
                      <div key={m.label} style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:7,padding:"7px 9px"}}>
                        <div style={{fontSize:9,color:"#94a3b8",fontWeight:600,marginBottom:2,textTransform:"uppercase",letterSpacing:"0.06em"}}>{m.label}</div>
                        <div style={{fontSize:13,fontWeight:700,color:"#111827",lineHeight:1.2}}>{m.value}</div>
                        <div style={{fontSize:9,color:"#9ca3af",marginTop:2}}>{m.sub}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Voice */}
              {selected.audioUrl&&(()=>{const src=mediaUrl(selected.audioUrl);return src?(<div style={{marginBottom:12}}><div style={{fontSize:9,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:5}}>Voice Note</div><VoicePlayer src={src}/></div>):null;})()}

              {/* Photo */}
              {selected.imageUrl&&(()=>{
                const src=mediaUrl(selected.imageUrl);
                return src?(<div style={{marginBottom:12}}>
                  <div style={{fontSize:9,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:5}}>Photo Evidence</div>
                  <div onClick={()=>setViewingImage(src)} style={{borderRadius:8,overflow:"hidden",border:"1px solid #e2e8f0",cursor:"zoom-in"}}>
                    <img src={src} alt="Evidence" style={{width:"100%",maxHeight:200,objectFit:"cover",display:"block"}}/>
                  </div>
                </div>):null;
              })()}

              {/* Admin reply (if already resolved) */}
              {selected.adminReply&&(
                <div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderLeft:"3px solid #16a34a",borderRadius:8,padding:"10px 12px",marginBottom:12}}>
                  <div style={{fontSize:9,fontWeight:700,color:"#15803d",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:4}}>Official Reply</div>
                  <div style={{fontSize:13,color:"#166534"}}>{selected.adminReply}</div>
                </div>
              )}

              {/* ── Inline Spam confirm ── */}
              {confirmSpam&&(
                <div style={{marginBottom:12}}>
                  <ConfirmBox
                    message="Mark this complaint as spam? It will be hidden from the citizen portal."
                    onConfirm={handleSpam}
                    onCancel={()=>setConfirmSpam(false)}
                  />
                </div>
              )}

              {/* ── Inline Reply box ── */}
              {showReplyBox&&selected.status==="Pending"&&(
                <div style={{marginBottom:12,background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:9,padding:"12px 14px"}}>
                  <div style={{fontSize:9,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>Reply to Citizen</div>
                  <textarea
                    value={replyText}
                    onChange={e=>setReplyText(e.target.value)}
                    rows={3}
                    style={{width:"100%",borderRadius:7,border:"1px solid #e2e8f0",padding:"9px 11px",fontSize:13,color:"#111827",fontFamily:"inherit",resize:"vertical",outline:"none",background:"#fff",lineHeight:1.5}}
                  />
                  <div style={{display:"flex",gap:7,marginTop:8,justifyContent:"flex-end"}}>
                    <button onClick={()=>setShowReplyBox(false)} style={{padding:"6px 14px",borderRadius:7,border:"1px solid #e2e8f0",background:"#fff",color:"#374151",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
                    <button disabled={!replyText.trim()||resolvingId===selected._id} onClick={handleResolve}
                      style={{display:"flex",alignItems:"center",gap:5,padding:"6px 15px",borderRadius:7,border:"none",background:"#111827",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",opacity:(!replyText.trim()||resolvingId===selected._id)?0.4:1}}>
                      {resolvingId===selected._id?<><Loader2 size={12} style={{animation:"spin 0.7s linear infinite"}}/>Sending…</>:<><Send size={11}/>Send &amp; Resolve</>}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div style={{padding:"11px 22px",borderTop:"1px solid #f1f5f9",display:"flex",justifyContent:"space-between",alignItems:"center",background:"#f8fafc",position:"sticky",bottom:0,borderRadius:"0 0 14px 14px"}}>
              <div style={{display:"flex",gap:6}}>
                {selected.status!=="Spam"&&selected.status!=="Resolved"&&!confirmSpam&&(
                  <button onClick={()=>{setConfirmSpam(true);setShowReplyBox(false);}} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",borderRadius:7,border:"1px solid #fecaca",background:"#fff",color:"#dc2626",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
                    <Ban size={11}/>Mark Spam
                  </button>
                )}
                {(selected.explanation||selected.categoryConfidence||selected.category_confidence)&&(
                  <button onClick={()=>{closeDetail();setAiExplain(selected);}}
                    style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",borderRadius:7,border:"1px solid #e2e8f0",background:"#fff",color:"#374151",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
                    <Brain size={11}/>AI Report
                  </button>
                )}
              </div>
              <div style={{display:"flex",gap:7}}>
                <button onClick={closeDetail} style={{padding:"6px 14px",borderRadius:7,border:"1px solid #e2e8f0",background:"#fff",color:"#374151",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Close</button>
                {selected.status==="Pending"&&!showReplyBox&&(
                  <button onClick={()=>{setShowReplyBox(true);setConfirmSpam(false);}}
                    style={{display:"flex",alignItems:"center",gap:5,padding:"6px 15px",borderRadius:7,border:"none",background:"#111827",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                    <CheckCircle2 size={12}/>Mark Resolved
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI EXPLAIN MODAL */}
      <AIExplainModal grievance={aiExplain} onClose={()=>setAiExplain(null)}/>

      {/* FULLSCREEN IMAGE */}
      {viewingImage&&(
        <div onClick={()=>setViewingImage(null)} style={{position:"fixed",inset:0,zIndex:200000,background:"rgba(0,0,0,0.93)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <button onClick={()=>setViewingImage(null)} style={{position:"absolute",top:16,right:16,background:"rgba(255,255,255,0.12)",border:"none",borderRadius:"50%",padding:9,cursor:"pointer",display:"flex"}}><X size={16} color="#fff"/></button>
          <img src={viewingImage} alt="Full View" onClick={e=>e.stopPropagation()} style={{maxWidth:"100%",maxHeight:"90vh",borderRadius:10,boxShadow:"0 24px 80px rgba(0,0,0,0.6)"}}/>
        </div>
      )}
    </div>
  );
}