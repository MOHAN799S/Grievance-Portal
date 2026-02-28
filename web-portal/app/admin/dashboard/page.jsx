"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Shield, LayoutDashboard, CheckCircle2, Clock, X, MapPin, Loader2,
  LogOut, Trash2, Ban, FileText, BarChart2, ShieldCheck, Activity,
  Zap, Trash, Bus, Construction, Wind, PawPrint, MoreHorizontal,
  Filter, Droplets, Siren, AlertOctagon, Mic, Play, Pause,
  Image as ImageIcon, Brain, ChevronRight, Info, Send,
  Scale, AlertTriangle, CheckCircle, Users, RefreshCw,
  ChevronDown, ChevronUp, Minus, ChevronLeft
} from "lucide-react";
import { useRouter } from "next/navigation";

// ─── Config ──────────────────────────────────────────────────────────────────
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const getAdminToken = () => (typeof window !== "undefined" ? localStorage.getItem("adminToken") : null);
const getAdminUser = () => { try { return JSON.parse(localStorage.getItem("adminUser") || "null"); } catch { return null; } };
const clearAdminAuth = () => ["adminToken", "adminRefreshToken", "admin_user"].forEach(k => localStorage.removeItem(k));
const authHeaders = () => { const t = getAdminToken(); return { "Content-Type": "application/json", ...(t ? { Authorization: `Bearer ${t}` } : {}) }; };
const mediaUrl = (url) => { if (!url) return null; return url.startsWith("http") ? url : `${API}/${url}`; };

// ─── Primary Colors ───────────────────────────────────────────────────────────
const PRIMARY = {
  gradient: "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
  gradientHover: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
  blue: "#3b82f6",
  indigo: "#6366f1",
  light: "#f8fafc",
  lightBorder: "#e2e8f0",
  text: "#0f172a",
};

// ─── Categories ───────────────────────────────────────────────────────────────
const CATEGORIES = [
  { label: "All", icon: LayoutDashboard },
  { label: "Electricity", icon: Zap },
  { label: "Garbage", icon: Trash },
  { label: "Pollution", icon: Wind },
  { label: "Public Transport", icon: Bus },
  { label: "Roads", icon: Construction },
  { label: "Sanitation", icon: Droplets },
  { label: "Stray Animals", icon: PawPrint },
  { label: "Water", icon: Droplets },
  { label: "Others", icon: MoreHorizontal },
];
const knownCats = ["Electricity", "Garbage", "Pollution", "Public Transport", "Roads", "Sanitation", "Stray Animals", "Water"];

// ─── Urgency / Status / Risk Config ──────────────────────────────────────────
const URGENCY = {
  Critical: { label: "Critical", color: "#e11d48" },
  Immediate: { label: "Critical", color: "#e11d48" },
  High: { label: "High", color: "#d97706" },
  Medium: { label: "Medium", color: "#2563eb" },
  Low: { label: "Low", color: "#16a34a" },
};
const STATUS = {
  Resolved: { label: "Resolved", color: "#16a34a", bg: "rgba(22,163,74,0.08)" },
  Pending: { label: "Pending", color: "#d97706", bg: "rgba(217,119,6,0.08)" },
  Spam: { label: "Spam", color: "#e11d48", bg: "rgba(225,29,72,0.08)" },
};
const RISK_COLORS = {
  High: { fill: "#e11d48", stroke: "#9f1239", bg: "rgba(225,29,72,0.05)", border: "rgba(225,29,72,0.2)", label: "HIGH RISK", priority: 1 },
  Medium: { fill: "#ea580c", stroke: "#9a3412", bg: "rgba(234,88,12,0.05)", border: "rgba(234,88,12,0.2)", label: "MEDIUM RISK", priority: 2 },
  Low: { fill: "#16a34a", stroke: "#15803d", bg: "rgba(22,163,74,0.05)", border: "rgba(22,163,74,0.2)", label: "LOW RISK", priority: 3 },
};

// ─── GFAS Config ─────────────────────────────────────────────────────────────
const FAIRNESS_DIMENSIONS = ["area", "category", "language"];
const DIM_META = {
  area: { label: "Geographic Area", shortLabel: "Area", icon: MapPin, color: "#2563eb", lightColor: "#60a5fa", bg: "rgba(37,99,235,0.06)", border: "rgba(37,99,235,0.2)" },
  category: { label: "Grievance Type", shortLabel: "Category", icon: BarChart2, color: "#7c3aed", lightColor: "#a78bfa", bg: "rgba(124,58,237,0.06)", border: "rgba(124,58,237,0.2)" },
  language: { label: "Language of Submission", shortLabel: "Language", icon: Users, color: "#b45309", lightColor: "#fbbf24", bg: "rgba(180,83,9,0.06)", border: "rgba(180,83,9,0.2)" },
};
const SCORE_CONFIG = (score) => {
  if (score >= 80) return { label: "EQUITABLE", color: "#16a34a", bg: "rgba(22,163,74,0.06)", border: "rgba(22,163,74,0.2)", band: "A" };
  if (score >= 60) return { label: "MODERATE", color: "#b45309", bg: "rgba(180,83,9,0.06)", border: "rgba(180,83,9,0.2)", band: "B" };
  return { label: "INEQUITABLE", color: "#e11d48", bg: "rgba(225,29,72,0.06)", border: "rgba(225,29,72,0.2)", band: "C" };
};

// ─── Pagination Config ────────────────────────────────────────────────────────
const PAGE_SIZE = 10;

// ─── Kakinada geocodes ────────────────────────────────────────────────────────
const KAKINADA_AREAS = {
  "kakinada": [16.9891, 82.2475], "kakinada city": [16.9891, 82.2475],
  "main road": [16.9930, 82.2430], "gandhi nagar": [16.9975, 82.2380],
  "gandhinagar": [16.9975, 82.2380], "surya rao peta": [16.9855, 82.2510],
  "suryaraopeta": [16.9855, 82.2510], "jagannaikpur": [17.0010, 82.2390],
  "raja rao peta": [16.9900, 82.2460], "rajaraopeta": [16.9900, 82.2460],
  "bhanugudi": [16.9830, 82.2530], "rajah street": [16.9910, 82.2470],
  "old town": [16.9870, 82.2490], "new town": [16.9940, 82.2420],
  "srinivasa nagar": [17.0050, 82.2350], "ashoknagar": [17.0080, 82.2430],
  "ashok nagar": [17.0080, 82.2430], "nethaji nagar": [17.0020, 82.2460],
  "port area": [17.0050, 82.2620], "kakinada port": [17.0050, 82.2620],
  "beach road": [16.9920, 82.2590], "beach": [16.9920, 82.2590],
  "uppada": [16.9500, 82.3050], "tallarevu": [16.8950, 82.2350],
  "peddapuram": [17.0796, 82.1381], "samalkot": [17.0569, 82.1722],
  "ramachandrapuram": [16.8355, 81.7718], "amalapuram": [16.5775, 82.0100],
  "bank colony": [16.9845, 82.2465], "fishing harbour": [17.0120, 82.2650],
  "collector's colony": [16.9870, 82.2550], "dairy farm": [17.0100, 82.2500],
};

function getCoords(area) {
  if (!area) return [16.9891, 82.2475];
  const key = area.trim().toLowerCase();
  if (KAKINADA_AREAS[key]) return KAKINADA_AREAS[key];
  for (const [k, v] of Object.entries(KAKINADA_AREAS)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return [16.9891, 82.2475];
}

function matchCat(g, cat) {
  if (cat === "All") return true;
  if (cat === "Others") return !knownCats.includes(g.category);
  return g.category === cat;
}
function getCatIcon(label) {
  return (CATEGORIES.find(c => c.label === label) || CATEGORIES[CATEGORIES.length - 1]).icon;
}

// ─── Shared helpers ───────────────────────────────────────────────────────────
const UrgencyTag = ({ priority }) => {
  const c = URGENCY[priority] || URGENCY.Low;
  return <span style={{ fontSize: 10, fontWeight: 700, color: c.color, letterSpacing: "0.04em" }}>{c.label}</span>;
};
const StatusTag = ({ status }) => {
  const c = STATUS[status] || STATUS.Pending;
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, color: c.color, background: c.bg,
      padding: "2px 8px", borderRadius: 4, border: `1px solid ${c.color}30`
    }}>
      {c.label}
    </span>
  );
};

// ─── Pagination Component ─────────────────────────────────────────────────────
function Pagination({ currentPage, totalPages, totalItems, onPageChange }) {
  if (totalPages <= 1) return null;
  const startItem = (currentPage - 1) * PAGE_SIZE + 1;
  const endItem = Math.min(currentPage * PAGE_SIZE, totalItems);

  const getPages = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("...");
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "10px 16px", borderTop: "1px solid #f1f5f9", background: "#fafbff",
      flexWrap: "wrap", gap: 8
    }}>
      <span style={{ fontSize: 11, color: "#64748b", fontWeight: 500 }}>
        Showing <strong style={{ color: "#1e40af" }}>{startItem}–{endItem}</strong> of{" "}
        <strong style={{ color: "#111827" }}>{totalItems}</strong> records
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          style={{
            width: 28, height: 28, borderRadius: 6, border: "1px solid #e2e8f0",
            background: "#fff", cursor: currentPage === 1 ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            opacity: currentPage === 1 ? 0.4 : 1, transition: "all 0.15s"
          }}>
          <ChevronLeft size={13} color="#374151" />
        </button>
        {getPages().map((p, i) =>
          p === "..." ? (
            <span key={`dot-${i}`} style={{ fontSize: 11, color: "#94a3b8", padding: "0 2px" }}>…</span>
          ) : (
            <button key={p} onClick={() => onPageChange(p)}
              style={{
                width: 28, height: 28, borderRadius: 6,
                border: p === currentPage ? "none" : "1px solid #e2e8f0",
                background: p === currentPage ? PRIMARY.gradient : "#fff",
                color: p === currentPage ? "#fff" : "#374151",
                fontSize: 11, fontWeight: p === currentPage ? 700 : 500,
                cursor: "pointer", fontFamily: "inherit",
                boxShadow: p === currentPage ? "0 2px 8px rgba(37,99,235,0.3)" : "none",
                transition: "all 0.15s"
              }}>
              {p}
            </button>
          )
        )}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          style={{
            width: 28, height: 28, borderRadius: 6, border: "1px solid #e2e8f0",
            background: "#fff", cursor: currentPage === totalPages ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            opacity: currentPage === totalPages ? 0.4 : 1, transition: "all 0.15s"
          }}>
          <ChevronRight size={13} color="#374151" />
        </button>
      </div>
    </div>
  );
}

// ─── ConfirmBox ───────────────────────────────────────────────────────────────
function ConfirmBox({ message, onConfirm, onCancel }) {
  return (
    <div style={{
      background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8,
      padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10
    }}>
      <p style={{ margin: 0, fontSize: 12, color: "#374151", lineHeight: 1.6 }}>{message}</p>
      <div style={{ display: "flex", gap: 7, justifyContent: "flex-end" }}>
        <button onClick={onCancel} style={{
          padding: "5px 14px", borderRadius: 6, border: "1px solid #e5e7eb",
          background: "#fff", color: "#6b7280", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit"
        }}>
          Cancel
        </button>
        <button onClick={onConfirm} style={{
          padding: "5px 14px", borderRadius: 6, border: "none",
          background: PRIMARY.gradient, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
          boxShadow: "0 2px 8px rgba(37,99,235,0.3)"
        }}>
          Confirm
        </button>
      </div>
    </div>
  );
}

// ─── VoicePlayer ──────────────────────────────────────────────────────────────
function VoicePlayer({ src }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);
  const progressRef = useRef(null);
  const BARS = Array.from({ length: 30 }, (_, i) => 20 + Math.sin(i * 0.9) * 12 + Math.cos(i * 1.5) * 6);

  useEffect(() => {
    const a = audioRef.current; if (!a) return;
    const onMeta = () => setDuration(a.duration || 0);
    const onTime = () => setProgress(a.duration ? (a.currentTime / a.duration) * 100 : 0);
    const onEnd = () => { setPlaying(false); setProgress(0); };
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("ended", onEnd);
    return () => {
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("ended", onEnd);
    };
  }, []);

  const toggle = () => {
    const a = audioRef.current; if (!a) return;
    playing ? a.pause() : a.play();
    setPlaying(!playing);
  };
  const seek = (e) => {
    if (!progressRef.current) return;
    const r = progressRef.current.getBoundingClientRect();
    const p = (e.clientX - r.left) / r.width;
    if (audioRef.current) audioRef.current.currentTime = p * (audioRef.current.duration || 0);
  };
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  const active = Math.floor((progress / 100) * BARS.length);

  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 8, background: "#f8fafc",
      border: "1px solid #e2e8f0", borderRadius: 36, padding: "5px 10px 5px 5px", width: "100%", maxWidth: 280
    }}>
      <audio ref={audioRef} src={src} preload="metadata" />
      <button onClick={toggle} style={{
        width: 30, height: 30, borderRadius: "50%",
        background: PRIMARY.gradient, border: "none", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        boxShadow: "0 2px 8px rgba(37,99,235,0.35)"
      }}>
        {playing ? <Pause size={11} color="#fff" /> : <Play size={11} color="#fff" style={{ marginLeft: 1 }} />}
      </button>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 1.5, height: 18 }}>
          {BARS.map((h, i) => (
            <div key={i} style={{
              width: 2, height: h * 0.6, borderRadius: 1, flexShrink: 0,
              background: i < active ? PRIMARY.blue : "#d1d5db"
            }} />
          ))}
        </div>
        <div ref={progressRef} onClick={seek}
          style={{ height: 2, background: "#e2e8f0", borderRadius: 1, cursor: "pointer" }}>
          <div style={{
            height: "100%", width: `${progress}%`, background: PRIMARY.blue,
            borderRadius: 1, transition: "width 0.1s"
          }} />
        </div>
      </div>
      <span style={{
        fontSize: 9, fontFamily: "monospace", fontWeight: 700, color: "#94a3b8",
        flexShrink: 0, whiteSpace: "nowrap"
      }}>
        {fmt((progress / 100) * duration)}<span style={{ color: "#d1d5db", margin: "0 1px" }}>/</span>
        {duration ? fmt(duration) : "--:--"}
      </span>
    </div>
  );
}

// ─── Hotspot Alert Card ───────────────────────────────────────────────────────
function HotspotAlertCard({ hotspot }) {
  const rc = RISK_COLORS[hotspot.level] || RISK_COLORS.Medium;
  return (
    <div style={{
      background: rc.bg, border: `1px solid ${rc.border}`,
      borderLeft: `3px solid ${rc.fill}`, borderRadius: 8, padding: "11px 13px",
      display: "flex", alignItems: "flex-start", gap: 10
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: "50%", background: rc.fill,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
      }}>
        <span style={{ fontSize: 14, color: "#fff" }}>⚡</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: rc.fill, textTransform: "capitalize" }}>
            {hotspot.area}
          </span>
          <span style={{
            fontSize: 8, fontWeight: 700, color: rc.fill, background: "#fff",
            border: `1px solid ${rc.border}`, padding: "2px 7px", borderRadius: 3,
            letterSpacing: "0.08em", textTransform: "uppercase"
          }}>
            {rc.label}
          </span>
          {hotspot.category && (
            <span style={{
              fontSize: 8, fontWeight: 600, color: "#64748b", background: "#f1f5f9",
              border: "1px solid #e2e8f0", padding: "2px 7px", borderRadius: 3, textTransform: "capitalize"
            }}>
              {hotspot.category}
            </span>
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6, marginBottom: 8 }}>
          {[
            { label: "Growth", value: `${(hotspot.growthPercent || 0).toFixed(1)}%` },
            { label: "Risk", value: (hotspot.riskScore || 0).toFixed(1) },
            { label: "Conf.", value: `${((hotspot.confidenceScore || 0) * 100).toFixed(0)}%` },
          ].map(m => (
            <div key={m.label} style={{
              background: "#fff", border: `1px solid ${rc.border}`,
              borderRadius: 5, padding: "5px 8px"
            }}>
              <div style={{
                fontSize: 8, fontWeight: 700, color: "#64748b", textTransform: "uppercase",
                letterSpacing: "0.07em", marginBottom: 2
              }}>{m.label}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: rc.fill }}>{m.value}</div>
            </div>
          ))}
        </div>
        <div style={{ height: 3, background: "#e5e7eb", borderRadius: 2, overflow: "hidden" }}>
          <div style={{
            height: "100%", width: `${Math.min(100, hotspot.riskScore || 0)}%`,
            background: rc.fill, borderRadius: 2, transition: "width 0.6s ease"
          }} />
        </div>
      </div>
    </div>
  );
}

