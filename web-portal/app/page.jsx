import Link from "next/link";
import { Shield, User, ArrowRight, Mic, Camera, MapPin, LayoutDashboard, Zap, BarChart3, Scale, Brain } from "lucide-react";

const CATEGORIES = [
  { label: "Electricity", icon: "⚡" },
  { label: "Garbage", icon: "🗑️" },
  { label: "Pollution", icon: "🌫️" },
  { label: "Public Transport", icon: "🚌" },
  { label: "Roads", icon: "🛣️" },
  { label: "Sanitation", icon: "🚰" },
  { label: "Stray Animals", icon: "🐾" },
  { label: "Water", icon: "💧" },
  { label: "Others", icon: "📋" },
];

const URGENCY = [
  {
    label: "Low",
    dot: "bg-slate-400",
    badge: "bg-slate-50 text-slate-600 border-slate-200",
    bar: "bg-slate-300",
    barWidth: "w-1/4",
    desc: "Minor inconvenience with no immediate risk to health or safety.",
  },
  {
    label: "Medium",
    dot: "bg-slate-500",
    badge: "bg-slate-50 text-slate-600 border-slate-200",
    bar: "bg-slate-400",
    barWidth: "w-2/4",
    desc: "Affecting daily life. Requires attention within a few days.",
  },
  {
    label: "High",
    dot: "bg-slate-600",
    badge: "bg-slate-50 text-slate-600 border-slate-200",
    bar: "bg-slate-500",
    barWidth: "w-3/4",
    desc: "Significant disruption or risk. Needs prompt departmental action.",
  },
  {
    label: "Critical",
    dot: "bg-slate-800",
    badge: "bg-slate-50 text-slate-700 border-slate-200",
    bar: "bg-slate-700",
    barWidth: "w-full",
    desc: "Immediate threat to public safety or infrastructure. Escalated instantly.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative overflow-hidden font-sans selection:bg-blue-100">

      {/* Background blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute -top-[20%] -right-[10%] w-[600px] h-[600px] bg-blue-100/40 rounded-full blur-3xl opacity-60" />
        <div className="absolute top-[20%] -left-[10%] w-[400px] h-[400px] bg-indigo-100/40 rounded-full blur-3xl opacity-60" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex justify-between items-center animate-in fade-in slide-in-from-top-4">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2.5 rounded-xl shadow-lg shadow-blue-600/20">
            <Shield className="text-white w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-none">
              Civic<span className="text-blue-600">Connect</span>
            </h1>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2 text-xs font-semibold text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-full shadow-sm">
          <Brain className="w-3.5 h-3.5 text-blue-500" /> AI-Powered Grievance System
        </div>
      </nav>

      <main className="relative z-10 flex-1 flex flex-col items-center px-6 text-center max-w-6xl mx-auto w-full mt-4 pb-20">

        {/* Status pill */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 text-slate-600 font-bold text-xs mb-8 shadow-sm hover:shadow-md transition-shadow cursor-default animate-in fade-in slide-in-from-bottom-4 duration-700">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
          </span>
          System Operational
        </div>

        {/* Hero */}
        <h1 className="text-5xl md:text-7xl font-black text-slate-900 mb-6 tracking-tight leading-[1.1] animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
          Smart Civic <br className="hidden md:block" />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
            Grievance Portal
          </span>
        </h1>

        <p className="text-lg md:text-xl text-slate-500 mb-10 max-w-2xl font-medium leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
          Report civic issues instantly using voice, image, and text. Our AI automatically classifies,
          prioritizes, and routes your complaint to the right department — making{" "}
          <span className="text-slate-900 font-semibold underline decoration-blue-300 decoration-2 underline-offset-2">
            Kakinada
          </span>{" "}
          cleaner, safer, and smarter.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto items-center animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300 mb-16">
          <Link
            href="citizen/login"
            className="group relative w-full sm:w-auto px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-3 shadow-xl hover:shadow-2xl hover:shadow-slate-900/20 transition-all hover:-translate-y-1 overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            <User className="w-5 h-5" />
            <span>Citizen Login</span>
            <ArrowRight className="w-4 h-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
          </Link>
          <Link
            href="/admin/login"
            className="group w-full sm:w-auto px-8 py-4 bg-white text-slate-700 border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all"
          >
            <LayoutDashboard className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
            <span>Admin Portal</span>
          </Link>
        </div>

        {/* How It Works */}
        <div className="w-full mb-16 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-400">
          <SectionLabel>How It Works</SectionLabel>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 text-left">
            <FeatureCard
              icon={<Mic className="w-6 h-6 text-purple-600" />}
              bg="bg-purple-50"
              title="Voice Reporting"
              desc="Just speak your complaint. Our NLP engine transcribes, understands context, and converts it into a structured grievance automatically."
            />
            <FeatureCard
              icon={<Camera className="w-6 h-6 text-green-600" />}
              bg="bg-green-50"
              title="Photo Evidence"
              desc="Upload photos directly from the scene. The system verifies location metadata and uses image analysis to validate and enrich your report."
            />
            <FeatureCard
              icon={<MapPin className="w-6 h-6 text-red-600" />}
              bg="bg-red-50"
              title="Hotspot Prediction"
              desc="AI-driven heatmaps identify recurring problem zones before they escalate, enabling proactive municipal action."
            />
          </div>
        </div>

        {/* Issue Categories */}
        <div className="w-full mb-16 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-500">
          <SectionLabel>Grievance Categories</SectionLabel>
          <p className="text-slate-500 text-sm mb-6 max-w-xl mx-auto">
            Your complaint is automatically classified into one of the categories below using AI. Each category is routed to the responsible municipal department.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {CATEGORIES.map((cat) => (
              <span
                key={cat.label}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-slate-200 bg-white text-slate-600 text-sm font-semibold transition-all hover:scale-105 hover:border-slate-300 cursor-default shadow-sm"
              >
                <span>{cat.icon}</span> {cat.label}
              </span>
            ))}
          </div>
        </div>

        {/* Urgency Levels */}
        <div className="w-full mb-16 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-500">
          <SectionLabel>Urgency Levels</SectionLabel>
          <p className="text-slate-500 text-sm mb-6 max-w-xl mx-auto">
            Our AI analyses sentiment, context, and impact to assign an urgency level to every grievance — ensuring the most critical issues are actioned first.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-left">
            {URGENCY.map((u) => (
              <div
                key={u.label}
                className="bg-white/80 backdrop-blur-sm border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col gap-3"
              >
                <span className={`inline-flex items-center gap-2 self-start px-3 py-1 rounded-full border text-xs font-bold ${u.badge}`}>
                  <span className={`w-2 h-2 rounded-full ${u.dot}`} />
                  {u.label}
                </span>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${u.bar} ${u.barWidth}`} />
                </div>
                <p className="text-slate-500 text-xs leading-relaxed">{u.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* AI Engine Highlights */}
        <div className="w-full mb-6 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-500">
          <SectionLabel>Powered by Advanced AI</SectionLabel>
          <p className="text-slate-500 text-sm mb-6 max-w-xl mx-auto">
            Behind every complaint, our intelligent engine works to ensure fairness, speed, and transparency.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <AICard
              icon={<Zap className="w-5 h-5 text-amber-500" />}
              bg="bg-amber-50"
              title="Explainable Prioritization"
              desc="Every complaint is assigned an urgency score. The reasoning is transparent — you can see why your issue was prioritized the way it was."
            />
            <AICard
              icon={<Scale className="w-5 h-5 text-blue-500" />}
              bg="bg-blue-50"
              title="Fairness Audit System"
              desc="An automated audit layer ensures no community or neighborhood is systematically under-served, promoting equitable governance."
            />
            <AICard
              icon={<BarChart3 className="w-5 h-5 text-indigo-500" />}
              bg="bg-indigo-50"
              title="Proactive Hotspot Detection"
              desc="Machine learning models analyze historical patterns to predict emerging civic problems before they become crises."
            />
          </div>
        </div>

      </main>

      <footer className="relative z-10 py-8 text-center border-t border-slate-200 bg-white/50 backdrop-blur-sm">
        <p className="text-slate-500 text-sm font-semibold">©Kakinada Grievance Portal</p>
        <p className="text-xs text-slate-400 mt-1">Empowering Citizens with Technology</p>
      </footer>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div className="flex items-center justify-center gap-3 mb-2">
      <div className="h-px flex-1 bg-slate-200 max-w-[80px]" />
      <span className="text-xs font-bold uppercase tracking-widest text-slate-400">{children}</span>
      <div className="h-px flex-1 bg-slate-200 max-w-[80px]" />
    </div>
  );
}

function FeatureCard({ icon, bg, title, desc }) {
  return (
    <div className="group p-6 bg-white/80 backdrop-blur-sm rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl hover:shadow-slate-200/50 hover:-translate-y-1 transition-all duration-300">
      <div className={`w-14 h-14 ${bg} rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
        {icon}
      </div>
      <h3 className="text-lg font-bold text-slate-900 mb-3 group-hover:text-blue-600 transition-colors">{title}</h3>
      <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
    </div>
  );
}

function AICard({ icon, bg, title, desc }) {
  return (
    <div className="group p-6 bg-white/80 backdrop-blur-sm rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl hover:shadow-slate-200/50 hover:-translate-y-1 transition-all duration-300">
      <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
        {icon}
      </div>
      <h3 className="text-base font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">{title}</h3>
      <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
    </div>
  );
}