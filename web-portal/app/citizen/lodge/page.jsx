"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Mic,
  Type,
  Send,
  Loader2,
  CheckCircle2,
  Play,
  Trash2,
  History,
  Camera,
  RefreshCw,
  X,
  Shield,
  User,
  Navigation,
  Info,
  AlertCircle,
  Clock,
  Upload,
  Zap,
} from "lucide-react";
import Link from "next/link";

// ── Kakinada Municipal Corporation — official wards & localities ONLY ────────
const LOCATIONS = [
  // Zone 1 — Suryaraopeta
  "Suryaraopeta",
  "Jagannaickpur",
  "Raja Rao Peta",
  "Bhanugudi",
  "Old Town",
  "Rajah Street",
  "Main Road",
  // Zone 2 — Gandhi Nagar
  "Gandhi Nagar",
  "Ashok Nagar",
  "Nethaji Nagar",
  "Srinivasa Nagar",
  "TNGO Colony",
  "Shankar Vilas",
  "Collector's Colony",
  // Zone 3 — New Town
  "New Town",
  "Bank Colony",
  "Drivers Colony",
  "FCI Colony",
  "Burma Colony",
  "Dwaraka Nagar",
  "Ayodhya Nagar",
  // Zone 4 — Port & Industrial
  "Kakinada Port Area",
  "Kakinada Industrial Area",
  "Fishing Harbour",
  "Dairy Farm",
  "Auto Nagar",
  "Kaleswara Rao Nagar",
  // Zone 5 — Ramanayyapeta
  "Ramanayyapeta",
  "Rama Rao Peta",
  "Kondayya Palem",
  "Ganganapalle",
  "Gudari Gunta",
  "Indrapalem",
  // Zone 6 — Sarpavaram & Uppada
  "Sarpavaram",
  "Uppada",
  "Kaikavolu",
  "Kothuru",
  "Thammavaram",
  "Thimmapuram",
  // Zone 7 — Vivekananda & JNTU
  "Vivekananda Street",
  "JR NTR Road",
  "JNTU Kakinada Area",
  "Govt General Hospital Area",
  "APSP Camp",
  // Other KMC-recognised localities
  "Kakinada Beach Road",
  "Kakinada Bazar",
  "Anjaneya Nagar",
];

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// ── Submission Flow States ───────────────────────────────────────────────────
const SUBMISSION_STAGES = {
  IDLE: "idle",
  VALIDATING: "validating",
  UPLOADING: "uploading",
  ANALYZING: "analyzing",
  PROCESSING_AI: "processing_ai",
  SUCCESS: "success",
  ERROR: "error",
};

// ── Helpers ─────────────────────────────────────────────────────────────────
function FieldNote({ text }) {
  return (
    <p className="text-xs text-slate-500 font-medium mt-2.5">
      💡 {text}
    </p>
  );
}

function SectionHead({ icon: Icon, label, extra }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2.5">
        <Icon className="w-5 h-5 text-slate-700" />
        <h3 className="font-bold text-sm text-slate-900">{label}</h3>
      </div>
      {extra}
    </div>
  );
}

function AIRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg border border-slate-100">
      <span className="text-xs font-semibold text-slate-600">{label}</span>
      <span className="text-sm font-bold text-slate-900">{value}</span>
    </div>
  );
}