// ─── Beautiful Alerts Map ─────────────────────────────────────────────────────
function AlertsMap({ hotspots }) {
  const mapRef = useRef(null);
  const leafletRef = useRef(null);
  const [status, setStatus] = useState("idle");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!hotspots || hotspots.length === 0) { setStatus("idle"); return; }
    let cancelled = false;
    setStatus("loading");

    (async () => {
      if (!window.L) {
        await new Promise(res => {
          const lnk = document.createElement("link");
          lnk.rel = "stylesheet";
          lnk.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
          document.head.appendChild(lnk);
          const scr = document.createElement("script");
          scr.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
          scr.onload = res;
          document.head.appendChild(scr);
        });
      }
      if (cancelled || !mapRef.current) return;

      if (leafletRef.current) { leafletRef.current.remove(); leafletRef.current = null; }

      const L = window.L;
      const map = L.map(mapRef.current, {
        center: [16.9891, 82.2475], zoom: 12,
        zoomControl: false,
        scrollWheelZoom: false,
      });

      // Custom zoom control position
      L.control.zoom({ position: "bottomright" }).addTo(map);

      mapRef.current.addEventListener("wheel", (e) => {
        if (e.ctrlKey) { e.preventDefault(); map.scrollWheelZoom.enable(); }
        else map.scrollWheelZoom.disable();
      }, { passive: false });

      leafletRef.current = map;

      // Light/neutral sleek tile layer
      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        maxZoom: 19,
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OSM</a> © <a href="https://carto.com/">CARTO</a>',
      }).addTo(map);

      // ── Group alerts by area ─────────────────────────────────────────
      const areaGroups = {};
      hotspots.forEach(hs => {
        const key = (hs.area || "Unknown").toLowerCase().trim();
        if (!areaGroups[key]) areaGroups[key] = { area: hs.area, items: [] };
        areaGroups[key].items.push(hs);
      });

      const LEVEL_ORDER = { High: 3, Medium: 2, Low: 1 };
      Object.values(areaGroups).forEach(group => {
        const { area, items } = group;
        // Sort items highest risk first
        items.sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0));
        // The "worst" item drives pin colour/size
        const worst = items.reduce((w, h) => (LEVEL_ORDER[h.level] || 0) > (LEVEL_ORDER[w.level] || 0) ? h : w, items[0]);
        const rc = RISK_COLORS[worst.level] || RISK_COLORS.Medium;
        const coords = getCoords(area);
        const count = items.length;

        // Outer dashed ring
        const maxRadius = ((worst.riskScore || 50) / 100) * 500 + 180;
        L.circle(coords, {
          radius: maxRadius * 1.9,
          color: rc.fill, fillColor: rc.fill,
          fillOpacity: 0.025, weight: 1, dashArray: "6 9", opacity: 0.3,
        }).addTo(map);

        // Main zone fill
        L.circle(coords, {
          radius: maxRadius,
          color: rc.fill, fillColor: rc.fill,
          fillOpacity: 0.10, weight: 1.5, opacity: 0.65,
        }).addTo(map);

        // ── Teardrop pin with alert count badge ────────────────────────
        const pinH = worst.level === "High" ? 44 : worst.level === "Medium" ? 38 : 32;
        const pinW = Math.round(pinH * 0.75);
        const badgeHtml = count > 1
          ? `<div style="position:absolute;top:-5px;right:-7px;width:17px;height:17px;border-radius:50%;background:#1e293b;color:#fff;font-size:9px;font-weight:800;display:flex;align-items:center;justify-content:center;border:2px solid #fff;line-height:1;">${count}</div>`
          : "";
        const pinIcon = L.divIcon({
          className: "",
          html: `<div style="position:relative;display:inline-block;filter:drop-shadow(0 4px 10px ${rc.fill}55);">
            <svg viewBox="0 0 30 40" width="${pinW}" height="${pinH}" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 1C8.373 1 3 6.373 3 13c0 8.627 12 26 12 26S27 21.627 27 13C27 6.373 21.627 1 15 1z"
                fill="${rc.fill}" stroke="white" stroke-width="1.8"/>
              <circle cx="15" cy="13" r="6" fill="white" opacity="0.95"/>
              <circle cx="15" cy="13" r="3.5" fill="${rc.fill}"/>
            </svg>
            ${badgeHtml}
          </div>`,
          iconSize: [pinW + 8, pinH + 5],
          iconAnchor: [(pinW + 8) / 2, pinH + 5],
          popupAnchor: [0, -(pinH + 5)],
        });
        const marker = L.marker(coords, { icon: pinIcon }).addTo(map);

        // ── Floating label card ────────────────────────────────────────
        const areaName = area.replace(/\b\w/g, c => c.toUpperCase());
        const labelIcon = L.divIcon({
          className: "",
          html: `<div style="
            display:flex;flex-direction:column;gap:3px;
            background:white;
            border:1.5px solid ${rc.fill}44;
            border-left:3px solid ${rc.fill};
            border-radius:8px;
            padding:5px 9px;
            box-shadow:0 2px 12px rgba(0,0,0,0.10);
            white-space:nowrap;
            min-width:110px;
            pointer-events:none;
          ">
            <div style="display:flex;align-items:center;gap:5px;">
              <span style="font-size:11px;font-weight:700;color:#0f172a;letter-spacing:-0.01em;">${areaName}</span>
              <span style="font-size:7px;font-weight:800;color:${rc.fill};background:${rc.fill}15;border:1px solid ${rc.fill}33;padding:1px 5px;border-radius:6px;text-transform:uppercase;">${worst.level}</span>
              ${count > 1 ? `<span style="font-size:7px;font-weight:800;color:#64748b;background:#f1f5f9;border:1px solid #e2e8f0;padding:1px 5px;border-radius:6px;">${count} alerts</span>` : ""}
            </div>
            <div style="display:flex;align-items:center;gap:6px;">
              <span style="font-size:10px;font-weight:800;color:${rc.fill};font-family:monospace;">${Math.round(worst.riskScore || 0)}<span style="font-size:7px;font-weight:600;color:#94a3b8;"> /100</span></span>
              ${worst.category ? `<span style="font-size:9px;color:#64748b;text-transform:capitalize;">${worst.category}</span>` : ""}
            </div>
          </div>`,
          iconSize: [1, 1],
          iconAnchor: [-(pinW / 2 + 10), pinH + 5],
        });
        L.marker(coords, { icon: labelIcon, interactive: false }).addTo(map);

        // ── Rich popup — lists ALL alerts for this area ─────────────────
        const alertsHtml = items.map((hs, idx) => {
          const arc = RISK_COLORS[hs.level] || RISK_COLORS.Medium;
          return `
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-left:3px solid ${arc.fill};border-radius:7px;padding:8px 10px;${idx > 0 ? "margin-top:6px;" : ""}">
              <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px;">
                <span style="font-size:9px;font-weight:800;color:${arc.fill};text-transform:uppercase;letter-spacing:.05em;">${hs.level} RISK</span>
                ${hs.category ? `<span style="font-size:9px;color:#64748b;text-transform:capitalize;margin-left:auto;">· ${hs.category}</span>` : ""}
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;">
                <div style="text-align:center;">
                  <div style="font-size:7px;font-weight:700;color:#94a3b8;text-transform:uppercase;margin-bottom:2px;">Risk</div>
                  <div style="font-size:15px;font-weight:900;color:${arc.fill};line-height:1;">${(hs.riskScore || 0).toFixed(1)}</div>
                </div>
                <div style="text-align:center;">
                  <div style="font-size:7px;font-weight:700;color:#94a3b8;text-transform:uppercase;margin-bottom:2px;">Growth</div>
                  <div style="font-size:15px;font-weight:900;color:${arc.fill};line-height:1;">${(hs.growthPercent || 0).toFixed(1)}%</div>
                </div>
                <div style="text-align:center;">
                  <div style="font-size:7px;font-weight:700;color:#94a3b8;text-transform:uppercase;margin-bottom:2px;">Conf.</div>
                  <div style="font-size:15px;font-weight:900;color:${arc.fill};line-height:1;">${((hs.confidenceScore || 0) * 100).toFixed(0)}%</div>
                </div>
              </div>
            </div>`;
        }).join("");

        marker.bindPopup(`
          <div style="font-family:'DM Sans',system-ui,sans-serif;min-width:220px;max-width:260px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid #f1f5f9;">
              <div style="width:34px;height:34px;border-radius:9px;background:${rc.fill}18;border:1.5px solid ${rc.fill}44;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="${rc.fill}"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
              </div>
              <div style="flex:1;min-width:0;">
                <div style="font-size:13px;font-weight:800;color:#0f172a;text-transform:capitalize;line-height:1.2;">${areaName}</div>
                <div style="display:flex;align-items:center;gap:4px;margin-top:3px;">
                  <span style="font-size:8px;font-weight:700;color:${rc.fill};text-transform:uppercase;letter-spacing:.06em;">${rc.label}</span>
                  ${count > 1 ? `<span style="font-size:8px;font-weight:700;color:#64748b;background:#f1f5f9;border:1px solid #e2e8f0;padding:0 5px;border-radius:5px;">${count} alerts</span>` : ""}
                </div>
              </div>
            </div>
            <div style="max-height:260px;overflow-y:auto;padding-right:2px;">
              ${alertsHtml}
            </div>
          </div>`, { maxWidth: 280 });
      });

      if (!cancelled) setStatus("done");
    })();

    return () => { cancelled = true; };
  }, [hotspots]);

  useEffect(() => () => { if (leafletRef.current) { leafletRef.current.remove(); leafletRef.current = null; } }, []);

  const isLoading = status === "loading";

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {isLoading && (
        <div style={{
          position: "absolute", top: 16, right: 16, zIndex: 10000,
          background: "rgba(255,255,255,0.9)", border: "1px solid rgba(226,232,240,0.8)",
          borderRadius: 10, padding: "8px 14px",
          display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "#64748b",
          backdropFilter: "blur(8px)", boxShadow: "0 4px 20px rgba(0,0,0,0.08)"
        }}>
          <Loader2 size={11} color="#3b82f6" style={{ animation: "spin 0.7s linear infinite" }} />
          <span style={{ color: "#334155" }}>Loading map…</span>
        </div>
      )}

      {/* Active zones badge */}
      {status === "done" && (
        <div style={{
          position: "absolute", top: 16, left: 16, zIndex: 10000,
          background: "rgba(255,255,255,0.9)", border: "1px solid rgba(226,232,240,0.8)",
          borderRadius: 10, padding: "8px 14px", fontSize: 11, color: "#334155", fontWeight: 600,
          display: "flex", alignItems: "center", gap: 8, backdropFilter: "blur(8px)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)"
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: "50%", background: "#e11d48",
            boxShadow: "0 0 0 3px rgba(225,29,72,0.3)", display: "inline-block",
            animation: "blink 2s infinite"
          }} />
          <span>{hotspots.length} active zone{hotspots.length !== 1 ? "s" : ""}</span>
        </div>
      )}

      {/* Ctrl+scroll hint */}
      {status === "done" && (
        <div style={{
          position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)", zIndex: 10000,
          background: "rgba(255,255,255,0.85)", borderRadius: 8, padding: "5px 12px", border: "1px solid rgba(226,232,240,0.8)",
          fontSize: 9, color: "#64748b", fontWeight: 600, letterSpacing: "0.05em",
          backdropFilter: "blur(4px)", pointerEvents: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
        }}>
          CTRL + SCROLL TO ZOOM
        </div>
      )}

      {/* Legend - styled for light map */}
      <div style={{
        position: "absolute", bottom: 32, left: 16, zIndex: 10000,
        background: "rgba(255,255,255,0.92)", border: "1px solid rgba(226,232,240,0.8)",
        borderRadius: 12, padding: "12px 14px", backdropFilter: "blur(12px)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.08)"
      }}>
        <div style={{
          fontSize: 8, fontWeight: 800, color: "#64748b", textTransform: "uppercase",
          letterSpacing: "0.12em", marginBottom: 10
        }}>RISK LEVELS</div>
        {[
          ["High", "#e11d48", "HIGH RISK"],
          ["Medium", "#ea580c", "MEDIUM RISK"],
          ["Low", "#16a34a", "LOW RISK"],
        ].map(([label, fill, rLabel]) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
            <div style={{
              width: 10, height: 10, borderRadius: "50%", background: fill,
              boxShadow: `0 0 8px ${fill}88`, flexShrink: 0
            }} />
            <div>
              <div style={{ fontSize: 10, color: "#334155", fontWeight: 700 }}>{label}</div>
              <div style={{ fontSize: 8, color: "#94a3b8", letterSpacing: "0.06em" }}>{rLabel}</div>
            </div>
          </div>
        ))}
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(226,232,240,0.8)" }}>
          <div style={{ fontSize: 8, color: "#94a3b8", lineHeight: 1.5 }}>
            Zone radius ∝ risk score
          </div>
        </div>
      </div>

      {/* Map watermark */}
      <div style={{
        position: "absolute", bottom: 32, right: 70, zIndex: 10000,
        display: "flex", alignItems: "center", gap: 6, pointerEvents: "none"
      }}>
        <div style={{
          background: "rgba(255,255,255,0.85)", borderRadius: 8, padding: "5px 10px",
          border: "1px solid rgba(226,232,240,0.8)", backdropFilter: "blur(8px)", boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
        }}>
          <div style={{
            fontSize: 8, color: "#64748b", fontWeight: 700,
            letterSpacing: "0.1em", textTransform: "uppercase"
          }}>KMC · CivicConnect</div>
        </div>
      </div>

      <div ref={mapRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}

