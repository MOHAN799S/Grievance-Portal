"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Shield, Mail, Lock, User, Loader2, MapPin,
  Phone, Building, Home, Calendar, IdCard, Eye, EyeOff,
  ArrowRight, ArrowLeft, CheckCircle2, Navigation
} from "lucide-react";

const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh",
  "Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka",
  "Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram",
  "Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu",
  "Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal",
  "Andaman and Nicobar Islands","Chandigarh","Dadra and Nagar Haveli and Daman and Diu",
  "Delhi","Jammu and Kashmir","Ladakh","Lakshadweep","Puducherry"
];

const BASE = "http://localhost:5000";

const inputBase = "w-full py-2.5 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 outline-none text-slate-900 placeholder-slate-400 transition-all text-sm shadow-sm";
const inputErr  = "border-red-400 focus:border-red-400 focus:ring-red-400/15";

function FieldError({ msg }) {
  if (!msg) return null;
  return <p className="mt-1 text-xs font-semibold text-red-500">{msg}</p>;
}

function SectionHead({ icon: Icon, label }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
        <Icon className="w-4 h-4 text-blue-600" />
      </div>
      <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest">{label}</h3>
      <div className="flex-1 h-px bg-slate-100 ml-1" />
    </div>
  );
}

export default function CitizenLogin() {
  const router = useRouter();
  const [view, setView] = useState("login");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const [showPw, setShowPw]  = useState(false);
  const [showCPw, setShowCPw] = useState(false);
  const [showLPw, setShowLPw] = useState(false);

  const [otp, setOtp]           = useState(["","","","","",""]);
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend]     = useState(false);
  const [tempUser, setTempUser]       = useState(null);

  const [loginEmail, setLoginEmail]       = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginErrors, setLoginErrors]     = useState({});

  const [fetchingAddr, setFetchingAddr] = useState(false);
  const [addrFetched, setAddrFetched]   = useState(false);

  const [form, setForm] = useState({
    fullName:"", email:"", password:"", confirmPassword:"",
    mobileNumber:"", dateOfBirth:"", gender:"", aadhaarNumber:"",
    address:"", city:"", district:"", state:"Andhra Pradesh", pincode:"",
    occupation:"",
  });
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => { setSuccessMsg(""); setFormErrors({}); setLoginErrors({}); }, [view]);

  useEffect(() => {
    if (view === "otp" && resendTimer > 0) {
      const t = setTimeout(() => setResendTimer(r => r - 1), 1000);
      return () => clearTimeout(t);
    } else if (resendTimer === 0) setCanResend(true);
  }, [resendTimer, view]);

  const setField = (n, v) => setForm(p => ({ ...p, [n]: v }));
  const clearFE  = (n)    => setFormErrors(p => { const x = {...p}; delete x[n]; return x; });
  const clearLE  = (n)    => setLoginErrors(p => { const x = {...p}; delete x[n]; return x; });

  // ── Fetch address via Geolocation + Nominatim ─────────────────────────────
  const handleFetchAddress = () => {
    if (!navigator.geolocation) {
      setFormErrors(p => ({ ...p, address: "Geolocation not supported by your browser." }));
      return;
    }
    setFetchingAddr(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude, longitude } }) => {
        try {
          const res  = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
          const data = await res.json();
          const a    = data.address || {};
          const road    = a.road || a.pedestrian || a.footway || "";
          const suburb  = a.suburb || a.neighbourhood || a.quarter || "";
          const fullAddr = [a.house_number, road, suburb].filter(Boolean).join(", ");

          setForm(p => ({
            ...p,
            address:  fullAddr || data.display_name || "",
            city:     a.city || a.town || a.village || a.county || "",
            district: a.county || a.state_district || "",
            pincode:  a.postcode || "",
            state:    INDIAN_STATES.find(s => s.toLowerCase() === (a.state||"").toLowerCase()) || p.state,
          }));
          setAddrFetched(true);
          clearFE("address"); clearFE("city"); clearFE("district"); clearFE("pincode");
        } catch {
          setFormErrors(p => ({ ...p, address: "Failed to fetch address. Please enter manually." }));
        } finally { setFetchingAddr(false); }
      },
      () => {
        setFormErrors(p => ({ ...p, address: "Location access denied. Please enter manually." }));
        setFetchingAddr(false);
      },
      { timeout: 10000 }
    );
  };

  // ── Login ──────────────────────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!loginEmail) errs.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginEmail)) errs.email = "Enter a valid email address.";
    if (!loginPassword) errs.password = "Password is required.";
    if (Object.keys(errs).length) { setLoginErrors(errs); return; }

    setLoading(true);
    try {
      const res  = await fetch(`${BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();

      if (data.success) {
        // ✅ Correct keys — matches what SmartLodge, CitizenHistory, and useAuth read
if (data.token)        localStorage.setItem("citizenToken",        data.token);
if (data.refreshToken) localStorage.setItem("refreshToken", data.refreshToken);
localStorage.setItem("citizen_user", JSON.stringify({
  name:  data.user.fullName || data.user.name,
  email: data.user.email,
  role:  data.role,
}));
        router.push("/citizen/lodge");
      } else {
        const msg = data.message || "Login failed.";
        if (msg.toLowerCase().includes("email") || msg.toLowerCase().includes("account"))
          setLoginErrors({ email: msg });
        else
          setLoginErrors({ password: msg });
      }
    } catch {
      setLoginErrors({ password: "Server error. Please check your connection." });
    } finally { setLoading(false); }
  };

  // ── Signup ─────────────────────────────────────────────────────────────────
  const handleSignUp = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.fullName.trim())                                         errs.fullName        = "Full name is required.";
    if (!form.email)                                                   errs.email           = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))         errs.email           = "Enter a valid email.";
    if (!form.mobileNumber)                                            errs.mobileNumber    = "Mobile number is required.";
    else if (!/^[6-9]\d{9}$/.test(form.mobileNumber))                 errs.mobileNumber    = "Enter a valid 10-digit mobile number.";
    if (!form.dateOfBirth)                                             errs.dateOfBirth     = "Date of birth is required.";
    if (!form.gender)                                                  errs.gender          = "Please select gender.";
    if (!form.aadhaarNumber)                                           errs.aadhaarNumber   = "Aadhaar number is required.";
    else if (!/^\d{12}$/.test(form.aadhaarNumber))                    errs.aadhaarNumber   = "Enter a valid 12-digit Aadhaar number.";
    if (!form.address.trim())                                          errs.address         = "Address is required.";
    if (!form.city.trim())                                             errs.city            = "City is required.";
    if (!form.district.trim())                                         errs.district        = "District is required.";
    if (!form.pincode)                                                 errs.pincode         = "Pincode is required.";
    else if (!/^\d{6}$/.test(form.pincode))                           errs.pincode         = "Enter a valid 6-digit pincode.";
    if (!form.password)                                                errs.password        = "Password is required.";
    else if (form.password.length < 8)                                 errs.password        = "Password must be at least 8 characters.";
    if (!form.confirmPassword)                                         errs.confirmPassword = "Please confirm your password.";
    else if (form.password !== form.confirmPassword)                   errs.confirmPassword = "Passwords do not match.";

    if (Object.keys(errs).length) { setFormErrors(errs); return; }

    setLoading(true);
    try {
      const res  = await fetch(`${BASE}/api/auth/send-otp`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, mobileNumber: form.mobileNumber }),
      });
      const data = await res.json();
      if (data.success) {
        setTempUser(form); setView("otp"); setResendTimer(60); setCanResend(false);
        setSuccessMsg("OTP sent to your  email.");
      } else {
        setFormErrors({ email: data.message || "Failed to send OTP." });
      }
    } catch {
      setFormErrors({ email: "Server error. Please check your connection." });
    } finally { setLoading(false); }
  };

  // ── OTP verify ─────────────────────────────────────────────────────────────
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const val = otp.join("");
    if (val.length !== 6) { setFormErrors({ otp: "Enter the complete 6-digit OTP." }); return; }
    setOtpLoading(true); setFormErrors({});
    try {
      const res  = await fetch(`${BASE}/api/auth/verify-otp`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: tempUser.email, otp: val, userData: tempUser }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg("Account created! Please sign in.");
        setTimeout(() => { setView("login"); setOtpLoading(false); setOtp(["","","","","",""]); setTempUser(null); }, 1500);
      } else {
        setFormErrors({ otp: data.message || "Invalid OTP. Try again." });
        setOtpLoading(false);
      }
    } catch {
      setFormErrors({ otp: "Server error." });
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResend) return;
    setCanResend(false); setResendTimer(60); setFormErrors({});
    try {
      const res  = await fetch(`${BASE}/api/auth/send-otp`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: tempUser.email, mobileNumber: tempUser.mobileNumber }),
      });
      const data = await res.json();
      if (data.success) { setSuccessMsg("OTP resent!"); setOtp(["","","","","",""]); }
      else { setFormErrors({ otp: data.message || "Failed to resend." }); setCanResend(true); }
    } catch { setFormErrors({ otp: "Failed to resend." }); setCanResend(true); }
  };

  const handleOtpChange = (i, val) => {
    if (!/^\d*$/.test(val)) return;
    const n = [...otp]; n[i] = val; setOtp(n);
    if (val && i < 5) document.getElementById(`otp-${i+1}`)?.focus();
  };
  const handleOtpKey = (i, e) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) document.getElementById(`otp-${i-1}`)?.focus();
  };

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative overflow-hidden font-sans selection:bg-blue-100">

      {/* Background blobs — identical to landing page */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute -top-[20%] -right-[10%] w-[600px] h-[600px] bg-blue-100/40 rounded-full blur-3xl opacity-60" />
        <div className="absolute top-[20%] -left-[10%] w-[400px] h-[400px] bg-indigo-100/40 rounded-full blur-3xl opacity-60" />
      </div>

      {/* Nav — identical to landing page */}
      <nav className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-3">
          <div className="bg-blue-600 p-2.5 rounded-xl shadow-lg shadow-blue-600/20">
            <Shield className="text-white w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-none">
              Civic<span className="text-blue-600">Connect</span>
            </h1>
          </div>
        </Link>
        <Link href="/" className="text-slate-500 hover:text-slate-900 text-sm font-bold flex items-center gap-1.5 transition-colors group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to Home
        </Link>
      </nav>

      <main className="relative z-10 flex-1 flex items-start justify-center px-4 py-8 pb-20">
        <div className="w-full max-w-xl">

          {/* Status badge */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 text-slate-600 font-bold text-xs shadow-sm">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
              </span>
              Kakinada District Grievance Portal
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-8">
            <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-tight">
              {view === "login"  ? <>Citizen <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">Sign In</span></> :
               view === "signup" ? <>Create Your <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">Account</span></> :
                                   <>Verify Your <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">Identity</span></>}
            </h2>
            <p className="text-slate-500 mt-2 text-sm font-medium">Public Grievance Analysis System</p>
          </div>

          {/* Global success */}
          {successMsg && (
            <div className="mb-5 p-3.5 rounded-2xl border border-green-200 bg-green-50 flex items-center gap-2.5 text-sm font-semibold text-green-700 shadow-sm">
              <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
              {successMsg}
            </div>
          )}

          {/* Card */}
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
            <div className="h-1 w-full bg-gradient-to-r from-blue-600 to-indigo-600" />
            <div className="p-6 md:p-8">

              {/* ────────── LOGIN ────────── */}
              {view === "login" && (
                <form onSubmit={handleLogin} autoComplete="off" className="space-y-4" noValidate>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">
                      Email Address <span className="text-blue-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      <input type="email" autoComplete="off" value={loginEmail}
                        onChange={e => { setLoginEmail(e.target.value); clearLE("email"); }}
                        className={`${inputBase} pl-10 pr-3 ${loginErrors.email ? inputErr : ""}`}
                        placeholder="Enter your registered email" />
                    </div>
                    <FieldError msg={loginErrors.email} />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">
                      Password <span className="text-blue-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      <input type={showLPw ? "text" : "password"} autoComplete="off" value={loginPassword}
                        onChange={e => { setLoginPassword(e.target.value); clearLE("password"); }}
                        className={`${inputBase} pl-10 pr-10 ${loginErrors.password ? inputErr : ""}`}
                        placeholder="Enter your password" />
                      <button type="button" onClick={() => setShowLPw(p => !p)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                        {showLPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <FieldError msg={loginErrors.password} />
                  </div>

                  <button type="submit" disabled={loading}
                    className="group relative w-full mt-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-xl hover:shadow-2xl hover:shadow-slate-900/20 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden">
                    <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                    {loading
                      ? <><Loader2 className="w-5 h-5 animate-spin" /><span>Signing In...</span></>
                      : <><User className="w-4 h-4" /><span>Sign In</span><ArrowRight className="w-4 h-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" /></>}
                  </button>

                  <p className="text-center text-sm text-slate-500 pt-1">
                    Don't have an account?{" "}
                    <button type="button" onClick={() => setView("signup")}
                      className="text-blue-600 font-bold hover:text-blue-700 transition-colors">Register Now</button>
                  </p>
                </form>
              )}

              {/* ────────── SIGNUP ────────── */}
              {view === "signup" && (
                <form onSubmit={handleSignUp} autoComplete="off" className="space-y-6" noValidate>

                  {/* Personal */}
                  <section>
                    <SectionHead icon={IdCard} label="Personal Details" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

                      <div className="md:col-span-2">
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Full Name <span className="text-blue-500">*</span></label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                          <input type="text" value={form.fullName}
                            onChange={e => { setField("fullName", e.target.value); clearFE("fullName"); }}
                            className={`${inputBase} pl-10 pr-3 ${formErrors.fullName ? inputErr : ""}`}
                            placeholder="Full name as per Aadhaar" />
                        </div>
                        <FieldError msg={formErrors.fullName} />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Email <span className="text-blue-500">*</span></label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                          <input type="email" value={form.email}
                            onChange={e => { setField("email", e.target.value); clearFE("email"); }}
                            className={`${inputBase} pl-10 pr-3 ${formErrors.email ? inputErr : ""}`}
                            placeholder="name@example.com" />
                        </div>
                        <FieldError msg={formErrors.email} />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Mobile Number <span className="text-blue-500">*</span></label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                          <input type="tel" value={form.mobileNumber}
                            onChange={e => { const v = e.target.value.replace(/\D/g,"").slice(0,10); setField("mobileNumber",v); clearFE("mobileNumber"); }}
                            className={`${inputBase} pl-10 pr-3 ${formErrors.mobileNumber ? inputErr : ""}`}
                            placeholder="10-digit mobile number" />
                        </div>
                        <FieldError msg={formErrors.mobileNumber} />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Date of Birth <span className="text-blue-500">*</span></label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                          <input type="date" value={form.dateOfBirth}
                            onChange={e => { setField("dateOfBirth", e.target.value); clearFE("dateOfBirth"); }}
                            max={new Date().toISOString().split("T")[0]}
                            className={`${inputBase} pl-10 pr-3 ${formErrors.dateOfBirth ? inputErr : ""}`} />
                        </div>
                        <FieldError msg={formErrors.dateOfBirth} />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Gender <span className="text-blue-500">*</span></label>
                        <select value={form.gender}
                          onChange={e => { setField("gender", e.target.value); clearFE("gender"); }}
                          className={`${inputBase} px-3 appearance-none ${formErrors.gender ? inputErr : ""}`}>
                          <option value="">Select Gender</option>
                          <option>Male</option><option>Female</option><option>Other</option>
                        </select>
                        <FieldError msg={formErrors.gender} />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Aadhaar Number <span className="text-blue-500">*</span></label>
                        <div className="relative">
                          <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                          <input type="text" value={form.aadhaarNumber}
                            onChange={e => { const v = e.target.value.replace(/\D/g,"").slice(0,12); setField("aadhaarNumber",v); clearFE("aadhaarNumber"); }}
                            className={`${inputBase} pl-10 pr-3 ${formErrors.aadhaarNumber ? inputErr : ""}`}
                            placeholder="12-digit Aadhaar" />
                        </div>
                        <FieldError msg={formErrors.aadhaarNumber} />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Occupation</label>
                        <div className="relative">
                          <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                          <input type="text" value={form.occupation}
                            onChange={e => setField("occupation", e.target.value)}
                            className={`${inputBase} pl-10 pr-3`}
                            placeholder="e.g., Business, Service" />
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Address */}
                  <section>
                    <SectionHead icon={Home} label="Residential Address" />

                    {/* Mode toggle */}
                    <div className="flex gap-2 mb-4">
                      <button type="button"
                        onClick={() => setAddrFetched(false)}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${!addrFetched ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"}`}>
                        Enter Manually
                      </button>
                      <button type="button" onClick={handleFetchAddress} disabled={fetchingAddr}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all flex items-center justify-center gap-2 disabled:opacity-60 ${addrFetched ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:border-blue-400 hover:text-blue-600"}`}>
                        {fetchingAddr ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                        {fetchingAddr ? "Fetching..." : addrFetched ? "Location Fetched ✓" : "Use My Location"}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="md:col-span-2">
                       <label className="block text-sm font-bold text-slate-700 mb-1.5">Full Address <span className="text-blue-500">*</span></label>
                        <textarea value={form.address} rows="2"
                          onChange={e => { setField("address", e.target.value); clearFE("address"); setAddrFetched(false); }}
                          className={`w-full px-3 py-2.5 rounded-xl border bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 outline-none text-slate-900 placeholder-slate-400 transition-all text-sm shadow-sm resize-none ${formErrors.address ? "border-red-400" : "border-slate-200"}`}
                          placeholder="House/Flat No., Street, Area, Locality" />
                        <FieldError msg={formErrors.address} />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">City <span className="text-blue-500">*</span></label>
                        <input type="text" value={form.city}
                          onChange={e => { setField("city", e.target.value); clearFE("city"); }}
                          className={`${inputBase} px-3 ${formErrors.city ? inputErr : ""}`}
                          placeholder="City" />
                        <FieldError msg={formErrors.city} />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">District <span className="text-blue-500">*</span></label>
                        <input type="text" value={form.district}
                          onChange={e => { setField("district", e.target.value); clearFE("district"); }}
                          className={`${inputBase} px-3 ${formErrors.district ? inputErr : ""}`}
                          placeholder="District" />
                        <FieldError msg={formErrors.district} />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">State <span className="text-blue-500">*</span></label>
                        <select value={form.state} onChange={e => setField("state", e.target.value)}
                          className={`${inputBase} px-3 appearance-none`}>
                          {INDIAN_STATES.map(s => <option key={s}>{s}</option>)}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Pincode <span className="text-blue-500">*</span></label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                          <input type="text" value={form.pincode}
                            onChange={e => { const v = e.target.value.replace(/\D/g,"").slice(0,6); setField("pincode",v); clearFE("pincode"); }}
                            className={`${inputBase} pl-10 pr-3 ${formErrors.pincode ? inputErr : ""}`}
                            placeholder="6-digit pincode" />
                        </div>
                        <FieldError msg={formErrors.pincode} />
                      </div>
                    </div>
                  </section>

                  {/* Security */}
                  <section>
                    <SectionHead icon={Lock} label="Account Security" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Password <span className="text-blue-500">*</span></label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                          <input type={showPw ? "text" : "password"} autoComplete="new-password" value={form.password}
                            onChange={e => { setField("password", e.target.value); clearFE("password"); clearFE("confirmPassword"); }}
                            className={`${inputBase} pl-10 pr-10 ${formErrors.password ? inputErr : ""}`}
                            placeholder="Minimum 8 characters" />
                          <button type="button" onClick={() => setShowPw(p=>!p)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <FieldError msg={formErrors.password} />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Confirm Password <span className="text-blue-500">*</span></label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                          <input type={showCPw ? "text" : "password"} autoComplete="new-password" value={form.confirmPassword}
                            onChange={e => { setField("confirmPassword", e.target.value); clearFE("confirmPassword"); }}
                            className={`${inputBase} pl-10 pr-10 ${formErrors.confirmPassword ? inputErr : ""}`}
                            placeholder="Re-enter password" />
                          <button type="button" onClick={() => setShowCPw(p=>!p)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                            {showCPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <FieldError msg={formErrors.confirmPassword} />
                      </div>
                    </div>
                  </section>

                  {/* Declaration */}
                  <div className="bg-blue-50 border-l-4 border-blue-500 rounded-r-xl px-4 py-3">
                    <p className="text-xs text-slate-600 leading-relaxed">
                      <span className="font-black text-blue-600">Declaration: </span>
                      I hereby declare that all information provided above is true and accurate to the best of my knowledge.
                    </p>
                  </div>

                  <button type="submit" disabled={loading}
                    className="group relative w-full px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-xl hover:shadow-2xl hover:shadow-slate-900/20 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden">
                    <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                    {loading
                      ? <><Loader2 className="w-5 h-5 animate-spin" /><span>Sending OTP...</span></>
                      : <><span>Register & Continue</span><ArrowRight className="w-4 h-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" /></>}
                  </button>

                  <p className="text-center text-sm text-slate-500">
                    Already have an account?{" "}
                    <button type="button" onClick={() => setView("login")}
                      className="text-blue-600 font-bold hover:text-blue-700 transition-colors">Sign In Here</button>
                  </p>
                </form>
              )}

              {/* ────────── OTP ────────── */}
              {view === "otp" && (
                <form onSubmit={handleVerifyOtp} autoComplete="off" className="space-y-6" noValidate>
                  <div className="text-center">
                    <div className="relative w-20 h-20 mx-auto mb-5">
                      <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-40" />
                      <div className="relative w-20 h-20 bg-blue-50 border-2 border-blue-200 rounded-full flex items-center justify-center">
                        <Mail className="w-9 h-9 text-blue-600" />
                      </div>
                    </div>
                    <h3 className="text-xl font-black text-slate-900 mb-2">Check Your Phone</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">
                      We've sent a 6-digit code to<br />
                      <span className="font-bold text-slate-900">{tempUser?.email}</span>
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-3 text-center">
                      Enter Verification Code <span className="text-blue-500">*</span>
                    </label>
                    <div className="flex justify-center gap-2 sm:gap-3">
                      {otp.map((d, i) => (
                        <input key={i} id={`otp-${i}`} type="text" maxLength="1" autoComplete="off"
                          value={d}
                          onChange={e => { handleOtpChange(i, e.target.value); clearFE("otp"); }}
                          onKeyDown={e => handleOtpKey(i, e)}
                          className={`w-11 h-14 text-center text-xl font-black border-2 rounded-xl bg-white text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 outline-none transition-all shadow-sm ${formErrors.otp ? "border-red-400" : "border-slate-200"}`} />
                      ))}
                    </div>
                    <div className="text-center mt-1"><FieldError msg={formErrors.otp} /></div>
                  </div>

                  <div className="text-center">
                    {canResend
                      ? <button type="button" onClick={handleResendOtp} className="text-blue-600 font-bold hover:text-blue-700 transition-colors text-sm">Resend Code</button>
                      : <p className="text-sm text-slate-500">Resend code in <span className="font-bold text-blue-600">{resendTimer}s</span></p>}
                  </div>

                  <button type="submit" disabled={otpLoading}
                    className="group relative w-full px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-xl hover:shadow-2xl hover:shadow-slate-900/20 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden">
                    <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                    {otpLoading
                      ? <><Loader2 className="w-5 h-5 animate-spin" /><span>Verifying...</span></>
                      : <><CheckCircle2 className="w-4 h-4" /><span>Verify & Create Account</span></>}
                  </button>

                  <div className="text-center">
                    <button type="button"
                      onClick={() => { setView("signup"); setOtp(["","","","","",""]); setFormErrors({}); }}
                      className="text-sm text-slate-500 hover:text-blue-600 font-semibold transition-colors flex items-center gap-1.5 mx-auto">
                      <ArrowLeft className="w-3.5 h-3.5" /> Back to Registration
                    </button>
                  </div>
                </form>
              )}

            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-6">
            <p className="text-xs text-slate-500">
              Need help?{" "}
              <span className="font-semibold">1800-XXX-XXXX</span>
            </p>
            <p className="text-xs text-slate-400 mt-1">© 2026 Kakinada Grievance Portal. All Rights Reserved.</p>
          </div>

        </div>
      </main>
    </div>
  );
}