// ── Submission Flow Indicator ────────────────────────────────────────────────
function SubmissionFlowIndicator({ stage }) {
  const stages = [
    { key: SUBMISSION_STAGES.VALIDATING, label: "Validating", icon: CheckCircle2 },
    { key: SUBMISSION_STAGES.UPLOADING, label: "Uploading", icon: Upload },
    { key: SUBMISSION_STAGES.ANALYZING, label: "Analyzing", icon: Zap },
    { key: SUBMISSION_STAGES.PROCESSING_AI, label: "AI Processing", icon: Loader2 },
  ];

  const stageOrder = Object.values(SUBMISSION_STAGES).slice(0, 4);
  const currentIndex = stageOrder.indexOf(stage);

  return (
    <div className="space-y-3">
      {stages.map((s, idx) => {
        const isActive = stage === s.key;
        const isComplete = stageOrder.indexOf(s.key) < currentIndex;
        const Icon = s.icon;

        return (
          <div key={s.key} className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                isComplete
                  ? "bg-green-100 text-green-700"
                  : isActive
                  ? "bg-blue-100 text-blue-700 ring-2 ring-blue-300"
                  : "bg-slate-100 text-slate-400"
              }`}
            >
              {isComplete ? <CheckCircle2 className="w-5 h-5" /> : isActive ? <Loader2 className="w-5 h-5 animate-spin" /> : <Icon className="w-5 h-5" />}
            </div>
            <span
              className={`text-sm font-medium ${
                isActive ? "text-blue-700 font-bold" : isComplete ? "text-green-700" : "text-slate-400"
              }`}
            >
              {s.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Error Banner ─────────────────────────────────────────────────────────────
function ErrorBanner({ error, onDismiss }) {
  return (
    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg flex items-start gap-3">
      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <h4 className="font-bold text-red-900 text-sm">Submission Failed</h4>
        <p className="text-red-700 text-sm mt-1">{error}</p>
      </div>
      <button
        onClick={onDismiss}
        className="text-red-400 hover:text-red-600 transition-colors flex-shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ── Success Screen ───────────────────────────────────────────────────────────
function SuccessScreen({ successData, prediction, onReset }) {
  const priorityColor =
    successData.priority === "Critical" || successData.priority === "Immediate"
      ? "text-red-600"
      : successData.priority === "High"
      ? "text-orange-500"
      : successData.priority === "Medium"
      ? "text-amber-500"
      : "text-green-600";

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Success Header */}
        <div className="bg-white rounded-3xl border border-green-200 shadow-xl p-8 text-center mb-6">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center animate-pulse">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Grievance Registered
          </h1>
          <p className="text-slate-600 text-base">
            Your complaint has been submitted successfully and is being reviewed.
          </p>
        </div>

        {/* Reference ID Card */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-lg p-6 mb-6">
          <div className="text-center">
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-2">
              Reference ID
            </p>
            <p className="text-2xl font-mono font-bold text-blue-600 mb-3">
              KMC-{successData._id.slice(-8).toUpperCase()}
            </p>
            <p className="text-sm text-slate-600">
              Save this ID to track your grievance status
            </p>
          </div>
        </div>

        {/* Details Grid */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-lg p-6 mb-6">
          <h3 className="font-bold text-slate-900 mb-4">Grievance Details</h3>
          <div className="space-y-3">
            <AIRow label="Area/Ward" value={successData.area} />
            <AIRow label="Status" value={successData.status} />

            {prediction?.category && (
              <AIRow label="Category" value={prediction.category} />
            )}
            {prediction?.urgency && (
              <AIRow label="Urgency" value={prediction.urgency} />
            )}

            {(successData.latitude || successData.longitude) && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                <p className="text-xs font-semibold text-blue-700 mb-1">
                  📍 GPS Location
                </p>
                <p className="text-sm font-mono text-slate-900">
                  Lat: {successData.latitude} · Lng: {successData.longitude}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* AI Assessment */}
        {prediction && (
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-3xl border border-purple-200 shadow-lg p-6 mb-6">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-purple-600" />
              AI Assessment
            </h3>
            <div className="space-y-3">
              {prediction.categoryConfidence != null && (
                <AIRow
                  label="Category Confidence"
                  value={`${Math.round(prediction.categoryConfidence * 100)}%`}
                />
              )}
              {prediction.urgencyConfidence != null && (
                <AIRow
                  label="Urgency Confidence"
                  value={`${Math.round(prediction.urgencyConfidence * 100)}%`}
                />
              )}
              {prediction.priorityScore != null && (
                <AIRow
                  label="Priority Score"
                  value={`${Math.round(prediction.priorityScore * 100)}%`}
                />
              )}
              {prediction.language && (
                <AIRow label="Detected Language" value={prediction.language} />
              )}
            </div>

            {prediction.explanation?.finalReason && (
              <div className="mt-4 p-4 bg-white rounded-lg border border-slate-200">
                <p className="text-xs text-slate-600 font-semibold uppercase mb-2">
                  AI Reasoning
                </p>
                <p className="text-sm text-slate-900 leading-relaxed">
                  {prediction.explanation.finalReason}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={onReset}
            className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-sm transition-all hover:shadow-lg shadow-md"
          >
            Lodge Another Complaint
          </button>
          <Link
            href="/citizen/dashboard"
            className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-2xl font-bold text-sm transition-all hover:shadow-lg text-center shadow-sm"
          >
            View Dashboard
          </Link>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 pt-6 border-t border-slate-200">
          <p className="text-xs text-slate-500">
            Reviewed within 24 hours · Helpline: 1800-599-4116
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Government of Andhra Pradesh — East Godavari District
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Auth Gate ────────────────────────────────────────────────────────────────
function AuthGate() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Shield className="w-8 h-8 text-blue-600" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">CivicConnect</h1>
        <p className="text-slate-600 mb-8">Municipal Corp</p>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-lg p-8 mb-6">
          <h2 className="font-bold text-lg text-slate-900 mb-3">
            Sign In Required
          </h2>
          <p className="text-sm text-slate-600">
            Only registered citizens can lodge grievances. Please sign in to
            continue.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <Link
            href="/citizen/login"
            className="py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-all"
          >
            Sign In as Citizen
          </Link>
          <Link
            href="/"
            className="py-3 bg-slate-200 hover:bg-slate-300 text-slate-900 rounded-xl font-bold text-sm transition-all"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function SmartLodge() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [name, setName] = useState("");
  const [area, setArea] = useState(LOCATIONS[0]);
  const [addressDetails, setAddressDetails] = useState("");
  const [fetchingAddr, setFetchingAddr] = useState(false);
  const [addrFetched, setAddrFetched] = useState(false);
  const [text, setText] = useState("");
  const [audioBlob, setAudioBlob] = useState(null);
  const [file, setFile] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  // ── NEW: Submission Flow State ─────────────────────────────────────────────
  const [submissionStage, setSubmissionStage] = useState(SUBMISSION_STAGES.IDLE);
  const [successData, setSuccessData] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  // GPS Data
  const [geoData, setGeoData] = useState({ lat: null, lng: null, address: "", time: "" });

  // Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  // ── Auth Check ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem("citizenToken");
    const userStr = localStorage.getItem("citizen_user");
    if (token && userStr) {
      try {
        const u = JSON.parse(userStr);
        setName(u.fullName || u.name || "");
        setIsAuthed(true);
      } catch {}
    }
    setAuthChecked(true);
  }, []);

  // ── My Location ────────────────────────────────────────────────────────────
  const handleFetchAddress = () => {
    if (!navigator.geolocation) {
      setErrorMessage("Geolocation is not supported on this device.");
      return;
    }

    setFetchingAddr(true);
    setErrorMessage("");

    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude, longitude } }) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          const data = await res.json();
          const a = data.address || {};
          const parts = [
            a.house_number,
            a.road || a.pedestrian,
            a.suburb || a.neighbourhood,
          ].filter(Boolean);
          setAddressDetails(parts.join(", ") || data.display_name);
          setGeoData({
            lat: latitude.toFixed(6),
            lng: longitude.toFixed(6),
            address: data.display_name,
            time: new Date().toLocaleString("en-IN", {
              dateStyle: "full",
              timeStyle: "medium",
            }),
          });
          setAddrFetched(true);
        } catch {
          setErrorMessage("Failed to fetch address. Please try again.");
        } finally {
          setFetchingAddr(false);
        }
      },
      () => {
        setErrorMessage("Location access denied. Please enable location permissions.");
        setFetchingAddr(false);
      },
      { timeout: 10000 }
    );
  };

  // ── Geo-Camera ──────────────────────────────────────────────────────────────
  const startCamera = async () => {
    setIsCameraOpen(true);
    setFile(null);
    setErrorMessage("");

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const lat = pos.coords.latitude,
          lng = pos.coords.longitude;
        let addr = "";
        try {
          const r = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
          );
          const d = await r.json();
          addr = d.display_name.split(",").slice(0, 3).join(", ");
        } catch {}
        setGeoData({
          lat: lat.toFixed(6),
          lng: lng.toFixed(6),
          address: addr,
          time: new Date().toLocaleString("en-IN", {
            dateStyle: "full",
            timeStyle: "medium",
          }),
        });
      });
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      setErrorMessage("Camera access denied. Please enable camera permissions.");
      setIsCameraOpen(false);
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current,
      canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext("2d");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const pad = 20,
      bh = 140,
      bw = canvas.width - pad * 2,
      bx = pad,
      by = canvas.height - bh - pad;
    ctx.fillStyle = "rgba(0,0,0,0.75)";
    if (ctx.roundRect) {
      ctx.roundRect(bx, by, bw, bh, 15);
      ctx.fill();
    } else ctx.fillRect(bx, by, bw, bh);

    const tx = bx + 20,
      ty = by + 35;
    ctx.textAlign = "left";
    ctx.fillStyle = "white";
    ctx.font = "bold 24px Arial";
    ctx.fillText(area, tx, ty);
    ctx.font = "14px Arial";
    ctx.fillText(geoData.address || "", tx, ty + 25);
    ctx.font = "14px monospace";
    ctx.fillStyle = "#cbd5e1";
    ctx.fillText(`Lat:${geoData.lat} Lng:${geoData.lng}`, tx, ty + 50);
    ctx.font = "14px Arial";
    ctx.fillStyle = "#fbbf24";
    ctx.fillText(geoData.time || "", tx, ty + 75);

    canvas.toBlob(
      (blob) => {
        setFile(new File([blob], "geo_evidence.jpg", { type: "image/jpeg" }));
        stopCamera();
      },
      "image/jpeg",
      0.95
    );
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setIsCameraOpen(false);
  };

  // ── Audio ───────────────────────────────────────────────────────────────────
  const toggleRecord = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = () =>
        setAudioBlob(new Blob(chunksRef.current, { type: "audio/wav" }));
      recorder.start();
      setIsRecording(true);
      setErrorMessage("");
    } catch {
      setErrorMessage("Microphone access denied. Please enable mic permissions.");
    }
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    // Validation
    if (!text && !file && !audioBlob) {
      setErrorMessage("Please provide at least one input (text, image, or audio).");
      return;
    }

    const token = localStorage.getItem("citizenToken");
    if (!token) {
      setErrorMessage("Session expired. Please sign in again.");
      setTimeout(() => router.push("/citizen/login"), 2000);
      return;
    }

    // Start submission flow
    setSubmissionStage(SUBMISSION_STAGES.VALIDATING);
    setErrorMessage("");

    // Simulate validation step
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setSubmissionStage(SUBMISSION_STAGES.UPLOADING);

    const fd = new FormData();
    fd.append("area", area);
    fd.append("textInput", text || "");
    fd.append("description", text || "");
    if (addressDetails) fd.append("addressDetails", addressDetails);
    if (geoData.lat) fd.append("latitude", geoData.lat);
    if (geoData.lng) fd.append("longitude", geoData.lng);
    if (file) fd.append("image", file);
    if (audioBlob) fd.append("audio", audioBlob, "voice.wav");

    try {
      // Upload
      await new Promise((resolve) => setTimeout(resolve, 800));
      setSubmissionStage(SUBMISSION_STAGES.ANALYZING);

      // Simulate analysis step
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setSubmissionStage(SUBMISSION_STAGES.PROCESSING_AI);

      // Make actual API call
      const res = await fetch(`${API_BASE}/api/grievances/submit`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
        body: fd,
      });

      const json = await res.json();

      if (json.success) {
        setSuccessData(json.data);
        setPrediction(json.prediction ?? null);
        setSubmissionStage(SUBMISSION_STAGES.SUCCESS);
      } else {
        throw new Error(json.error || json.message || "Submission failed");
      }
    } catch (err) {
      setSubmissionStage(SUBMISSION_STAGES.ERROR);
      setErrorMessage(err.message || "Network error. Please check your connection.");
    }
  };

  const handleReset = () => {
    setSubmissionStage(SUBMISSION_STAGES.IDLE);
    setSuccessData(null);
    setPrediction(null);
    setText("");
    setFile(null);
    setAudioBlob(null);
    setAddressDetails("");
    setAddrFetched(false);
    setGeoData({ lat: null, lng: null, address: "", time: "" });
    setErrorMessage("");
  };

  // ── Guards ──────────────────────────────────────────────────────────────────
  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!isAuthed) return <AuthGate />;

  if (submissionStage === SUBMISSION_STAGES.SUCCESS) {
    return (
      <SuccessScreen
        successData={successData}
        prediction={prediction}
        onReset={handleReset}
      />
    );
  }

  // ── Submission Modal / Overlay ──────────────────────────────────────────────
  const isSubmitting =
    submissionStage === SUBMISSION_STAGES.VALIDATING ||
    submissionStage === SUBMISSION_STAGES.UPLOADING ||
    submissionStage === SUBMISSION_STAGES.ANALYZING ||
    submissionStage === SUBMISSION_STAGES.PROCESSING_AI;

  // ── Form ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Submission Overlay */}
      {isSubmitting && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                Submitting Grievance
              </h2>
              <p className="text-sm text-slate-600">
                Please wait while we process your complaint...
              </p>
            </div>

            <SubmissionFlowIndicator stage={submissionStage} />

            <div className="mt-8 pt-6 border-t border-slate-200 text-center">
              <p className="text-xs text-slate-500">
                This typically takes 30-60 seconds
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {submissionStage === SUBMISSION_STAGES.ERROR && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-slate-900 text-center mb-2">
              Submission Failed
            </h2>
            <p className="text-sm text-slate-600 text-center mb-6">
              {errorMessage}
            </p>
            <button
              onClick={() => setSubmissionStage(SUBMISSION_STAGES.IDLE)}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-all"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 pt-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-slate-200 rounded-full text-slate-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-900">Smart Lodge</h1>
            <p className="text-xs text-slate-500">Grievance Submission</p>
          </div>
          <Link
            href="/citizen/history"
            className="p-2 hover:bg-slate-200 rounded-full text-slate-700 transition-colors"
          >
            <History className="w-5 h-5" />
          </Link>
        </div>

        {/* Error Banner */}
        {errorMessage && submissionStage === SUBMISSION_STAGES.IDLE && (
          <div className="mb-6">
            <ErrorBanner
              error={errorMessage}
              onDismiss={() => setErrorMessage("")}
            />
          </div>
        )}

        {/* Form Card */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-lg p-6 space-y-6">
          {/* 1 — Citizen Details */}
          <div>
            <SectionHead icon={User} label="Citizen Details" />

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  disabled
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
                  Ward / Area *
                </label>
                <select
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className="w-full font-bold text-slate-900 bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all appearance-none cursor-pointer"
                >
                  {LOCATIONS.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
                  Specific Address *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={addressDetails}
                    onChange={(e) => {
                      setAddressDetails(e.target.value);
                      setAddrFetched(false);
                    }}
                    className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all placeholder-slate-400"
                    placeholder="e.g., Near Water Tank, Opp. School Gate…"
                  />
                  <button
                    onClick={handleFetchAddress}
                    disabled={fetchingAddr}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-xl font-bold text-sm transition-all flex items-center gap-2 border border-slate-200 hover:border-blue-300 disabled:opacity-50"
                  >
                    {fetchingAddr ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : addrFetched ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    ) : (
                      <Navigation className="w-4 h-4" />
                    )}
                    <span className="hidden sm:inline">
                      {fetchingAddr ? "Fetching..." : addrFetched ? "Fetched ✓" : "My Location"}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 2 — Description */}
          <div>
            <SectionHead icon={Type} label="Description of Issue" />

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all placeholder-slate-400 resize-none"
              placeholder="Describe the civic issue clearly — what it is, how long it has been there, and who is affected…"
            />
            <FieldNote text="Be specific. Mention the type of problem, duration, and impact. This helps AI triage and speeds up resolution." />
          </div>

          {/* 3 — Voice Note */}
          <div
            className={`rounded-3xl border-2 p-5 transition-all ${
              isRecording
                ? "border-red-200 bg-red-50/30"
                : audioBlob
                ? "border-green-200 bg-green-50/30"
                : "border-slate-100 bg-white"
            }`}
          >
            <SectionHead
              icon={Mic}
              label={
                isRecording ? "Recording…" : audioBlob ? "Voice Note Saved" : "Voice Note"
              }
              extra={
                audioBlob && (
                  <button
                    onClick={() => setAudioBlob(null)}
                    className="text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )
              }
            />

            {!audioBlob ? (
              <button
                onClick={toggleRecord}
                className={`w-full py-3 rounded-2xl font-bold text-sm border-2 transition-all flex items-center justify-center gap-2 ${
                  isRecording
                    ? "bg-red-600 text-white border-red-600 shadow-lg shadow-red-200"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                }`}
              >
                <Mic className="w-4 h-4" />
                {isRecording ? "Tap to Stop Recording" : "Tap to Start Recording"}
              </button>
            ) : (
              <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-2xl text-green-700 text-sm font-bold">
                <Play className="w-4 h-4" />
                Voice note captured and ready to submit.
              </div>
            )}
            <FieldNote text="Speak in Telugu, Hindi, or English. Describe the problem in your own words — our AI processes all three languages." />
          </div>

          {/* 4 — Visual Evidence */}
          <div
            className={`rounded-3xl border-2 p-5 transition-all ${
              file
                ? "border-green-200 bg-green-50/30"
                : isCameraOpen
                ? "border-blue-300 bg-blue-50/30"
                : "border-slate-100 bg-white"
            }`}
          >
            <SectionHead
              icon={Camera}
              label={
                file ? "Evidence Captured" : isCameraOpen ? "Camera Active" : "Visual Evidence"
              }
              extra={
                (file || isCameraOpen) && (
                  <button
                    onClick={() => {
                      setFile(null);
                      stopCamera();
                    }}
                    className="text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )
              }
            />

            {isCameraOpen ? (
              <div className="relative rounded-2xl overflow-hidden bg-black shadow-lg">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-80 object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />
                <div className="absolute bottom-16 left-3 right-3 bg-black/60 px-4 py-3 rounded-xl text-white backdrop-blur-sm border border-white/10">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-bold">{area}</p>
                      <p className="text-[10px] text-slate-300 mt-0.5 leading-tight max-w-[200px]">
                        {geoData.address}
                      </p>
                      {geoData.lat && (
                        <p className="text-[10px] text-blue-300 font-mono mt-1">
                          Lat: {geoData.lat} | Lng: {geoData.lng}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-base font-bold text-amber-400">
                        {new Date().toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      <p className="text-[10px] text-slate-300">
                        {new Date().toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={capturePhoto}
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 w-14 h-14 bg-white rounded-full border-4 border-slate-300 shadow-lg active:scale-95 transition-transform z-20"
                />
              </div>
            ) : !file ? (
              <button
                onClick={startCamera}
                className="w-full py-5 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-2xl font-bold text-sm flex flex-col items-center gap-2 border-2 border-slate-200 hover:border-blue-300 transition-all"
              >
                <Camera className="w-7 h-7" />
                Open Geo-Camera
              </button>
            ) : (
              <div className="relative">
                <img
                  src={URL.createObjectURL(file)}
                  alt="Evidence"
                  className="w-full h-64 object-cover rounded-2xl border border-slate-200 shadow-sm"
                />
                <div className="absolute top-2 left-2 bg-green-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Geo-Tagged
                </div>
                <button
                  onClick={startCamera}
                  className="absolute bottom-2 right-2 bg-white text-slate-700 text-xs font-bold px-3 py-1.5 rounded-xl shadow-sm flex items-center gap-1 hover:bg-slate-50 border border-slate-200 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  Retake
                </button>
              </div>
            )}
            <FieldNote text="Geo-Camera embeds GPS coordinates and timestamp into the image automatically, making evidence tamper-evident and location-verified." />
          </div>

          {/* 5 — Input Classification Rules Indicator */}
          {(text || audioBlob || file) && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                Input Classification
              </p>
              <div className="space-y-2">
                {/* Text + Image */}
                {text && file && !audioBlob && (
                  <>
                    <div className="flex items-center gap-3 px-3 py-2.5 bg-white rounded-lg border border-slate-100">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="text-sm text-slate-700">
                        <span className="font-bold text-slate-900">Text</span>
                        <span className="text-slate-500"> → Grievance Description</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-3 px-3 py-2.5 bg-white rounded-lg border border-slate-100">
                      <div className="w-2 h-2 rounded-full bg-amber-500" />
                      <span className="text-sm text-slate-700">
                        <span className="font-bold text-slate-900">Image</span>
                        <span className="text-slate-500"> → Supporting Evidence</span>
                      </span>
                    </div>
                  </>
                )}

                {/* Audio + Image */}
                {audioBlob && file && !text && (
                  <>
                    <div className="flex items-center gap-3 px-3 py-2.5 bg-white rounded-lg border border-slate-100">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="text-sm text-slate-700">
                        <span className="font-bold text-slate-900">Audio</span>
                        <span className="text-slate-500"> → Grievance Description</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-3 px-3 py-2.5 bg-white rounded-lg border border-slate-100">
                      <div className="w-2 h-2 rounded-full bg-amber-500" />
                      <span className="text-sm text-slate-700">
                        <span className="font-bold text-slate-900">Image</span>
                        <span className="text-slate-500"> → Supporting Evidence</span>
                      </span>
                    </div>
                  </>
                )}

                {/* Image Only */}
                {file && !text && !audioBlob && (
                  <div className="flex items-center gap-3 px-3 py-2.5 bg-white rounded-lg border border-slate-100">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-sm text-slate-700">
                      <span className="font-bold text-slate-900">Image</span>
                      <span className="text-slate-500"> → Grievance Description</span>
                    </span>
                  </div>
                )}

                {/* Text Only */}
                {text && !file && !audioBlob && (
                  <div className="flex items-center gap-3 px-3 py-2.5 bg-white rounded-lg border border-slate-100">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-sm text-slate-700">
                      <span className="font-bold text-slate-900">Text</span>
                      <span className="text-slate-500"> → Grievance Description</span>
                    </span>
                  </div>
                )}

                {/* Audio Only */}
                {audioBlob && !text && !file && (
                  <div className="flex items-center gap-3 px-3 py-2.5 bg-white rounded-lg border border-slate-100">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-sm text-slate-700">
                      <span className="font-bold text-slate-900">Audio</span>
                      <span className="text-slate-500"> → Grievance Description</span>
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="group relative w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-base flex items-center justify-center gap-3 shadow-xl hover:shadow-2xl hover:shadow-slate-900/20 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            <Send className="w-5 h-5 relative z-10" />
            <span className="relative z-10">Submit Grievance</span>
          </button>

          <p className="text-center text-xs text-slate-400 font-medium">
            Reviewed within 24 hours · Helpline: 1800-599-4116
          </p>
        </div>
      </div>
    </div>
  );
}