// ─── AI Explain Modal ─────────────────────────────────────────────────────────
function TokenBar({ token, impact, maxImp }) {
  const pct = Math.abs(impact) / maxImp;
  const pos = impact >= 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0" }}>
      <div style={{ width: 80, display: "flex", justifyContent: "flex-end" }}>
        {!pos && (
          <div style={{
            height: 16, width: `${pct * 80}px`, background: "#9ca3af",
            borderRadius: "3px 0 0 3px", display: "flex", alignItems: "center",
            justifyContent: "flex-end", paddingRight: 4, minWidth: 24, maxWidth: 80
          }}>
            <span style={{ fontSize: 8, color: "#fff", fontWeight: 700, whiteSpace: "nowrap" }}>{impact.toFixed(2)}</span>
          </div>
        )}
      </div>
      <div style={{
        background: pos ? "#f1f5f9" : "#f8fafc", border: "1px solid #e2e8f0",
        borderRadius: 4, padding: "1px 8px", minWidth: 68, textAlign: "center", flexShrink: 0
      }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: pos ? "#374151" : "#6b7280", fontFamily: "monospace" }}>{token}</span>
      </div>
      <div style={{ width: 80 }}>
        {pos && (
          <div style={{
            height: 16, width: `${pct * 80}px`,
            background: PRIMARY.gradient,
            borderRadius: "0 3px 3px 0", display: "flex", alignItems: "center",
            paddingLeft: 4, minWidth: 24, maxWidth: 80
          }}>
            <span style={{ fontSize: 8, color: "#fff", fontWeight: 700, whiteSpace: "nowrap" }}>+{impact.toFixed(2)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function ConfBar({ label, value, note }) {
  const pct = Math.round((value || 0) * 100);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontSize: 11, color: "#374151", fontWeight: 600 }}>{label}</span>
        <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
          {note && <span style={{ fontSize: 9, color: "#94a3b8" }}>{note}</span>}
          <span style={{ fontSize: 12, fontWeight: 700, color: "#111827", fontFamily: "monospace" }}>{pct}%</span>
        </div>
      </div>
      <div style={{ height: 4, background: "#f1f5f9", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: PRIMARY.gradient, borderRadius: 2 }} />
      </div>
    </div>
  );
}

function AIExplainModal({ grievance, onClose }) {
  if (!grievance) return null;
  const ex = grievance.explanation || {};
  const category = grievance.category;
  const catConf = grievance.categoryConfidence ?? grievance.category_confidence ?? 0;
  const urgency = grievance.urgency || grievance.priority;
  const urgConf = grievance.urgencyConfidence ?? grievance.urgency_confidence ?? 0;
  const priScore = grievance.priorityScore ?? grievance.priority_score ?? 0;
  const lang = grievance.language || "english";
  const text = grievance.description || "";
  const catTokens = ex.categoryTokens || ex.category_tokens || [];
  const urgTokens = ex.urgencyTokens || ex.urgency_tokens || [];
  const finalReason = ex.finalReason || ex.final_reason || "";
  const categoryDecision = ex.categoryDecision || ex.category_decision || "";
  const urgencyDecision = ex.urgencyDecision || ex.urgency_decision || "";
  const prioritySummary = ex.prioritySummary || ex.priority_summary || "";
  const catMaxImp = Math.max(...catTokens.map(t => Math.abs(t.impact)), 1);
  const urgMaxImp = Math.max(...urgTokens.map(t => Math.abs(t.impact)), 1);

  const SL = ({ children }) => (
    <div style={{
      fontSize: 9, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase",
      letterSpacing: "0.1em", marginBottom: 8
    }}>{children}</div>
  );
  const DecisionBlock = ({ label, text: txt }) => txt ? (
    <div style={{ borderLeft: "2px solid #e2e8f0", paddingLeft: 12 }}>
      <div style={{
        fontSize: 9, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase",
        letterSpacing: "0.08em", marginBottom: 5
      }}>{label}</div>
      <p style={{ fontSize: 12, color: "#374151", lineHeight: 1.7, margin: 0 }}>{txt}</p>
    </div>
  ) : null;

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 150000,
      background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#fff", width: "100%", maxWidth: 640,
        maxHeight: "92vh", display: "flex", flexDirection: "column",
        borderRadius: 14,
        boxShadow: "0 24px 60px rgba(0,0,0,0.2)", border: "1px solid #e5e7eb", overflow: "hidden"
      }}>
        <div style={{
          padding: "16px 20px 14px", borderBottom: "1px solid #f1f5f9",
          position: "sticky", top: 0, background: "#fff", zIndex: 5,
          display: "flex", alignItems: "center", justifyContent: "space-between"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Brain size={15} color={PRIMARY.blue} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>AI Classification Report</div>
              <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 1 }}>
                Language: {lang} · ID: #{grievance._id?.slice(-8).toUpperCase()}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: "50%",
            border: "1px solid #e5e7eb", background: "#f9fafb", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            <X size={13} color="#6b7280" />
          </button>
        </div>

        {/* Scrollable content area */}
        <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px", display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 14px" }}>
            <SL>Analysed Text</SL>
            <p style={{ fontSize: 13, color: "#374151", lineHeight: 1.6, margin: 0, fontStyle: "italic" }}>"{text}"</p>
          </div>

          <div>
            <SL>Confidence Overview</SL>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <ConfBar label={`Category — ${category}`} value={catConf} note={`${catTokens.length} tokens`} />
              <ConfBar label={`Urgency — ${urgency}`} value={urgConf} note={`${urgTokens.length} tokens`} />
              <ConfBar label="Priority Score (composite)" value={priScore} note={priScore > 0.7 ? "high" : priScore > 0.4 ? "medium" : "low"} />
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[
              { k: "Category", v: category },
              { k: "Urgency", v: urgency },
              { k: "Cat. Conf.", v: `${(catConf * 100).toFixed(1)}%` },
              { k: "Urg. Conf.", v: `${(urgConf * 100).toFixed(1)}%` },
              { k: "Priority Score", v: priScore.toFixed(4) },
              { k: "Language", v: lang },
            ].map(m => (
              <div key={m.k} style={{
                background: "#f8fafc", border: "1px solid #e2e8f0",
                borderRadius: 7, padding: "6px 12px", flex: "1 1 auto", minWidth: 80
              }}>
                <div style={{ fontSize: 9, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 2 }}>{m.k}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#111827", fontFamily: "monospace" }}>{m.v}</div>
              </div>
            ))}
          </div>

          {catTokens.length > 0 && (
            <div>
              <SL>Category Token Attribution — "{category}"</SL>
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 9, color: "#9ca3af", fontWeight: 600 }}>← reduces confidence</span>
                  <span style={{ fontSize: 9, color: PRIMARY.blue, fontWeight: 700 }}>boosts confidence →</span>
                </div>
                {catTokens.map((t, i) => <TokenBar key={i} token={t.token} impact={t.impact} maxImp={catMaxImp} />)}
              </div>
            </div>
          )}

          {urgTokens.length > 0 && (
            <div>
              <SL>Urgency Token Attribution — "{urgency}"</SL>
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 9, color: "#9ca3af", fontWeight: 600 }}>← dampens urgency</span>
                  <span style={{ fontSize: 9, color: PRIMARY.blue, fontWeight: 700 }}>raises urgency →</span>
                </div>
                {urgTokens.map((t, i) => <TokenBar key={i} token={t.token} impact={t.impact} maxImp={urgMaxImp} />)}
              </div>
            </div>
          )}

          {(categoryDecision || urgencyDecision || prioritySummary) && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <SL>Model Decisions</SL>
              <DecisionBlock label="Category Decision" text={categoryDecision} />
              <DecisionBlock label="Urgency Decision" text={urgencyDecision} />
              <DecisionBlock label="Priority Summary" text={prioritySummary} />
            </div>
          )}

          {finalReason && (
            <div>
              <SL>Full Reasoning</SL>
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "12px 14px" }}>
                <p style={{ fontSize: 12, color: "#374151", lineHeight: 1.75, margin: 0 }}>{finalReason}</p>
              </div>
            </div>
          )}
        </div>

        {/* Sticky footer — always solid, never transparent */}
        <div style={{
          padding: "11px 20px", borderTop: "1px solid #e5e7eb", background: "#fff",
          display: "flex", justifyContent: "flex-end", flexShrink: 0
        }}>
          <button onClick={onClose} style={{
            padding: "7px 20px", borderRadius: 7, border: "1px solid #e5e7eb",
            background: "#fff", color: "#374151", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit"
          }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── GFAS Components ──────────────────────────────────────────────────────────
function ScoreGauge({ score, size = 90 }) {
  const radius = (size - 12) / 2;
  const circ = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(1, (score || 0) / 100));
  const cfg = SCORE_CONFIG(score || 0);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e5e7eb" strokeWidth={8} />
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
            stroke={cfg.color} strokeWidth={8}
            strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
            strokeLinecap="round" style={{ transition: "stroke-dashoffset 1.2s ease" }} />
        </svg>
        <div style={{
          position: "absolute", inset: 0, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center"
        }}>
          <span style={{ fontSize: size * 0.24, fontWeight: 900, color: "#0f172a", lineHeight: 1 }}>{Math.round(score || 0)}</span>
          <span style={{ fontSize: size * 0.1, fontWeight: 700, color: cfg.color, marginTop: 1 }}>{cfg.band}</span>
        </div>
      </div>
      <span style={{ fontSize: 9, fontWeight: 800, color: cfg.color, letterSpacing: "0.12em" }}>{cfg.label}</span>
    </div>
  );
}

function MetricBar({ groupName, value, baseline, count, isFlagged, color }) {
  const pct = Math.max(0, Math.min(100, value || 0));
  const base = Math.max(0, Math.min(100, baseline || 50));
  const diff = pct - base;
  const absDiff = Math.abs(diff);
  const isPos = diff >= 0;
  const diffColor = absDiff <= 5 ? "#16a34a" : absDiff <= 15 ? "#b45309" : "#b91c1c";

  return (
    <div style={{
      display: "grid", gridTemplateColumns: "minmax(100px,160px) 1fr 72px 60px",
      alignItems: "center", gap: 8, padding: "9px 14px",
      background: isFlagged ? "#fff8f8" : "transparent",
      borderLeft: isFlagged ? "3px solid #e11d48" : "3px solid transparent",
      borderBottom: "1px solid #f1f5f9"
    }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          {isFlagged && <AlertTriangle size={8} color="#e11d48" />}
          <span style={{
            fontSize: 11, fontWeight: isFlagged ? 700 : 600,
            color: isFlagged ? "#991b1b" : "#1e293b",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textTransform: "capitalize"
          }}>
            {groupName}
          </span>
        </div>
        {count != null && (
          <span style={{ fontSize: 9, color: "#94a3b8", fontFamily: "monospace" }}>
            {count} grievance{count !== 1 ? "s" : ""}
          </span>
        )}
      </div>
      <div style={{
        position: "relative", height: 18, background: "#f8fafc",
        borderRadius: 3, border: "1px solid #e5e7eb", overflow: "visible"
      }}>
        <div style={{
          position: "absolute", left: 0, top: 0, height: "100%",
          width: `${pct}%`, minWidth: 2,
          background: isFlagged
            ? "repeating-linear-gradient(45deg,#e11d48,#e11d48 2px,#fca5a5 2px,#fca5a5 6px)"
            : (color || PRIMARY.blue),
          borderRadius: 3, opacity: 0.8
        }} />
        <div style={{
          position: "absolute", left: `${base}%`, top: -3,
          width: 1.5, height: "calc(100% + 6px)", background: "#475569", zIndex: 2
        }} />
        <div style={{
          position: "absolute", left: `${base}%`, top: "100%", marginTop: 1,
          transform: "translateX(-50%)", fontSize: 7, color: "#64748b", fontWeight: 700, whiteSpace: "nowrap"
        }}>avg</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 2 }}>
        {diff > 2 ? <ChevronUp size={9} color={diffColor} /> : diff < -2 ? <ChevronDown size={9} color={diffColor} /> : <Minus size={9} color="#94a3b8" />}
        <span style={{ fontSize: 11, fontWeight: 700, color: diffColor, fontFamily: "monospace" }}>
          {isPos && diff > 0.05 ? "+" : " "}{diff.toFixed(1)}%
        </span>
      </div>
      <span style={{ fontSize: 11, fontWeight: 800, color: "#0f172a", fontFamily: "monospace", textAlign: "right" }}>
        {pct.toFixed(1)}<span style={{ fontSize: 8, fontWeight: 500, color: "#94a3b8" }}>%</span>
      </span>
    </div>
  );
}

function DisparityCard({ label, gap, gapLabel, interpretation }) {
  const gapVal = gap != null ? Number(gap) : null;
  const isHigh = gapVal != null && gapVal > 0.20;
  const isMod = gapVal != null && gapVal > 0.10 && gapVal <= 0.20;
  const color = isHigh ? "#b91c1c" : isMod ? "#b45309" : "#15803d";
  const bg = isHigh ? "rgba(225,29,72,0.05)" : isMod ? "rgba(180,83,9,0.05)" : "rgba(22,163,74,0.05)";
  const border = isHigh ? "rgba(225,29,72,0.2)" : isMod ? "rgba(180,83,9,0.2)" : "rgba(22,163,74,0.2)";
  const status = isHigh ? "HIGH" : isMod ? "MODERATE" : gapVal != null ? "LOW" : "N/A";

  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "11px 13px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</span>
        <span style={{
          fontSize: 8, fontWeight: 800, color, background: "white", border: `1px solid ${border}`,
          padding: "1px 6px", borderRadius: 3, letterSpacing: "0.08em"
        }}>{status}</span>
      </div>
      <div style={{ fontSize: 16, fontWeight: 900, color, fontFamily: "monospace", marginBottom: 4 }}>
        {gapLabel || (gapVal != null ? `${(gapVal * 100).toFixed(1)}%` : "—")}
      </div>
      {interpretation && (
        <p style={{ fontSize: 10, color: "#374151", lineHeight: 1.5, margin: 0 }}>{interpretation}</p>
      )}
    </div>
  );
}

