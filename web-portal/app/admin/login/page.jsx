"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  ArrowRight,
  Loader2,
  Eye,
  EyeOff,
  AlertCircle,
  Lock,
  Mail,
} from "lucide-react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function AdminLogin() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [capsWarning, setCapsWarning] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
  method:      "POST",
  headers:     { "Content-Type": "application/json" }, // ✅ only this — no Authorization
  credentials: "include",
  body:        JSON.stringify({
    email:    email.trim().toLowerCase(),
    password: password,
  }),
});

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.message || "Authentication failed.");
        return;
      }

      if (data.user?.role !== "admin") {
        setError("Access restricted to authorised officials only.");
        return;
      }

      localStorage.setItem("adminToken", data.token);
      localStorage.setItem("adminRefresh", data.refreshToken);
      localStorage.setItem("adminUser", JSON.stringify(data.user));

      router.push("/admin/dashboard");
    } catch {
      setError("Unable to reach the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative overflow-hidden font-sans">

      {/* Background glow matching landing */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute -top-[20%] -right-[10%] w-[600px] h-[600px] bg-blue-100/40 rounded-full blur-3xl opacity-60" />
        <div className="absolute top-[20%] -left-[10%] w-[400px] h-[400px] bg-indigo-100/40 rounded-full blur-3xl opacity-60" />
      </div>

      {/* NAV */}
      <nav className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-3">
          <div className="bg-blue-600 p-2.5 rounded-xl shadow-lg shadow-blue-600/20">
            <ShieldCheck className="text-white w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-none">
              Civic<span className="text-blue-600">Connect</span>
            </h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
              Admin Portal
            </p>
          </div>
        </Link>
      </nav>

      {/* MAIN */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-6">

        <div className="w-full max-w-md bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-slate-200 p-10">

          {/* Badge */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
            </span>
            <span className="text-xs font-bold text-red-600 uppercase tracking-widest">
              Restricted Access
            </span>
          </div>

          <h2 className="text-3xl font-black text-slate-900 text-center mb-2">
            Administrator Login
          </h2>

          <p className="text-center text-slate-500 text-sm mb-8">
            Authorised  officials only
          </p>

          {error && (
            <div className="flex gap-3 items-start bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-6 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">

            {/* EMAIL */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Official Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="admin@kakinada.gov.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                />
              </div>
            </div>

            {/* PASSWORD */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Secure Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type={showPw ? "text" : "password"}
                  required
                  value={password}
                  placeholder="Enter password"
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyUp={(e) =>
                    setCapsWarning(e.getModifierState("CapsLock"))
                  }
                  className="w-full pl-10 pr-12 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                >
                  {showPw ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>

              {capsWarning && (
                <p className="text-xs text-red-500 mt-2">
                  Caps Lock is ON
                </p>
              )}
            </div>

            {/* BUTTON */}
            <button
              type="submit"
              disabled={loading}
              className="group w-full bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  Access Dashboard
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>


        </div>
      </main>

      {/* FOOTER */}
      <footer className="relative z-10 py-6 text-center border-t border-slate-200 bg-white/50 backdrop-blur-sm">
        <p className="text-slate-500 text-sm font-semibold">
          © Kakinada Grievance Portal
        </p>
        <p className="text-xs text-slate-400 mt-1">
          CivicConnect Administrative System
        </p>
      </footer>

    </div>
  );
}