function GFASDimensionPanel({ dim, dimData }) {
  const meta = DIM_META[dim];
  const Icon = meta.icon;
  const score = dimData?.fairnessScore ?? dimData?.fairness_score ?? 0;
  const cfg = SCORE_CONFIG(score);
  const breakdown = dimData?.breakdown ?? [];
  const flagged = dimData?.flagged ?? [];
  const average = dimData?.average ?? 0;
  const disparity = dimData?.disparity_summary ?? dimData?.disparitySummary ?? {};
  const flags = dimData?.fairness_flags ?? [];

  const SL = ({ children }) => (
    <div style={{
      fontSize: 9, fontWeight: 800, color: "#475569", textTransform: "uppercase",
      letterSpacing: "0.12em", marginBottom: 10, borderBottom: "1px solid #e5e7eb", paddingBottom: 6
    }}>
      {children}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{
        background: `linear-gradient(135deg, ${meta.color}ee 0%, ${meta.lightColor}cc 100%)`,
        padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8, background: "rgba(255,255,255,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(255,255,255,0.3)"
          }}>
            <Icon size={16} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>{meta.label} Fairness Analysis</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.75)", marginTop: 2 }}>
              {breakdown.length} group{breakdown.length !== 1 ? "s" : ""} audited · Average urgency rate: {average.toFixed(1)}%
            </div>
          </div>
        </div>
        <div style={{
          background: "rgba(255,255,255,0.15)", borderRadius: 12, padding: "10px 16px",
          border: "1px solid rgba(255,255,255,0.2)", textAlign: "center"
        }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: "#fff", lineHeight: 1 }}>{Math.round(score)}</div>
          <div style={{ fontSize: 9, fontWeight: 800, color: "rgba(255,255,255,0.85)", letterSpacing: "0.1em", marginTop: 2 }}>{cfg.label}</div>
        </div>
      </div>

      {(disparity.statistical_parity_gap != null || disparity.equal_opportunity_tpr_gap != null || disparity.mean_priority_score_gap != null) && (
        <div style={{ padding: "14px 16px", background: "#f8fafc", borderBottom: "1px solid #e5e7eb" }}>
          <SL>Disparity Metrics</SL>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 8 }}>
            <DisparityCard label="Urgency-Rate Gap" gap={disparity.statistical_parity_gap} gapLabel={disparity.statistical_parity_gap_label} interpretation="Fraction of grievances classified high/critical across groups." />
            <DisparityCard label="Detection-Rate Gap" gap={disparity.equal_opportunity_tpr_gap} gapLabel={disparity.equal_opportunity_tpr_gap_label} interpretation="Gap in true positive rate for detecting urgent cases." />
            <DisparityCard label="Priority-Score Gap" gap={disparity.mean_priority_score_gap != null ? disparity.mean_priority_score_gap / 10 : null} gapLabel={disparity.mean_priority_score_gap_label} interpretation="Spread in mean AI priority scores assigned across groups." />
          </div>
        </div>
      )}

      {flagged.length > 0 && (
        <div style={{
          padding: "10px 16px", background: "rgba(225,29,72,0.04)",
          borderBottom: "1px solid rgba(225,29,72,0.2)",
          display: "flex", alignItems: "flex-start", gap: 8
        }}>
          <AlertTriangle size={13} color="#e11d48" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{
              fontSize: 10, fontWeight: 700, color: "#991b1b", textTransform: "uppercase",
              letterSpacing: "0.08em", marginBottom: 3
            }}>Under-Served Groups ({flagged.length})</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {flagged.map((f, i) => (
                <span key={i} style={{
                  background: "rgba(225,29,72,0.08)", border: "1px solid rgba(225,29,72,0.2)",
                  color: "#b91c1c", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, textTransform: "capitalize"
                }}>
                  {typeof f === "string" ? f : f[dim] ?? f.name ?? JSON.stringify(f)}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {flags.length > 0 && (
        <div style={{ padding: "10px 16px", background: "rgba(180,83,9,0.04)", borderBottom: "1px solid rgba(180,83,9,0.2)" }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: "#78350f", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>
            Fairness Flags
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {flags.map((f, i) => {
              const flagObj = typeof f === "object" ? f : { label: f };
              return (
                <div key={i} style={{
                  display: "flex", alignItems: "flex-start", gap: 6,
                  background: "white", border: "1px solid rgba(180,83,9,0.2)", borderRadius: 5, padding: "7px 10px"
                }}>
                  <AlertTriangle size={10} color="#b45309" style={{ flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "#78350f", lineHeight: 1.4 }}>
                      {flagObj.label || (typeof f === "string" ? f : "Disparity detected")}
                    </div>
                    {flagObj.interpretation && (
                      <div style={{ fontSize: 10, color: "#92400e", marginTop: 2, lineHeight: 1.4 }}>{flagObj.interpretation}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <div style={{
          padding: "10px 14px", background: "#f1f5f9", borderBottom: "1px solid #e2e8f0",
          display: "grid", gridTemplateColumns: "minmax(100px,160px) 1fr 72px 60px", gap: 8, alignItems: "center"
        }}>
          {["Group", "Urgency Rate Distribution", "Δ Avg", "Rate"].map((h, i) => (
            <span key={h} style={{
              fontSize: 9, fontWeight: 800, color: "#475569", textTransform: "uppercase",
              letterSpacing: "0.08em", textAlign: i >= 2 ? "right" : "left"
            }}>{h}</span>
          ))}
        </div>
        {breakdown.length === 0 ? (
          <div style={{ padding: "32px 20px", textAlign: "center", color: "#94a3b8", fontSize: 12 }}>
            No group data available.
          </div>
        ) : (
          breakdown.map((item, i) => {
            const groupName = item[dim] ?? item.name ?? item.label ?? `Group ${i + 1}`;
            const isFlagged = flagged.some(f => (typeof f === "string" ? f : f[dim] ?? f.name) === groupName);
            return (
              <MetricBar key={i} groupName={groupName}
                value={item.resolutionRate ?? item.resolution_rate ?? 0}
                baseline={average} count={item.total ?? item.count}
                isFlagged={isFlagged} color={meta.color} />
            );
          })
        )}
      </div>

      <div style={{
        padding: "10px 16px", background: "#f8fafc", borderTop: "1px solid #e5e7eb",
        display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap"
      }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em" }}>Legend:</span>
        <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9, color: "#374151" }}>
          <div style={{ width: 16, height: 3, background: meta.color, borderRadius: 2 }} /> Normal group
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9, color: "#374151" }}>
          <div style={{ width: 16, height: 3, background: "repeating-linear-gradient(45deg,#e11d48,#e11d48 1px,#fca5a5 1px,#fca5a5 4px)", borderRadius: 2 }} />
          Flagged — below avg &gt;10%
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9, color: "#374151" }}>
          <div style={{ width: 1.5, height: 12, background: "#475569" }} /> District average
        </span>
      </div>
    </div>
  );
}

// ─── GFAS Sidebar Widget ──────────────────────────────────────────────────────
function GFASSidebarWidget({ gfasData, gfasLoading, onRun }) {
  const score = gfasData?.overallFairnessScore ?? gfasData?.overall_fairness_score ?? null;
  const cfg = score != null ? SCORE_CONFIG(score) : null;
  const criticals = (gfasData?.alerts ?? []).filter(a => a.severity === "critical").length;

  return (
    <div onClick={onRun} style={{
      border: "1px solid #e2e8f0",
      borderTop: "3px solid transparent",
      backgroundImage: `linear-gradient(#fff, #fff), ${PRIMARY.gradient}`,
      backgroundOrigin: "border-box", backgroundClip: "padding-box, border-box",
      borderRadius: 8, background: "#fff", cursor: "pointer", overflow: "hidden",
      transition: "box-shadow 0.15s",
      borderTopColor: PRIMARY.blue
    }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 20px rgba(37,99,235,0.15)"}
      onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}>
      <div style={{
        padding: "10px 12px", background: PRIMARY.gradient,
        display: "flex", alignItems: "center", justifyContent: "space-between"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <Scale size={13} color="#fff" />
          <span style={{ fontSize: 11, fontWeight: 800, color: "#fff", letterSpacing: "0.05em" }}>FAIRNESS AUDIT</span>
          <span style={{
            fontSize: 7, fontWeight: 700, color: "rgba(255,255,255,0.6)", letterSpacing: "0.1em",
            border: "1px solid rgba(255,255,255,0.3)", padding: "1px 5px", borderRadius: 2
          }}>GFAS</span>
        </div>
        {gfasLoading && <Loader2 size={10} color="rgba(255,255,255,0.7)" style={{ animation: "spin 0.8s linear infinite" }} />}
      </div>

      <div style={{ padding: "12px" }}>
        {!gfasData && !gfasLoading && (
          <div style={{ textAlign: "center", padding: "10px 0" }}>
            <div style={{ fontSize: 11, color: "#64748b", marginBottom: 10, lineHeight: 1.5 }}>
              Run GFAS to check for systemic disparities across geographic, category, and language dimensions.
            </div>
            <div style={{ display: "flex", gap: 4, justifyContent: "center", flexWrap: "wrap" }}>
              {FAIRNESS_DIMENSIONS.map(dim => {
                const m = DIM_META[dim]; const Icon = m.icon;
                return (
                  <span key={dim} style={{
                    display: "flex", alignItems: "center", gap: 3, fontSize: 9,
                    fontWeight: 600, color: m.color, background: m.bg, border: `1px solid ${m.border}`,
                    padding: "3px 8px", borderRadius: 3, textTransform: "uppercase", letterSpacing: "0.07em"
                  }}>
                    <Icon size={8} />{m.shortLabel}
                  </span>
                );
              })}
            </div>
          </div>
        )}
        {gfasLoading && (
          <div style={{ textAlign: "center", padding: "12px 0", color: "#64748b", fontSize: 11 }}>
            Analysing grievance data…
          </div>
        )}
        {gfasData && !gfasLoading && (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div>
                <div style={{
                  fontSize: 9, fontWeight: 700, color: "#64748b", textTransform: "uppercase",
                  letterSpacing: "0.1em", marginBottom: 3
                }}>Overall Score</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                  <span style={{ fontSize: 30, fontWeight: 900, color: "#0f172a", lineHeight: 1 }}>{Math.round(score)}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: cfg.color, letterSpacing: "0.05em" }}>{cfg.label}</span>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 3, alignItems: "flex-end" }}>
                <span style={{
                  fontSize: 9, fontWeight: 800, color: cfg.color,
                  background: cfg.bg, border: `1px solid ${cfg.border}`,
                  padding: "2px 6px", borderRadius: 3, letterSpacing: "0.1em"
                }}>{cfg.band}</span>
                <div style={{ height: 4, width: 60, background: "#f1f5f9", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${score}%`, background: cfg.color, borderRadius: 2 }} />
                </div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}>
              {FAIRNESS_DIMENSIONS.map(dim => {
                const dScore = (gfasData[dim])?.fairnessScore ?? (gfasData[dim])?.fairness_score ?? 0;
                const m = DIM_META[dim];
                const dCfg = SCORE_CONFIG(dScore);
                return (
                  <div key={dim} style={{
                    display: "grid", gridTemplateColumns: "1fr 50px 28px",
                    alignItems: "center", gap: 6, padding: "5px 8px",
                    background: "#f8fafc", border: "1px solid #f1f5f9", borderRadius: 5
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <m.icon size={9} color={m.color} />
                      <span style={{ fontSize: 9, fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                        {m.shortLabel}
                      </span>
                    </div>
                    <div style={{ height: 3, background: "#e5e7eb", borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${dScore}%`, background: m.color, borderRadius: 2 }} />
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 800, color: dCfg.color, fontFamily: "monospace", textAlign: "right" }}>
                      {Math.round(dScore)}
                    </span>
                  </div>
                );
              })}
            </div>

            {criticals > 0 && (
              <div style={{
                display: "flex", alignItems: "center", gap: 6,
                background: "rgba(225,29,72,0.06)", border: "1px solid rgba(225,29,72,0.2)",
                borderRadius: 5, padding: "6px 9px", marginBottom: 8
              }}>
                <AlertTriangle size={10} color="#e11d48" />
                <span style={{ fontSize: 10, color: "#991b1b", fontWeight: 700 }}>
                  {criticals} critical issue{criticals > 1 ? "s" : ""} detected
                </span>
              </div>
            )}

            <div style={{ fontSize: 9, color: "#94a3b8", textAlign: "center", letterSpacing: "0.05em" }}>
              Click for full audit report →
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── GFAS Modal ───────────────────────────────────────────────────────────────
function GFASModal({ data, loading, error, onClose, onRefresh }) {
  const [tab, setTab] = useState("overview");

  const dimData = { area: data?.area ?? null, category: data?.category ?? null, language: data?.language ?? null };
  const overallScore = data?.overallFairnessScore ?? data?.overall_fairness_score ?? 0;
  const overallCfg = SCORE_CONFIG(overallScore);
  const avgRate = data?.summary?.avgResolutionRate ?? data?.summary?.avg_resolution_rate ?? 0;
  const totalRecs = data?.summary?.totalGrievances ?? 0;
  const dispIdx = data?.summary?.disparityIndex ?? null;
  const flagsRaised = data?.summary?.flagsRaised ?? (data?.alerts ?? []).filter(a => a.severity !== "ok").length;
  const allAlerts = data?.alerts ?? [];
  const criticals = allAlerts.filter(a => a.severity === "critical");
  const generatedAt = data?.generatedAt ? new Date(data.generatedAt) : null;

  const TABS = [
    { key: "overview", label: "Executive Summary" },
    { key: "area", label: "Geographic", dim: "area" },
    { key: "category", label: "Category", dim: "category" },
    { key: "language", label: "Language", dim: "language" },
    { key: "actions", label: "Recommendations" },
  ];

  const SL = ({ children, mt }) => (
    <div style={{
      fontSize: 9, fontWeight: 800, color: "#475569", textTransform: "uppercase",
      letterSpacing: "0.12em", marginBottom: 10, marginTop: mt ?? 0,
      borderBottom: "1px solid #e5e7eb", paddingBottom: 6
    }}>{children}</div>
  );

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 160000,
      background: "rgba(15,23,42,0.65)", backdropFilter: "blur(6px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#fff", width: "100%", maxWidth: 820,
        maxHeight: "95vh", display: "flex", flexDirection: "column",
        borderRadius: 12, boxShadow: "0 40px 100px rgba(0,0,0,0.3)",
        border: "1px solid #cbd5e1", overflow: "hidden"
      }}>

        {/* Header */}
        <div style={{ background: PRIMARY.gradient, flexShrink: 0 }}>
          <div style={{ height: 3, background: "linear-gradient(90deg,rgba(255,255,255,0.3) 0%,rgba(255,255,255,0.1) 50%,rgba(255,255,255,0.3) 100%)" }} />
          <div style={{ padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 42, height: 42, borderRadius: "50%", background: "rgba(255,255,255,0.15)",
                border: "2px solid rgba(255,255,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                <Scale size={18} color="#fff" />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#fff", letterSpacing: "0.02em" }}>
                  GRIEVANCE FAIRNESS AUDIT SYSTEM
                </div>
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", letterSpacing: "0.15em", marginTop: 2 }}>
                  GFAS · KAKINADA MUNICIPAL CORPORATION · CIVIC CONNECT PORTAL
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {generatedAt && (
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 8, color: "rgba(255,255,255,0.5)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Report Generated</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.85)", fontFamily: "monospace", marginTop: 1 }}>
                    {generatedAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    {" "}{generatedAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              )}
              <div style={{ display: "flex", gap: 5 }}>
                <button onClick={onRefresh} disabled={loading} title="Re-run audit"
                  style={{
                    width: 30, height: 30, borderRadius: 5, border: "1px solid rgba(255,255,255,0.25)",
                    background: "rgba(255,255,255,0.1)", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center"
                  }}>
                  <RefreshCw size={12} color="rgba(255,255,255,0.8)"
                    style={{ animation: loading ? "spin 0.8s linear infinite" : "none" }} />
                </button>
                <button onClick={onClose}
                  style={{
                    width: 30, height: 30, borderRadius: 5, border: "1px solid rgba(255,255,255,0.25)",
                    background: "rgba(255,255,255,0.1)", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center"
                  }}>
                  <X size={13} color="rgba(255,255,255,0.8)" />
                </button>
              </div>
            </div>
          </div>

          {(data || loading) && (
            <div style={{ display: "flex", borderTop: "1px solid rgba(255,255,255,0.1)", overflowX: "auto" }}>
              {TABS.map(t => {
                const active = tab === t.key;
                const dimM = t.dim ? DIM_META[t.dim] : null;
                const dimScore = t.dim ? (dimData[t.dim]?.fairnessScore ?? 0) : null;
                return (
                  <button key={t.key} onClick={() => setTab(t.key)} style={{
                    display: "flex", alignItems: "center", gap: 5,
                    padding: "11px 16px",
                    background: active ? "rgba(255,255,255,0.15)" : "transparent",
                    border: "none", borderBottom: `2px solid ${active ? "#fff" : "transparent"}`,
                    color: active ? "#fff" : "rgba(255,255,255,0.5)",
                    fontSize: 11, fontWeight: active ? 700 : 500,
                    cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
                    letterSpacing: "0.02em", transition: "all 0.15s",
                  }}>
                    {dimM && <dimM.icon size={10} color={active ? "#fff" : "rgba(255,255,255,0.4)"} />}
                    {t.label}
                    {dimScore !== null && (
                      <span style={{
                        fontSize: 8, fontWeight: 800, fontFamily: "monospace",
                        padding: "1px 5px", borderRadius: 3, marginLeft: 2,
                        background: active ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.08)",
                        color: active ? "#fff" : "rgba(255,255,255,0.5)"
                      }}>{Math.round(dimScore)}</span>
                    )}
                    {criticals.length > 0 && t.key === "overview" && (
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fca5a5", flexShrink: 0 }} />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ flex: 1, overflowY: "auto", background: "#fff" }}>
          {loading && (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              padding: "80px 0", gap: 20, background: "#f8fafc"
            }}>
              <div style={{ position: "relative", width: 64, height: 64 }}>
                {FAIRNESS_DIMENSIONS.map((d, i) => (
                  <div key={d} style={{
                    position: "absolute", inset: i * 10,
                    border: "2px solid transparent", borderTopColor: DIM_META[d].color,
                    borderRadius: "50%", animation: `spin ${1.0 + i * 0.35}s linear infinite`
                  }} />
                ))}
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Conducting Fairness Audit…</div>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 5 }}>
                  Analysing {FAIRNESS_DIMENSIONS.map(d => DIM_META[d].label).join(" · ")}
                </div>
              </div>
            </div>
          )}

          {!loading && error && (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 16,
              padding: "60px 24px", background: "rgba(225,29,72,0.04)"
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: "50%", background: "rgba(225,29,72,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                <AlertOctagon size={22} color="#e11d48" />
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#7f1d1d" }}>Audit Failed</div>
                <div style={{ fontSize: 12, color: "#991b1b", marginTop: 6, maxWidth: 400, lineHeight: 1.6 }}>{error}</div>
              </div>
              <button onClick={onRefresh} style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "9px 20px", borderRadius: 5, border: "none",
                background: PRIMARY.gradient, color: "#fff", fontSize: 12, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit"
              }}>
                <RefreshCw size={12} /> Retry Audit
              </button>
            </div>
          )}

          {!loading && data && tab === "overview" && (
            <div>
              <div style={{
                background: overallCfg.bg, borderBottom: `1px solid ${overallCfg.border}`,
                padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <ScoreGauge score={overallScore} size={90} />
                  <div>
                    <div style={{
                      fontSize: 11, fontWeight: 700, color: overallCfg.color,
                      textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 4
                    }}>
                      Overall System Verdict
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: "#0f172a", lineHeight: 1.2, marginBottom: 6 }}>
                      {overallScore >= 80 ? "System is operating equitably"
                        : overallScore >= 60 ? "Moderate disparities require attention"
                          : "Significant disparities — action required"}
                    </div>
                    <div style={{ fontSize: 11, color: "#64748b", lineHeight: 1.5 }}>
                      Based on {totalRecs} grievance records across {FAIRNESS_DIMENSIONS.length} audit dimensions.
                      {dispIdx != null && ` Maximum disparity index: ${Number(dispIdx).toFixed(3)}.`}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
                  {[
                    { k: "Records Audited", v: totalRecs },
                    { k: "Avg Urgency Rate", v: `${Number(avgRate).toFixed(1)}%` },
                    { k: "Flags Raised", v: flagsRaised },
                    { k: "Critical Issues", v: criticals.length },
                  ].map(m => (
                    <div key={m.k} style={{
                      background: "white", border: `1px solid ${overallCfg.border}`,
                      borderRadius: 6, padding: "6px 12px", minWidth: 130,
                      display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12
                    }}>
                      <span style={{ fontSize: 9, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em" }}>{m.k}</span>
                      <span style={{ fontSize: 14, fontWeight: 900, color: "#0f172a", fontFamily: "monospace" }}>{m.v}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 18 }}>
                <div>
                  <SL>Dimension-wise Fairness Scores</SL>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 10 }}>
                    {FAIRNESS_DIMENSIONS.map(dim => {
                      const dScore = dimData[dim]?.fairnessScore ?? 0;
                      const dCfg = SCORE_CONFIG(dScore);
                      const dMeta = DIM_META[dim];
                      const DIcon = dMeta.icon;
                      const dFlags = (dimData[dim]?.fairness_flags ?? []).length;
                      const dFlagged = (dimData[dim]?.flagged ?? []).length;
                      return (
                        <div key={dim} onClick={() => setTab(dim)} style={{
                          border: `1px solid ${dMeta.border}`,
                          borderTop: `3px solid ${dMeta.color}`,
                          borderRadius: 8, background: "#fff", cursor: "pointer", overflow: "hidden",
                          transition: "box-shadow 0.15s"
                        }}
                          onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.10)"}
                          onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}>
                          <div style={{ padding: "12px 14px" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <div style={{
                                  width: 26, height: 26, borderRadius: 6, background: dMeta.bg,
                                  border: `1px solid ${dMeta.border}`, display: "flex", alignItems: "center", justifyContent: "center"
                                }}>
                                  <DIcon size={12} color={dMeta.color} />
                                </div>
                                <div>
                                  <div style={{ fontSize: 10, fontWeight: 700, color: "#1e293b", textTransform: "uppercase", letterSpacing: "0.06em" }}>{dMeta.shortLabel}</div>
                                  <div style={{ fontSize: 8, color: "#94a3b8" }}>{dMeta.label}</div>
                                </div>
                              </div>
                              <span style={{
                                fontSize: 7, fontWeight: 800, color: dCfg.color,
                                background: dCfg.bg, border: `1px solid ${dCfg.border}`,
                                padding: "2px 6px", borderRadius: 3, letterSpacing: "0.1em"
                              }}>{dCfg.band}</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "flex-end", gap: 6, marginBottom: 8 }}>
                              <span style={{ fontSize: 32, fontWeight: 900, color: "#0f172a", lineHeight: 1 }}>{Math.round(dScore)}</span>
                              <span style={{ fontSize: 10, fontWeight: 700, color: dCfg.color, marginBottom: 4 }}>{dCfg.label}</span>
                            </div>
                            <div style={{ height: 5, background: "#f1f5f9", borderRadius: 3, overflow: "hidden", marginBottom: 8 }}>
                              <div style={{ height: "100%", width: `${dScore}%`, background: dMeta.color, borderRadius: 3 }} />
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#94a3b8" }}>
                              <span>{dFlags} flag{dFlags !== 1 ? "s" : ""}</span>
                              <span style={{ color: dMeta.color, fontWeight: 700 }}>View →</span>
                            </div>
                          </div>
                          {dFlagged > 0 && (
                            <div style={{
                              padding: "6px 14px", background: dMeta.bg, borderTop: `1px solid ${dMeta.border}`,
                              display: "flex", alignItems: "center", gap: 5
                            }}>
                              <AlertTriangle size={8} color={dMeta.color} />
                              <span style={{ fontSize: 9, fontWeight: 600, color: dMeta.color }}>
                                {dFlagged} under-served group{dFlagged !== 1 ? "s" : ""}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <SL>Detected Disparities & Alerts</SL>
                  {allAlerts.length === 0 ? (
                    <div style={{
                      display: "flex", alignItems: "center", gap: 10,
                      background: "rgba(22,163,74,0.05)", border: "1px solid rgba(22,163,74,0.2)",
                      borderLeft: "4px solid #16a34a", borderRadius: "0 6px 6px 0", padding: "12px 14px"
                    }}>
                      <CheckCircle size={16} color="#15803d" />
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 800, color: "#14532d", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>SYSTEM EQUITABLE</div>
                        <p style={{ fontSize: 12, color: "#166534", margin: 0, lineHeight: 1.5 }}>
                          No significant disparities detected across all three audit dimensions.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {allAlerts.map((a, i) => {
                        const isCrit = a.severity === "critical";
                        const isWarn = a.severity === "warning";
                        const dimM = a.dimension ? DIM_META[a.dimension] : null;
                        const bgC = isCrit ? "rgba(225,29,72,0.05)" : isWarn ? "rgba(180,83,9,0.05)" : "rgba(22,163,74,0.05)";
                        const bdC = isCrit ? "rgba(225,29,72,0.2)" : isWarn ? "rgba(180,83,9,0.2)" : "rgba(22,163,74,0.2)";
                        const txC = isCrit ? "#991b1b" : isWarn ? "#78350f" : "#14532d";
                        const AlIcon = isCrit || isWarn ? AlertTriangle : CheckCircle;
                        return (
                          <div key={i} style={{
                            display: "flex", alignItems: "flex-start", gap: 10,
                            background: bgC, border: `1px solid ${bdC}`,
                            borderLeft: `4px solid ${isCrit ? "#e11d48" : isWarn ? "#b45309" : "#16a34a"}`,
                            borderRadius: "0 6px 6px 0", padding: "10px 12px"
                          }}>
                            <AlIcon size={13} color={txC} style={{ flexShrink: 0, marginTop: 1 }} />
                            <div style={{ flex: 1 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3, flexWrap: "wrap" }}>
                                <span style={{ fontSize: 8, fontWeight: 800, color: txC, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                                  {isCrit ? "CRITICAL" : isWarn ? "WARNING" : "OK"}
                                </span>
                                {dimM && (
                                  <span style={{
                                    fontSize: 8, fontWeight: 700, color: dimM.color,
                                    background: dimM.bg, border: `1px solid ${dimM.border}`,
                                    padding: "1px 6px", borderRadius: 3, textTransform: "uppercase", letterSpacing: "0.08em"
                                  }}>
                                    {dimM.shortLabel}
                                  </span>
                                )}
                              </div>
                              <p style={{ fontSize: 12, color: "#1e293b", lineHeight: 1.55, margin: 0, fontWeight: 500 }}>{a.message}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "14px 16px" }}>
                  <SL>Fairness Score Scale Reference</SL>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 8 }}>
                    {[
                      ["A — EQUITABLE", "80–100", "#15803d", "rgba(22,163,74,0.06)", "rgba(22,163,74,0.2)", "No significant disparity. System appears equitable."],
                      ["B — MODERATE", "60–79", "#b45309", "rgba(180,83,9,0.06)", "rgba(180,83,9,0.2)", "Some disparity. Monitor and review periodically."],
                      ["C — INEQUITABLE", "0–59", "#b91c1c", "rgba(225,29,72,0.06)", "rgba(225,29,72,0.2)", "Significant disparity. Immediate action recommended."],
                    ].map(([label, range, color, bg, border, desc]) => (
                      <div key={label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 7, padding: "10px 12px" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                          <span style={{ fontSize: 10, fontWeight: 800, color }}>{label}</span>
                          <span style={{ fontSize: 11, fontFamily: "monospace", fontWeight: 700, color: "#94a3b8" }}>{range}</span>
                        </div>
                        <p style={{ fontSize: 10, color: "#374151", margin: 0, lineHeight: 1.5 }}>{desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{
                  display: "flex", alignItems: "center", gap: 6, justifyContent: "center",
                  fontSize: 10, color: "#94a3b8", padding: "4px 0"
                }}>
                  <Info size={10} /> Select a dimension tab above for detailed group-level analysis
                </div>
              </div>
            </div>
          )}

          {!loading && data && FAIRNESS_DIMENSIONS.includes(tab) && (
            <GFASDimensionPanel dim={tab} dimData={dimData[tab]} />
          )}

          {!loading && data && tab === "actions" && (
            <div>
              <div style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", padding: "14px 20px" }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a", marginBottom: 2 }}>Recommended Corrective Actions</div>
                <div style={{ fontSize: 11, color: "#64748b" }}>
                  Prioritised by severity. Generated by the GFAS audit engine based on metric thresholds.
                </div>
              </div>
              <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
                {(data.recommendations ?? []).length === 0 ? (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 10,
                    background: "rgba(22,163,74,0.05)", border: "1px solid rgba(22,163,74,0.2)",
                    borderLeft: "4px solid #16a34a", borderRadius: "0 6px 6px 0", padding: "14px 16px"
                  }}>
                    <CheckCircle size={16} color="#15803d" />
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 800, color: "#14532d", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>NO ACTIONS REQUIRED</div>
                      <p style={{ fontSize: 12, color: "#166534", margin: 0, lineHeight: 1.5 }}>
                        System is performing equitably. Continue regular monitoring.
                      </p>
                    </div>
                  </div>
                ) : (
                  (data.recommendations ?? []).map((r, i) => {
                    const dimM = r.dimension ? DIM_META[r.dimension] : null;
                    const isHigh = r.priority === "high";
                    const isMed = r.priority === "medium";
                    const priColor = isHigh ? "#991b1b" : isMed ? "#78350f" : "#14532d";
                    const priBg = isHigh ? "rgba(225,29,72,0.05)" : isMed ? "rgba(180,83,9,0.05)" : "rgba(22,163,74,0.05)";
                    const priBorder = isHigh ? "rgba(225,29,72,0.2)" : isMed ? "rgba(180,83,9,0.2)" : "rgba(22,163,74,0.2)";
                    const priBand = isHigh ? "HIGH" : isMed ? "MEDIUM" : "LOW";
                    return (
                      <div key={i} style={{
                        border: "1px solid #e2e8f0",
                        borderLeft: `4px solid ${dimM?.color ?? PRIMARY.blue}`,
                        borderRadius: "0 8px 8px 0", background: "#fff", overflow: "hidden"
                      }}>
                        <div style={{
                          padding: "11px 14px", background: "#f8fafc", borderBottom: "1px solid #f1f5f9",
                          display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap"
                        }}>
                          <span style={{
                            fontSize: 8, fontWeight: 800, padding: "3px 8px", borderRadius: 3,
                            background: priBg, color: priColor, border: `1px solid ${priBorder}`, letterSpacing: "0.1em"
                          }}>
                            {priBand} PRIORITY
                          </span>
                          {dimM && (
                            <span style={{
                              fontSize: 8, fontWeight: 700, padding: "3px 8px", borderRadius: 3,
                              background: dimM.bg, color: dimM.color, border: `1px solid ${dimM.border}`,
                              textTransform: "uppercase", letterSpacing: "0.08em",
                              display: "flex", alignItems: "center", gap: 4
                            }}>
                              <dimM.icon size={8} />{dimM.shortLabel}
                            </span>
                          )}
                          <span style={{ fontSize: 9, color: "#94a3b8", fontFamily: "monospace", marginLeft: "auto" }}>
                            Action {i + 1} of {(data.recommendations ?? []).length}
                          </span>
                        </div>
                        <div style={{ padding: "12px 14px" }}>
                          <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a", marginBottom: 7, lineHeight: 1.3 }}>
                            {r.title}
                          </div>
                          <p style={{ fontSize: 12, color: "#374151", lineHeight: 1.7, margin: 0 }}>{r.description}</p>
                          {(r.affectedArea || r.affected) && (
                            <div style={{
                              display: "flex", alignItems: "center", gap: 5, marginTop: 10,
                              padding: "5px 9px", background: "#f8fafc", border: "1px solid #e2e8f0",
                              borderRadius: 5, width: "fit-content"
                            }}>
                              <MapPin size={9} color="#64748b" />
                              <span style={{ fontSize: 10, color: "#475569", fontWeight: 600 }}>
                                Affected: {r.affectedArea ?? r.affected}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}

                <div style={{
                  marginTop: 8, padding: "12px 14px", background: "#f8fafc",
                  border: "1px solid #e2e8f0", borderRadius: 7
                }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 5 }}>DISCLAIMER</div>
                  <p style={{ fontSize: 10, color: "#64748b", margin: 0, lineHeight: 1.6 }}>
                    These recommendations are generated automatically by the GFAS audit engine based on statistical analysis. They are indicative and should be reviewed by competent authority before implementation. All disparity thresholds are defined at 20% gap (±0.20) in line with standard fairness audit practice.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={{
          padding: "10px 20px", background: "#f8fafc", borderTop: "1px solid #e2e8f0",
          display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, flexWrap: "wrap", gap: 8
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 9, color: "#94a3b8", fontFamily: "monospace" }}>
              GFAS v2.0 · {totalRecs} records · {FAIRNESS_DIMENSIONS.length} dimensions
            </span>
            {data?.meta?.skipped > 0 && (
              <span style={{ fontSize: 9, color: "#b45309", fontWeight: 600 }}>
                ⚠ {data.meta.skipped} records excluded
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: 7 }}>
            {data && (
              <button onClick={onRefresh} disabled={loading} style={{
                display: "flex", alignItems: "center",
                gap: 5, padding: "6px 14px", borderRadius: 4, border: "1px solid #e2e8f0",
                background: "#fff", color: "#374151", fontSize: 11, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit", opacity: loading ? 0.5 : 1
              }}>
                <RefreshCw size={10} style={{ animation: loading ? "spin 0.8s linear infinite" : "none" }} />
                Re-run Audit
              </button>
            )}
            <button onClick={onClose} style={{
              padding: "6px 18px", borderRadius: 4,
              border: "none", background: PRIMARY.gradient, color: "#fff",
              fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              letterSpacing: "0.04em", boxShadow: "0 2px 8px rgba(37,99,235,0.3)"
            }}>
              CLOSE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN ADMIN DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
export default function AdminDashboard() {
  const router = useRouter();

  // State
  const [adminUser, setAdminUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [grievances, setGrievances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hotspots, setHotspots] = useState([]);
  const [hotspotsLoading, setHotspotsLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeUrgency, setActiveUrgency] = useState("All");
  const [activeStatus, setActiveStatus] = useState("All");
  const [isSmartSort, setIsSmartSort] = useState(false);
  const [selected, setSelected] = useState(null);
  const [resolvingId, setResolvingId] = useState(null);
  const [viewingImage, setViewingImage] = useState(null);
  const [aiExplain, setAiExplain] = useState(null);
  const [gfasOpen, setGfasOpen] = useState(false);
  const [gfasLoading, setGfasLoading] = useState(false);
  const [gfasData, setGfasData] = useState(null);
  const [gfasError, setGfasError] = useState(null);
  const [replyText, setReplyText] = useState("Your issue has been resolved successfully.");
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [confirmSpam, setConfirmSpam] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Auth
  useEffect(() => {
    const token = getAdminToken(), user = getAdminUser();
    if (!token || !user) { router.replace("/admin/login"); return; }
    setAdminUser(user); setAuthReady(true);
  }, [router]);

  // Reset page when filters change
  useEffect(() => { setCurrentPage(1); }, [activeCategory, activeUrgency, activeStatus, isSmartSort]);

  // Data fetching
  const fetchGrievances = useCallback(async () => {
    const token = getAdminToken(); if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/grievances?limit=0`, {
        headers: { Authorization: `Bearer ${token}` }, credentials: "include", cache: "no-store",
      });
      if (res.status === 401) { clearAdminAuth(); router.replace("/admin/login"); return; }
      const data = await res.json();
      if (data.success) setGrievances(data.data);
    } catch (e) { console.error("Grievances fetch error:", e); }
    finally { setLoading(false); }
  }, [router]);

  const fetchHotspots = useCallback(async () => {
    const token = getAdminToken(); if (!token) return;
    setHotspotsLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/hotspot-alerts`, {
        method: "GET", headers: authHeaders(), credentials: "include",
      });
      if (res.status === 401) { clearAdminAuth(); router.replace("/admin/login"); return; }
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) setHotspots(data.data);
    } catch (e) { console.error("Hotspot fetch error:", e); }
    finally { setHotspotsLoading(false); }
  }, [router]);

  const refreshHotspots = useCallback(async () => {
    const token = getAdminToken(); if (!token) return;
    setHotspotsLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/hotspot-alerts`, {
        method: "POST", headers: authHeaders(), credentials: "include",
      });
      if (res.status === 401) { clearAdminAuth(); router.replace("/admin/login"); return; }
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) setHotspots(data.data);
    } catch (e) { console.error("Hotspot refresh error:", e); }
    finally { setHotspotsLoading(false); }
  }, [router]);

  const runFairnessAudit = useCallback(async () => {
    setGfasLoading(true); setGfasError(null); setGfasOpen(true);
    try {
      const res = await fetch(`${API}/api/fairness-audit`, {
        method: "GET", headers: authHeaders(), credentials: "include",
      });
      if (res.status === 401) { clearAdminAuth(); router.replace("/admin/login"); return; }
      if (!res.ok) throw new Error(`Server error: ${res.status} ${res.statusText}`);
      const data = await res.json();
      if (data.success === false) throw new Error(data.message || "Audit failed");
      setGfasData(data.data ?? data);
    } catch (e) {
      setGfasError(e.message || "Failed to run fairness audit. Please try again.");
    } finally { setGfasLoading(false); }
  }, [router]);

  useEffect(() => {
    if (authReady) { fetchGrievances(); fetchHotspots(); }
  }, [authReady, fetchGrievances, fetchHotspots]);

  // Actions
  const handleLogout = async () => {
    try { await fetch(`${API}/api/auth/logout`, { method: "POST", headers: { Authorization: `Bearer ${getAdminToken()}` }, credentials: "include" }); } catch { }
    clearAdminAuth(); router.replace("/admin/login");
  };

  const handleResolve = async () => {
    if (!selected || !replyText.trim()) return;
    const id = selected._id;
    setResolvingId(id); setShowReplyBox(false);
    try {
      const res = await fetch(`${API}/api/grievances/${id}`, {
        method: "PUT", headers: authHeaders(),
        body: JSON.stringify({ status: "Resolved", adminReply: replyText.trim(), estimatedTime: "Completed" }),
      });
      const data = await res.json();
      if (data.success) {
        setGrievances(p => p.map(g => g._id === id ? { ...g, status: "Resolved", adminReply: replyText.trim() } : g));
        setSelected(p => ({ ...p, status: "Resolved", adminReply: replyText.trim() }));
      }
    } catch (e) { console.error(e); }
    finally { setResolvingId(null); }
  };

  const handleSpam = async () => {
    if (!selected) return;
    const id = selected._id; setConfirmSpam(false);
    try {
      const res = await fetch(`${API}/api/grievances/${id}`, {
        method: "PUT", headers: authHeaders(), body: JSON.stringify({ status: "Spam" }),
      });
      if (res.ok) { setGrievances(p => p.map(g => g._id === id ? { ...g, status: "Spam" } : g)); setSelected(null); }
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id) => {
    setConfirmDelete(null);
    try {
      const res = await fetch(`${API}/api/grievances/${id}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${getAdminToken()}` }, credentials: "include",
      });
      if (res.ok) { setGrievances(p => p.filter(g => g._id !== id)); if (selected?._id === id) setSelected(null); }
    } catch (e) { console.error(e); }
  };

  const closeDetail = () => {
    setSelected(null); setShowReplyBox(false); setConfirmSpam(false);
    setReplyText("Your issue has been resolved successfully.");
  };

  // Derived data
  const nonSpam = grievances.filter(g => g.status !== "Spam");
  const spamList = grievances.filter(g => g.status === "Spam");
  const isSpamView = activeStatus === "Spam";
  const catCount = (cat) => nonSpam.filter(g => matchCat(g, cat)).length;
  const cnt = (k, v) => nonSpam.filter(g => g[k] === v).length;
  const resolvedPct = nonSpam.length ? Math.round((cnt("status", "Resolved") / nonSpam.length) * 100) : 0;

  const getFullList = () => {
    if (isSpamView) return spamList;
    let list = nonSpam;
    if (activeCategory !== "All") list = list.filter(g => matchCat(g, activeCategory));
    if (activeUrgency !== "All") {
      const vals = activeUrgency === "Critical" ? ["Immediate", "Critical"] : [activeUrgency];
      list = list.filter(g => vals.includes(g.priority));
    }
    if (activeStatus !== "All" && activeStatus !== "Spam") list = list.filter(g => g.status === activeStatus);
    const w = { Immediate: 4, Critical: 4, High: 3, Medium: 2, Low: 1 };
    return isSmartSort
      ? [...list].sort((a, b) => (b.status === "Resolved" ? -1 : w[b.priority] || 0) - (a.status === "Resolved" ? -1 : w[a.priority] || 0))
      : [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  };

  const fullList = getFullList();
  const totalPages = Math.ceil(fullList.length / PAGE_SIZE);
  const displayList = fullList.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const catBreakdown = CATEGORIES.slice(1).map(cat => ({ ...cat, count: catCount(cat.label) })).sort((a, b) => b.count - a.count);
  const maxCat = catBreakdown[0]?.count || 1;
  const gfasScore = gfasData?.overallFairnessScore ?? gfasData?.overall_fairness_score ?? null;
  const gfasCfg = gfasScore != null ? SCORE_CONFIG(gfasScore) : null;

  if (!authReady) return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#f9fafb", fontFamily: "system-ui", gap: 8, color: "#6b7280", fontSize: 13
    }}>
      <Loader2 size={15} style={{ animation: "spin 0.7s linear infinite" }} /> Verifying session…
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{
      fontFamily: "'DM Sans','Segoe UI',system-ui,sans-serif", background: "#f8fafc",
      minHeight: "100vh", color: "#0f172a"
    }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.35} }
        * { box-sizing: border-box }
        ::-webkit-scrollbar { width:5px; height:5px }
        ::-webkit-scrollbar-track { background:#f1f5f9 }
        ::-webkit-scrollbar-thumb { background:#d1d5db; border-radius:3px }
        ::-webkit-scrollbar-thumb:hover { background:#94a3b8 }
        .leaflet-container { font-family:'DM Sans',system-ui,sans-serif !important }
        .leaflet-control-zoom a { border-color:rgba(0,0,0,0.1) !important; background:rgba(255,255,255,0.9) !important; color:#334155 !important; }
        .leaflet-control-zoom a:hover { background:rgba(241,245,249,0.8) !important; color:#0f172a !important; }
        .leaflet-control-attribution { background:rgba(255,255,255,0.7) !important; color:rgba(0,0,0,0.4) !important; font-size:8px !important; }
        .leaflet-control-attribution a { color:rgba(0,0,0,0.5) !important; }
        .leaflet-popup-content-wrapper { border-radius:12px !important; box-shadow:0 8px 30px rgba(0,0,0,0.12) !important; border:1px solid #e2e8f0 !important; padding:0 !important; }
        .leaflet-popup-content { margin:12px 14px !important; }
        .leaflet-popup-tip-container { display:none !important; }
        @media (max-width:768px) {
          .grid-sidebar { grid-template-columns: 1fr !important }
          .cat-nav-label { display:none }
          .header-actions { gap:4px !important }
        }
        @media (max-width:480px) {
          .header-inner { padding:0 12px !important }
          .dashboard-content { padding:10px 12px 40px !important }
        }
      `}</style>

      {/* ── HEADER ── */}
      <header style={{
        background: PRIMARY.gradient, borderBottom: "none", height: 64,
        padding: "0 28px", display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 50,
        boxShadow: "0 8px 32px rgba(139,92,246,0.25)"
      }}
        className="header-inner">
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9, background: "rgba(255,255,255,0.2)",
            border: "1px solid rgba(255,255,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            <Shield size={16} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", lineHeight: 1 }}>
              Civic<span style={{ color: "rgba(255,255,255,0.7)" }}>Connect</span>
            </div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", letterSpacing: "0.09em", fontWeight: 600, marginTop: 1 }}>
              ADMIN · KMC
            </div>
          </div>
          <div style={{ width: 1, height: 22, background: "rgba(255,255,255,0.2)", margin: "0 6px" }} />
          <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "rgba(255,255,255,0.9)", fontWeight: 700 }}>
            <span style={{
              width: 7, height: 7, borderRadius: "50%", background: "#4ade80",
              animation: "blink 2s infinite", display: "inline-block",
              boxShadow: "0 0 0 3px rgba(74,222,128,0.3)"
            }} />LIVE
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }} className="header-actions">
          {adminUser?.name && (
            <span style={{
              fontSize: 11, fontWeight: 700, color: "#fff", background: "rgba(255,255,255,0.15)",
              border: "1px solid rgba(255,255,255,0.25)", padding: "3px 10px", borderRadius: 16
            }}>
              {adminUser.name}
            </span>
          )}

          {/* GFAS Button */}
          <button onClick={runFairnessAudit} style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "5px 12px", borderRadius: 5,
            border: "1px solid rgba(255,255,255,0.3)",
            background: "rgba(255,255,255,0.15)",
            color: "#fff",
            fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            letterSpacing: "0.04em", transition: "all 0.15s",
            backdropFilter: "blur(4px)"
          }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.25)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.15)"}>
            <Scale size={11} />
            <span style={{ display: "none" }} className="cat-nav-label">FAIRNESS AUDIT</span>
            <span style={{ display: "block" }}>GFAS</span>
            {gfasScore != null && (
              <span style={{
                fontSize: 10, fontFamily: "monospace", fontWeight: 900,
                padding: "1px 6px", borderRadius: 3, background: "rgba(255,255,255,0.2)",
                border: "1px solid rgba(255,255,255,0.3)", color: "#fff"
              }}>
                {Math.round(gfasScore)}
              </span>
            )}
            {gfasLoading && <Loader2 size={10} style={{ animation: "spin 0.7s linear infinite" }} />}
          </button>

          <button onClick={() => setActiveStatus(s => s === "Spam" ? "All" : "Spam")}
            style={{
              display: "flex", alignItems: "center", gap: 4, padding: "5px 10px",
              borderRadius: 7, border: "1px solid rgba(255,255,255,0.25)",
              background: "rgba(255,255,255,0.1)", color: "#fff",
              fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit"
            }}>
            <Ban size={10} />
            <span style={{
              fontFamily: "monospace", fontSize: 10, background: "rgba(225,29,72,0.4)",
              color: "#fff", padding: "1px 5px", borderRadius: 8, fontWeight: 700
            }}>
              {spamList.length}
            </span>
          </button>

          <button onClick={handleLogout} style={{
            display: "flex", alignItems: "center", gap: 4,
            padding: "5px 10px", borderRadius: 7, border: "1px solid rgba(255,255,255,0.25)",
            background: "rgba(255,255,255,0.1)", color: "#fff", fontSize: 11, fontWeight: 600,
            cursor: "pointer", fontFamily: "inherit"
          }}>
            <LogOut size={10} />
          </button>
        </div>
      </header>

      {/* ── CATEGORY NAV ── */}
      <nav style={{
        background: "rgba(255,255,255,0.8)", backdropFilter: "blur(12px)", borderBottom: "1px solid #e2e8f0",
        padding: "0 20px", display: "flex", overflowX: "auto", gap: 8,
        boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)"
      }}>
        {CATEGORIES.map(cat => {
          const Icon = cat.icon; const on = activeCategory === cat.label;
          return (
            <button key={cat.label}
              onClick={() => { setActiveCategory(cat.label); if (activeStatus === "Spam") setActiveStatus("All"); setActiveUrgency("All"); }}
              style={{
                display: "flex", alignItems: "center", gap: 6, padding: "0 14px", height: 50,
                fontSize: 12, fontWeight: on ? 700 : 500,
                color: on ? PRIMARY.blue : "#6b7280",
                background: "none", border: "none",
                borderBottom: `2px solid ${on ? PRIMARY.blue : "transparent"}`,
                cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0, fontFamily: "inherit",
                transition: "all 0.15s"
              }}>
              <Icon size={11} color={on ? PRIMARY.blue : "#9ca3af"} />
              <span className="cat-nav-label">{cat.label}</span>
              <span style={{
                fontSize: 9, padding: "1px 5px", borderRadius: 4,
                background: on ? "rgba(37,99,235,0.08)" : "#f9fafb",
                color: on ? PRIMARY.blue : "#9ca3af",
                border: on ? `1px solid rgba(37,99,235,0.2)` : "1px solid transparent",
                fontFamily: "monospace"
              }}>{catCount(cat.label)}</span>
            </button>
          );
        })}
      </nav>

      {/* ── MAIN CONTENT ── */}
      <div style={{ maxWidth: 1440, margin: "0 auto", padding: "16px 20px 60px" }} className="dashboard-content">

        {/* Spam banner */}
        {isSpamView && (
          <div style={{
            background: "#fff", border: "1px solid rgba(225,29,72,0.2)",
            borderLeft: "3px solid #e11d48", borderRadius: 9, padding: "10px 16px",
            display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap"
          }}>
            <AlertOctagon size={14} color="#e11d48" />
            <div>
              <div style={{ fontWeight: 700, fontSize: 12, color: "#991b1b" }}>
                Spam Folder — {spamList.length} record{spamList.length !== 1 ? "s" : ""}
              </div>
              <div style={{ fontSize: 11, color: "#b91c1c" }}>Hidden from citizens. Permanently delete records here.</div>
            </div>
            <button onClick={() => setActiveStatus("All")} style={{
              marginLeft: "auto", padding: "4px 12px",
              borderRadius: 7, border: "1px solid #e5e7eb", background: "#fff", color: "#6b7280",
              fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit"
            }}>
              ← Back
            </button>
          </div>
        )}

        {/* Filters */}
        {!isSpamView && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            <span style={{
              fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase",
              letterSpacing: "0.1em", display: "flex", alignItems: "center", gap: 3
            }}>
              <Filter size={9} />Urgency
            </span>
            {["All", "Critical", "High", "Medium", "Low"].map(u => (
              <button key={u} onClick={() => setActiveUrgency(u)} style={{
                padding: "3px 12px", borderRadius: 14, fontSize: 11, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
                border: activeUrgency === u ? `1px solid ${PRIMARY.blue}` : "1px solid #e5e7eb",
                background: activeUrgency === u ? "rgba(37,99,235,0.08)" : "#fff",
                color: activeUrgency === u ? PRIMARY.blue : "#6b7280"
              }}>{u}</button>
            ))}
            <div style={{ marginLeft: "auto", display: "flex", gap: 2, background: "#f1f5f9", padding: 2, borderRadius: 7 }}>
              {["All", "Pending", "Resolved"].map(s => (
                <button key={s} onClick={() => setActiveStatus(s)} style={{
                  padding: "3px 13px", borderRadius: 5, fontSize: 11, fontWeight: 600,
                  cursor: "pointer", border: "none", fontFamily: "inherit", transition: "all 0.15s",
                  background: activeStatus === s ? PRIMARY.gradient : "transparent",
                  color: activeStatus === s ? "#fff" : "#6b7280",
                  boxShadow: activeStatus === s ? "0 2px 8px rgba(37,99,235,0.25)" : "none"
                }}>{s}</button>
              ))}
            </div>
          </div>
        )}

        {/* Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 268px", gap: 14, marginBottom: 14, alignItems: "start" }}
          className="grid-sidebar">
          {/* List */}
          <div style={{ background: "#fff", border: "1px solid rgba(226,232,240,0.8)", borderRadius: 16, overflow: "hidden", boxShadow: "0 10px 30px rgba(0,0,0,0.03)" }}>
            <div style={{
              padding: "11px 16px", borderBottom: "1px solid #f1f5f9",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              background: "linear-gradient(135deg, rgba(37,99,235,0.03) 0%, rgba(79,70,229,0.02) 100%)"
            }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#374151", display: "flex", alignItems: "center", gap: 5 }}>
                {isSpamView
                  ? <><Ban size={12} color="#e11d48" />Spam</>
                  : <><LayoutDashboard size={12} color={PRIMARY.blue} />{activeCategory === "All" ? "All Grievances" : activeCategory}</>}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 6, background: "#f9fafb",
                  border: "1px solid #e5e7eb", padding: "3px 10px", borderRadius: 6
                }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: !isSmartSort ? PRIMARY.blue : "#94a3b8" }}>Time</span>
                  <button onClick={() => setIsSmartSort(!isSmartSort)} style={{
                    width: 30, height: 15, borderRadius: 8, border: "none", padding: 1, position: "relative",
                    cursor: "pointer", background: isSmartSort ? PRIMARY.blue : "#d1d5db", transition: "background 0.2s"
                  }}>
                    <div style={{
                      width: 12, height: 12, background: "#fff", borderRadius: "50%",
                      position: "absolute", top: 1.5, left: 2, transition: "transform 0.2s",
                      transform: isSmartSort ? "translateX(13px)" : "none"
                    }} />
                  </button>
                  <span style={{ fontSize: 10, fontWeight: 600, color: isSmartSort ? PRIMARY.blue : "#94a3b8" }}>Priority</span>
                </div>
                <span style={{
                  fontSize: 10, fontFamily: "monospace",
                  background: "rgba(37,99,235,0.08)", border: `1px solid rgba(37,99,235,0.2)`,
                  padding: "2px 7px", borderRadius: 4, color: PRIMARY.blue, fontWeight: 700
                }}>
                  {fullList.length}
                </span>
              </div>
            </div>

            <div>
              {loading ? (
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  padding: 48, color: "#94a3b8", gap: 7, fontSize: 12
                }}>
                  <Loader2 size={14} color={PRIMARY.blue} style={{ animation: "spin 0.7s linear infinite" }} /> Loading…
                </div>
              ) : displayList.length === 0 ? (
                <div style={{ textAlign: "center", padding: "48px 16px", color: "#94a3b8" }}>
                  <FileText size={26} color="#e2e8f0" style={{ margin: "0 auto 10px", display: "block" }} />
                  <div style={{ fontWeight: 600, fontSize: 13, color: "#374151" }}>No records found</div>
                  <div style={{ fontSize: 11, marginTop: 4 }}>{grievances.length === 0 ? "No grievances yet." : "Try adjusting filters."}</div>
                </div>
              ) : displayList.map(g => {
                const Icon = getCatIcon(g.category);
                const hasAI = !!(g.explanation || g.categoryConfidence || g.category_confidence);
                return (
                  <div key={g._id}
                    onClick={() => { setSelected(g); setShowReplyBox(false); setConfirmSpam(false); setReplyText("Your issue has been resolved successfully."); }}
                    style={{
                      display: "grid", gridTemplateColumns: "30px 1fr auto", gap: 10,
                      padding: "11px 16px", borderBottom: "1px solid #f8fafc",
                      cursor: "pointer", alignItems: "start", transition: "background 0.1s"
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = "#f8fbff"; e.currentTarget.style.borderLeft = `2px solid ${PRIMARY.blue}`; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderLeft = "2px solid transparent"; }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: 7,
                      background: "rgba(37,99,235,0.06)", border: "1px solid rgba(37,99,235,0.12)",
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
                    }}>
                      <Icon size={13} color={PRIMARY.blue} />
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{g.category}</span>
                        <UrgencyTag priority={g.priority} />
                        <StatusTag status={g.status} />
                        {g.audioUrl && <span style={{ display: "flex", alignItems: "center", gap: 2, fontSize: 9, color: "#94a3b8" }}><Mic size={8} />Voice</span>}
                        {g.imageUrl && <span style={{ display: "flex", alignItems: "center", gap: 2, fontSize: 9, color: "#94a3b8" }}><ImageIcon size={8} />Photo</span>}
                        {hasAI && (
                          <span style={{
                            display: "flex", alignItems: "center", gap: 2, fontSize: 9, color: PRIMARY.blue,
                            background: "rgba(37,99,235,0.06)", padding: "1px 6px", borderRadius: 4,
                            fontWeight: 600, border: `1px solid rgba(37,99,235,0.2)`
                          }}>
                            <Brain size={7} />AI
                          </span>
                        )}
                      </div>
                      <div style={{
                        fontSize: 12, color: "#64748b", marginBottom: 3, overflow: "hidden",
                        display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical"
                      }}>
                        {g.description}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#94a3b8" }}>
                        <MapPin size={9} />{g.area}
                        {g.citizenName && <><span>·</span>{g.citizenName}</>}
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5 }}>
                      <span style={{ fontSize: 10, color: "#94a3b8", fontFamily: "monospace", whiteSpace: "nowrap" }}>
                        {new Date(g.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {isSpamView && (
                        confirmDelete === g._id ? (
                          <div onClick={e => e.stopPropagation()}>
                            <ConfirmBox message="Permanently delete this record?"
                              onConfirm={() => handleDelete(g._id)}
                              onCancel={() => setConfirmDelete(null)} />
                          </div>
                        ) : (
                          <button onClick={e => { e.stopPropagation(); setConfirmDelete(g._id); }}
                            style={{
                              display: "flex", alignItems: "center", gap: 4, padding: "2px 8px",
                              borderRadius: 5, border: "1px solid rgba(225,29,72,0.3)", background: "#fff",
                              color: "#e11d48", fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "inherit"
                            }}>
                            <Trash2 size={9} />Delete
                          </button>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── PAGINATION ── */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={fullList.length}
              onPageChange={setCurrentPage}
            />
          </div>

          {/* Sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Summary */}
            <div style={{
              background: "#fff", border: "1px solid rgba(226,232,240,0.8)", borderRadius: 16, overflow: "hidden",
              borderTop: `4px solid ${PRIMARY.blue}`, boxShadow: "0 10px 30px rgba(0,0,0,0.03)"
            }}>
              <div style={{
                padding: "10px 14px", borderBottom: "1px solid #f1f5f9",
                fontSize: 12, fontWeight: 700, color: "#374151",
                display: "flex", alignItems: "center", gap: 5,
                background: "linear-gradient(135deg, rgba(37,99,235,0.03) 0%, rgba(79,70,229,0.02) 100%)"
              }}>
                <ShieldCheck size={12} color={PRIMARY.blue} />Summary
              </div>
              {[
                { l: "Total Filed", v: grievances.length, icon: FileText },
                { l: "Active", v: nonSpam.length, icon: Activity },
                { l: "Pending", v: cnt("status", "Pending"), icon: Clock },
                { l: "Resolved", v: cnt("status", "Resolved"), icon: CheckCircle2 },
                { l: "Critical", v: nonSpam.filter(g => g.priority === "Immediate" || g.priority === "Critical").length, icon: Siren },
                { l: "Spam Filtered", v: spamList.length, icon: Ban },
              ].map(s => (
                <div key={s.l} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "8px 14px", borderBottom: "1px solid #f8fafc"
                }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#64748b" }}>
                    <s.icon size={10} color="#94a3b8" />{s.l}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#111827", fontFamily: "monospace" }}>{s.v}</span>
                </div>
              ))}
              <div style={{ padding: "10px 14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 11 }}>
                  <span style={{ color: "#64748b", fontWeight: 600 }}>Resolution Rate</span>
                  <span style={{ fontFamily: "monospace", fontWeight: 700, color: PRIMARY.blue }}>{resolvedPct}%</span>
                </div>
                <div style={{ height: 5, background: "#f1f5f9", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{
                    height: "100%", width: `${resolvedPct}%`, background: PRIMARY.gradient,
                    borderRadius: 3, transition: "width 0.8s",
                    boxShadow: `0 0 8px rgba(37,99,235,0.3)`
                  }} />
                </div>
              </div>
            </div>

            {/* GFAS Widget */}
            <GFASSidebarWidget gfasData={gfasData} gfasLoading={gfasLoading} onRun={runFairnessAudit} />

            {/* Hotspot Alerts */}
            <div style={{
              background: "#fff", border: "1px solid rgba(226,232,240,0.8)",
              borderTop: "4px solid #e11d48", borderRadius: 16, overflow: "hidden", boxShadow: "0 10px 30px rgba(0,0,0,0.03)"
            }}>
              <div style={{
                padding: "10px 14px", borderBottom: "1px solid #f1f5f9",
                fontSize: 12, fontWeight: 700, color: "#374151",
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ fontSize: 13 }}>⚡</span>
                  <span>LIVE ALERTS</span>
                </div>
                <button onClick={refreshHotspots} disabled={hotspotsLoading}
                  style={{
                    width: 24, height: 24, borderRadius: 5, border: "1px solid #e2e8f0",
                    background: "#f8fafc", cursor: "pointer", display: "flex",
                    alignItems: "center", justifyContent: "center", opacity: hotspotsLoading ? 0.5 : 1
                  }}>
                  <RefreshCw size={10} color="#64748b"
                    style={{ animation: hotspotsLoading ? "spin 0.8s linear infinite" : "none" }} />
                </button>
              </div>
              <div style={{
                padding: "10px 14px", display: "flex", flexDirection: "column",
                gap: 8, maxHeight: 280, overflowY: "auto"
              }}>
                {hotspotsLoading ? (
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    gap: 8, padding: "20px 0", color: "#64748b", fontSize: 11
                  }}>
                    <Loader2 size={12} color={PRIMARY.blue} style={{ animation: "spin 0.8s linear infinite" }} /> Loading alerts…
                  </div>
                ) : hotspots.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "20px 0", color: "#94a3b8", fontSize: 11 }}>
                    No active alerts
                  </div>
                ) : (
                  [...hotspots]
                    .sort((a, b) => (RISK_COLORS[a.level]?.priority || 3) - (RISK_COLORS[b.level]?.priority || 3))
                    .map(hs => <HotspotAlertCard key={hs._id || hs.area} hotspot={hs} />)
                )}
              </div>
              {hotspots.length > 0 && (
                <div style={{
                  padding: "8px 14px", borderTop: "1px solid #f1f5f9", background: "#f8fafc",
                  display: "flex", gap: 8, fontSize: 9, color: "#64748b", fontWeight: 600
                }}>
                  <span style={{ color: "#e11d48" }}>● {hotspots.filter(h => h.level === "High").length} High</span>
                  <span style={{ color: "#ea580c" }}>● {hotspots.filter(h => h.level === "Medium").length} Med</span>
                  <span style={{ color: "#16a34a" }}>● {hotspots.filter(h => h.level === "Low").length} Low</span>
                </div>
              )}
            </div>

            {/* Category Breakdown */}
            <div style={{ background: "#fff", border: "1px solid rgba(226,232,240,0.8)", borderRadius: 16, overflow: "hidden", boxShadow: "0 10px 30px rgba(0,0,0,0.03)" }}>
              <div style={{
                padding: "10px 14px", borderBottom: "1px solid #f1f5f9",
                fontSize: 12, fontWeight: 700, color: "#374151",
                display: "flex", alignItems: "center", gap: 5
              }}>
                <BarChart2 size={12} color={PRIMARY.blue} />By Category
              </div>
              <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 7 }}>
                {catBreakdown.filter(c => c.count > 0).length === 0 ? (
                  <div style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", padding: "8px 0" }}>No data</div>
                ) : catBreakdown.filter(c => c.count > 0).map(cat => {
                  const Icon = cat.icon; const pct = (cat.count / maxCat) * 100;
                  return (
                    <div key={cat.label} onClick={() => setActiveCategory(cat.label)}
                      style={{
                        display: "flex", alignItems: "center", gap: 7, cursor: "pointer",
                        padding: "2px 0", borderRadius: 4, transition: "background 0.1s"
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(37,99,235,0.04)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <span style={{
                        display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#64748b",
                        minWidth: 90, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
                      }}>
                        <Icon size={9} color={PRIMARY.blue} />{cat.label}
                      </span>
                      <div style={{ flex: 1, height: 4, background: "#f1f5f9", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: PRIMARY.gradient, borderRadius: 2 }} />
                      </div>
                      <span style={{
                        fontSize: 10, color: PRIMARY.blue, minWidth: 16, textAlign: "right",
                        fontFamily: "monospace", fontWeight: 700
                      }}>
                        {cat.count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ── MAP SECTION ── */}
        <div style={{
          background: "#fff", border: "1px solid rgba(226,232,240,0.8)",
          borderRadius: 16, overflow: "hidden", boxShadow: "0 10px 30px rgba(0,0,0,0.03)"
        }}>
          <div style={{
            padding: "16px 24px", borderBottom: "1px solid rgba(226,232,240,0.8)",
            display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8,
            background: "linear-gradient(135deg, rgba(248,250,252,1) 0%, rgba(241,245,249,0.5) 100%)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 9,
                background: PRIMARY.gradient,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 4px 16px rgba(15,23,42,0.1)"
              }}>
                <AlertTriangle size={15} color="#fff" />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
                  Hotspot Alert Zones · Kakinada District
                </div>
                <div style={{ fontSize: 10, color: "#64748b", marginTop: 1 }}>
                  Real-time risk zones detected by alerts model
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button onClick={refreshHotspots} disabled={hotspotsLoading}
                style={{
                  display: "flex", alignItems: "center", gap: 5, padding: "5px 13px",
                  borderRadius: 6, border: "1px solid rgba(15,23,42,0.1)",
                  background: "#fff", backdropFilter: "blur(4px)",
                  color: "#334155", fontSize: 11, fontWeight: 600, cursor: "pointer",
                  fontFamily: "inherit", opacity: hotspotsLoading ? 0.5 : 1, transition: "all 0.15s",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.02)"
                }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(241,245,249,1)"}
                onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                <RefreshCw size={10} style={{ animation: hotspotsLoading ? "spin 0.8s linear infinite" : "none" }} />
                Refresh
              </button>
              <span style={{
                fontSize: 11, background: "rgba(241,245,249,1)",
                color: "#3b82f6", border: "1px solid rgba(226,232,240,0.8)",
                padding: "4px 12px", borderRadius: 10, fontWeight: 700
              }}>
                ⚡ {hotspots.length} zones
              </span>
            </div>
          </div>
          <div style={{ height: 580, position: "relative" }}>
            {hotspots.length === 0 ? (
              <div style={{
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                height: "100%", color: "#64748b", fontSize: 13, gap: 12
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12, background: "rgba(248,250,252,1)",
                  border: "1px solid rgba(226,232,240,0.8)",
                  display: "flex", alignItems: "center", justifyContent: "center"
                }}>
                  <MapPin size={20} color="#94a3b8" />
                </div>
                <span>No active alert zones. Run refresh to fetch latest alerts.</span>
              </div>
            ) : (
              <AlertsMap hotspots={hotspots} />
            )}
          </div>
        </div>
      </div>

      {/* ── DETAIL MODAL ── */}
      {selected && (
        <div onClick={closeDetail} style={{
          position: "fixed", inset: 0, zIndex: 99999,
          background: "rgba(15,23,42,0.5)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 16
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: "#fff", width: "100%",
            maxWidth: 560, maxHeight: "92vh", overflowY: "auto", borderRadius: 20,
            boxShadow: "0 32px 80px rgba(0,0,0,0.3)", border: "1px solid rgba(226,232,240,0.8)"
          }}>
            {/* Modal Header */}
            <div style={{
              padding: "0 0 0 0", borderBottom: "none",
              position: "sticky", top: 0, background: "#fff", zIndex: 5
            }}>
              {/* Gradient top bar */}
              <div style={{ height: 4, background: PRIMARY.gradient }} />
              <div style={{ padding: "16px 22px 14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 7, flexWrap: "wrap" }}>
                      {(() => {
                        const Icon = getCatIcon(selected.category); return (
                          <div style={{
                            width: 26, height: 26, borderRadius: 7,
                            background: "rgba(37,99,235,0.08)", border: "1px solid rgba(37,99,235,0.2)",
                            display: "flex", alignItems: "center", justifyContent: "center"
                          }}>
                            <Icon size={13} color={PRIMARY.blue} />
                          </div>
                        );
                      })()}
                      <UrgencyTag priority={selected.priority} />
                      <StatusTag status={selected.status} />
                      <span style={{
                        fontSize: 10, color: "#94a3b8", background: "#f1f5f9",
                        padding: "2px 7px", borderRadius: 4, fontFamily: "monospace"
                      }}>
                        #{selected._id.slice(-8).toUpperCase()}
                      </span>
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "#111827", letterSpacing: "-0.02em" }}>
                      {selected.category} Issue
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>
                      Filed by <strong>{selected.citizenName || "Anonymous"}</strong>
                      {selected.userEmail && <> · {selected.userEmail}</>}
                    </div>
                  </div>
                  <button onClick={closeDetail} style={{
                    padding: 7, borderRadius: 7,
                    border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", display: "flex"
                  }}>
                    <X size={14} color="#64748b" />
                  </button>
                </div>
              </div>
              <div style={{ height: 1, background: "linear-gradient(90deg, rgba(37,99,235,0.2), transparent)" }} />
            </div>

            <div style={{ padding: "14px 22px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                <div style={{ background: "rgba(37,99,235,0.04)", border: "1px solid rgba(37,99,235,0.12)", borderRadius: 8, padding: "9px 11px" }}>
                  <div style={{
                    fontSize: 9, fontWeight: 700, color: PRIMARY.blue, textTransform: "uppercase",
                    letterSpacing: "0.08em", marginBottom: 4
                  }}>Location</div>
                  <div style={{ fontSize: 12, color: "#111827", display: "flex", alignItems: "center", gap: 4 }}>
                    <MapPin size={10} color={PRIMARY.blue} />{selected.area}
                  </div>
                </div>
                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "9px 11px" }}>
                  <div style={{
                    fontSize: 9, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase",
                    letterSpacing: "0.08em", marginBottom: 4
                  }}>Submitted</div>
                  <div style={{ fontSize: 11, color: "#111827", fontFamily: "monospace" }}>
                    {new Date(selected.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={{
                  fontSize: 9, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase",
                  letterSpacing: "0.08em", marginBottom: 5
                }}>Description</div>
                <div style={{
                  background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8,
                  padding: "10px 12px", fontSize: 13, color: "#111827", lineHeight: 1.65, whiteSpace: "pre-wrap"
                }}>
                  {selected.description}
                </div>
              </div>

              {/* AI Classification */}
              {(selected.categoryConfidence || selected.category_confidence) && (
                <div style={{
                  background: "rgba(37,99,235,0.04)", border: "1px solid rgba(37,99,235,0.15)",
                  borderRadius: 9, padding: "11px 13px", marginBottom: 12
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Brain size={12} color={PRIMARY.blue} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: PRIMARY.blue }}>AI Classification</span>
                    </div>
                    <button onClick={() => { closeDetail(); setAiExplain(selected); }}
                      style={{
                        display: "flex", alignItems: "center", gap: 3, padding: "4px 10px",
                        borderRadius: 6, border: `1px solid rgba(37,99,235,0.2)`,
                        background: "rgba(37,99,235,0.06)",
                        color: PRIMARY.blue, fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "inherit"
                      }}>
                      <Info size={9} />Full Report <ChevronRight size={9} />
                    </button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                    {[
                      { label: "Category", value: selected.category, sub: `${((selected.categoryConfidence || selected.category_confidence || 0) * 100).toFixed(1)}% conf` },
                      { label: "Urgency", value: selected.urgency || selected.priority, sub: `${((selected.urgencyConfidence || selected.urgency_confidence || 0) * 100).toFixed(1)}% conf` },
                      { label: "Priority", value: (selected.priorityScore || selected.priority_score || 0).toFixed(3), sub: "composite score" },
                    ].map(m => (
                      <div key={m.label} style={{ background: "#fff", border: "1px solid rgba(37,99,235,0.15)", borderRadius: 7, padding: "7px 9px" }}>
                        <div style={{
                          fontSize: 9, color: PRIMARY.blue, fontWeight: 600, marginBottom: 2,
                          textTransform: "uppercase", letterSpacing: "0.06em"
                        }}>{m.label}</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#111827", lineHeight: 1.2 }}>{m.value}</div>
                        <div style={{ fontSize: 9, color: "#9ca3af", marginTop: 2 }}>{m.sub}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Audio */}
              {selected.audioUrl && (() => {
                const src = mediaUrl(selected.audioUrl);
                return src ? (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{
                      fontSize: 9, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase",
                      letterSpacing: "0.08em", marginBottom: 5
                    }}>Voice Note</div>
                    <VoicePlayer src={src} />
                  </div>
                ) : null;
              })()}

              {/* Image */}
              {selected.imageUrl && (() => {
                const src = mediaUrl(selected.imageUrl);
                return src ? (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{
                      fontSize: 9, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase",
                      letterSpacing: "0.08em", marginBottom: 5
                    }}>Photo Evidence</div>
                    <div onClick={() => setViewingImage(src)}
                      style={{ borderRadius: 8, overflow: "hidden", border: "1px solid #e2e8f0", cursor: "zoom-in" }}>
                      <img src={src} alt="Evidence" style={{ width: "100%", maxHeight: 200, objectFit: "cover", display: "block" }} />
                    </div>
                  </div>
                ) : null;
              })()}

              {/* Admin Reply */}
              {selected.adminReply && (
                <div style={{
                  background: "rgba(22,163,74,0.05)", border: "1px solid rgba(22,163,74,0.2)",
                  borderLeft: "3px solid #16a34a", borderRadius: 8, padding: "10px 12px", marginBottom: 12
                }}>
                  <div style={{
                    fontSize: 9, fontWeight: 700, color: "#15803d", textTransform: "uppercase",
                    letterSpacing: "0.08em", marginBottom: 4
                  }}>Official Reply</div>
                  <div style={{ fontSize: 13, color: "#166534" }}>{selected.adminReply}</div>
                </div>
              )}

              {/* Spam confirm */}
              {confirmSpam && (
                <div style={{ marginBottom: 12 }}>
                  <ConfirmBox message="Mark this complaint as spam? It will be hidden from citizens."
                    onConfirm={handleSpam} onCancel={() => setConfirmSpam(false)} />
                </div>
              )}

              {/* Reply box */}
              {showReplyBox && selected.status === "Pending" && (
                <div style={{
                  marginBottom: 12, background: "rgba(37,99,235,0.04)",
                  border: "1px solid rgba(37,99,235,0.15)",
                  borderRadius: 9, padding: "12px 14px"
                }}>
                  <div style={{
                    fontSize: 9, fontWeight: 700, color: PRIMARY.blue, textTransform: "uppercase",
                    letterSpacing: "0.08em", marginBottom: 8
                  }}>Reply to Citizen</div>
                  <textarea value={replyText} onChange={e => setReplyText(e.target.value)} rows={3}
                    style={{
                      width: "100%", borderRadius: 7, border: `1px solid rgba(37,99,235,0.2)`,
                      padding: "9px 11px", fontSize: 13, color: "#111827",
                      fontFamily: "inherit", resize: "vertical", outline: "none",
                      background: "#fff", lineHeight: 1.5
                    }} />
                  <div style={{ display: "flex", gap: 7, marginTop: 8, justifyContent: "flex-end" }}>
                    <button onClick={() => setShowReplyBox(false)} style={{
                      padding: "6px 14px",
                      borderRadius: 7, border: "1px solid #e2e8f0", background: "#fff",
                      color: "#374151", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit"
                    }}>
                      Cancel
                    </button>
                    <button disabled={!replyText.trim() || resolvingId === selected._id} onClick={handleResolve}
                      style={{
                        display: "flex", alignItems: "center", gap: 5, padding: "6px 15px",
                        borderRadius: 7, border: "none", background: PRIMARY.gradient, color: "#fff",
                        fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                        opacity: (!replyText.trim() || resolvingId === selected._id) ? 0.4 : 1,
                        boxShadow: "0 2px 10px rgba(37,99,235,0.35)"
                      }}>
                      {resolvingId === selected._id
                        ? <><Loader2 size={12} style={{ animation: "spin 0.7s linear infinite" }} />Sending…</>
                        : <><Send size={11} />Send &amp; Resolve</>}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: "11px 22px", borderTop: "1px solid #f1f5f9",
              display: "flex", justifyContent: "space-between", alignItems: "center",
              background: "linear-gradient(135deg, rgba(37,99,235,0.03) 0%, rgba(79,70,229,0.02) 100%)",
              position: "sticky", bottom: 0, borderRadius: "0 0 14px 14px"
            }}>
              <div style={{ display: "flex", gap: 6 }}>
                {selected.status !== "Spam" && selected.status !== "Resolved" && !confirmSpam && (
                  <button onClick={() => { setConfirmSpam(true); setShowReplyBox(false); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 5, padding: "6px 12px",
                      borderRadius: 7, border: "1px solid rgba(225,29,72,0.3)", background: "#fff",
                      color: "#e11d48", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit"
                    }}>
                    <Ban size={11} />Mark Spam
                  </button>
                )}
                {(selected.explanation || selected.categoryConfidence || selected.category_confidence) && (
                  <button onClick={() => { closeDetail(); setAiExplain(selected); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 5, padding: "6px 12px",
                      borderRadius: 7, border: `1px solid rgba(37,99,235,0.2)`,
                      background: "rgba(37,99,235,0.05)",
                      color: PRIMARY.blue, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit"
                    }}>
                    <Brain size={11} />AI Report
                  </button>
                )}
              </div>
              <div style={{ display: "flex", gap: 7 }}>
                <button onClick={closeDetail} style={{
                  padding: "6px 14px", borderRadius: 7,
                  border: "1px solid #e2e8f0", background: "#fff", color: "#374151",
                  fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit"
                }}>
                  Close
                </button>
                {selected.status === "Pending" && !showReplyBox && (
                  <button onClick={() => { setShowReplyBox(true); setConfirmSpam(false); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 5, padding: "6px 15px",
                      borderRadius: 7, border: "none", background: PRIMARY.gradient, color: "#fff",
                      fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                      boxShadow: "0 2px 10px rgba(37,99,235,0.35)"
                    }}>
                    <CheckCircle2 size={12} />Mark Resolved
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── AI EXPLAIN MODAL ── */}
      <AIExplainModal grievance={aiExplain} onClose={() => setAiExplain(null)} />

      {/* ── GFAS MODAL ── */}
      {gfasOpen && (
        <GFASModal data={gfasData} loading={gfasLoading} error={gfasError}
          onClose={() => setGfasOpen(false)} onRefresh={runFairnessAudit} />
      )}

      {/* ── IMAGE VIEWER ── */}
      {viewingImage && (
        <div onClick={() => setViewingImage(null)} style={{
          position: "fixed", inset: 0, zIndex: 200000,
          background: "rgba(0,0,0,0.95)", display: "flex", alignItems: "center",
          justifyContent: "center", padding: 16
        }}>
          <button onClick={() => setViewingImage(null)} style={{
            position: "absolute", top: 16, right: 16,
            background: "rgba(255,255,255,0.12)", border: "none", borderRadius: "50%",
            padding: 9, cursor: "pointer", display: "flex"
          }}>
            <X size={16} color="#fff" />
          </button>
          <img src={viewingImage} alt="Full View" onClick={e => e.stopPropagation()}
            style={{
              maxWidth: "100%", maxHeight: "90vh", borderRadius: 10,
              boxShadow: "0 24px 80px rgba(0,0,0,0.6)"
            }} />
        </div>
      )}
    </div>
  );
}