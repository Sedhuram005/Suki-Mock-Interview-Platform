"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ShieldCheck,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  Mic,
  Database,
  User,
  LogOut,
  Phone,
  GraduationCap,
  Check,
  Globe,
  Hexagon,
  Layers,
  BarChart3,
  X,
  Code2,
  Brain,
  Award,
} from "lucide-react";
import UserDetailsModal, { UserDetails } from "@/components/UserDetailsModal";
import Silk from "@/components/Silk";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"signin" | "register">("signin");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState<UserDetails | null>(null);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [tracksModalOpen, setTracksModalOpen] = useState(false);
  const [scoringModalOpen, setScoringModalOpen] = useState(false);

  // Sign In form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Register form state
  const [regFirstName, setRegFirstName] = useState("");
  const [regLastName, setRegLastName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regProfession, setRegProfession] = useState("Full Stack Developer");
  const [regEducation, setRegEducation] = useState("B.Tech / B.E. Computer Science");
  const [regUniversity, setRegUniversity] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regError, setRegError] = useState("");
  const [regSuccess, setRegSuccess] = useState("");
  const [regLoading, setRegLoading] = useState(false);

  // Check stored user session on mount
  useEffect(() => {
    const loggedIn = localStorage.getItem("isLoggedIn") === "true";
    const rawUserData = localStorage.getItem("userData");
    setIsLoggedIn(loggedIn);
    if (rawUserData) {
      try {
        setUserData(JSON.parse(rawUserData));
      } catch (err) {
        console.error("Could not parse user data", err);
      }
    }
  }, []);

  // Handle Login Submit
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to log in.");
      }

      localStorage.setItem("userData", JSON.stringify(data.user));
      localStorage.setItem("userEmail", data.user.email);
      localStorage.setItem("isLoggedIn", "true");

      setIsLoggedIn(true);
      setUserData(data.user);
    } catch (err: any) {
      console.error("Login error:", err);
      setLoginError(err.message || "Invalid credentials. Please verify your email and password.");
    } finally {
      setLoginLoading(false);
    }
  };

  // Handle Register Submit - Stores ALL data in MongoDB
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError("");
    setRegSuccess("");
    setRegLoading(true);

    if (!regFirstName.trim() || !regLastName.trim() || !regEmail.trim() || !regPassword) {
      setRegError("Please provide first name, last name, email, and password.");
      setRegLoading(false);
      return;
    }

    try {
      const payload = {
        firstName: regFirstName.trim(),
        lastName: regLastName.trim(),
        email: regEmail.trim(),
        password: regPassword,
        phone: regPhone.trim(),
        profession: regProfession.trim(),
        education: regEducation.trim(),
        university: regUniversity.trim(),
        location: "Bengaluru, India",
        country: "India",
        skills: "React, Next.js, Node.js, TypeScript, Python, SQL",
      };

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Registration failed.");
      }

      localStorage.setItem("userData", JSON.stringify(data.user));
      localStorage.setItem("userEmail", data.user.email);
      localStorage.setItem("isLoggedIn", "true");

      setRegSuccess("Account registered and synchronized to MongoDB successfully!");
      setIsLoggedIn(true);
      setUserData(data.user);
    } catch (err: any) {
      console.error("Registration error:", err);
      setRegError(err.message || "Failed to complete registration.");
    } finally {
      setRegLoading(false);
    }
  };

  // Demo auto-fill helpers
  const handleDemoLoginFill = () => {
    setLoginEmail("sedhuraman6677@gmail.com");
    setLoginPassword("Password123");
    setLoginError("");
  };

  const handleDemoRegisterFill = () => {
    setRegFirstName("Sedhu");
    setRegLastName("Raman");
    setRegEmail("sedhuraman6677@gmail.com");
    setRegPhone("+91 7338471266");
    setRegProfession("Full Stack Software Engineer");
    setRegEducation("B.Tech Computer Science");
    setRegUniversity("National Institute of Technology");
    setRegPassword("Password123");
    setRegError("");
  };

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("userData");
    localStorage.removeItem("userEmail");
    setIsLoggedIn(false);
    setUserData(null);
  };

  const candidateDisplayName =
    userData?.name ||
    (userData?.firstName && userData?.lastName
      ? `${userData.firstName} ${userData.lastName}`.trim()
      : "Candidate");

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between bg-slate-900 text-white selection:bg-purple-600 selection:text-white font-sans overflow-x-hidden">
      {/* ================= SILK ANIMATED BACKGROUND ================= */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <Silk
          speed={6.5}
          scale={1.1}
          color="#6366f1"
          noiseIntensity={0.7}
          rotation={0}
        />
        {/* Dark overlay for better contrast */}
        <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[0.5px]" />
      </div>

      {/* ================= DEMO CONTENT TOGGLE ================= */}
      <div className="fixed bottom-6 right-6 z-30 flex items-center gap-3 bg-white/10 border border-white/20 rounded-full px-4 py-2 backdrop-blur-sm">
        <span className="text-sm font-semibold text-white/90">Demo Content</span>
        <button
          type="button"
          className="relative inline-flex h-6 w-11 items-center rounded-full bg-white/20 transition-colors"
        >
          <span className="translate-x-1 inline-block h-4 w-4 transform rounded-full bg-white transition"></span>
        </button>
      </div>

      {/* ================= TOP NAVIGATION BAR (FROSTED GLASS EFFECT) ================= */}
      <header className="relative z-20 w-full px-6 sm:px-12 lg:px-20 py-4 flex items-center justify-between border-b border-white/10 bg-white/5 backdrop-blur-xl sticky top-0">
        {/* Left: Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative flex size-10 items-center justify-center rounded-xl bg-white/10 border border-white/20 backdrop-blur-sm">
            <Hexagon size={24} className="stroke-[2.4] text-white transition-transform group-hover:scale-110" />
            <div className="absolute size-2 rounded-full bg-white" />
          </div>
          <span className="font-display text-sm sm:text-base font-extrabold uppercase tracking-[0.25em] text-white">
            Talent<span className="text-blue-300">IQ</span>
          </span>
        </Link>

        {/* Center Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          <Link
            href="/interview"
            className="text-sm font-semibold text-white/80 hover:text-white transition-colors"
          >
            Features
          </Link>
          <button
            type="button"
            onClick={() => setTracksModalOpen(true)}
            className="text-sm font-semibold text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            About
          </button>
        </nav>

        {/* Right: Sign up button */}
        {isLoggedIn ? (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setUserModalOpen(true)}
              className="hidden sm:flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20 transition-all cursor-pointer backdrop-blur-sm"
            >
              <div className="size-6 rounded-full bg-white/20 text-white text-[11px] grid place-items-center font-bold">
                {candidateDisplayName.charAt(0).toUpperCase()}
              </div>
              <span className="max-w-[120px] truncate">{candidateDisplayName}</span>
            </button>

            <Link
              href="/interview"
              className="rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-5 py-2.5 text-sm font-semibold shadow-lg shadow-purple-500/30 flex items-center gap-2 transition-all hover:scale-105 cursor-pointer"
            >
              <Mic size={16} />
              <span>Launch Interview</span>
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              title="Sign out"
              className="size-9 rounded-full border border-white/20 bg-white/10 hover:bg-white/20 grid place-items-center text-white transition-all cursor-pointer backdrop-blur-sm"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setActiveTab("register")}
            className="rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-6 py-2.5 text-sm font-semibold shadow-lg shadow-purple-500/30 transition-all hover:scale-105 cursor-pointer"
          >
            Sign up
          </button>
        )}
      </header>

      {/* ================= MAIN CONTENT: HERO SECTION ================= */}
      <main className="relative z-10 flex-1 flex items-center px-6 sm:px-12 lg:px-20 py-20 lg:py-32">
        <div className="w-full max-w-7xl mx-auto">
          {/* ================= HERO CONTENT ================= */}
          <div className="max-w-3xl space-y-8">
            {/* NEW Tag */}
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-4 py-2 backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
              </span>
              <span className="text-sm font-semibold text-white/90">NEW Creative Components</span>
            </div>

            {/* Headline */}
            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight leading-[1.1]">
              Silk touch is a good enhancement, Steve!
            </h1>

            {/* Intro Paragraph */}
            <p className="text-lg sm:text-xl text-white/80 leading-relaxed font-normal max-w-2xl">
              Experience the future of interview preparation with our AI-powered voice assessment platform. Elevate your communication skills and ace your next interview.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link
                href="/interview"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white text-slate-900 font-bold text-base px-8 py-4 shadow-xl hover:scale-105 transition-all cursor-pointer"
              >
                <span>Get started</span>
                <ArrowRight size={18} />
              </Link>
              <button
                type="button"
                onClick={() => setTracksModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-base px-8 py-4 shadow-lg shadow-purple-500/30 hover:scale-105 transition-all cursor-pointer"
              >
                <span>Learn more</span>
              </button>
            </div>
          </div>
        </div>
      </main>
                {/* Segmented Tab Switcher (Solid Non-Transparent Buttons) */}
                <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-100 border-2 border-blue-100 mb-7">
                  <button
                    type="button"
                    onClick={() => setActiveTab("signin")}
                    className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      activeTab === "signin"
                        ? "bg-blue-600 text-white shadow-md border-2 border-blue-600"
                        : "bg-white text-slate-800 hover:text-blue-600 border-2 border-slate-200 shadow-sm"
                    }`}
                  >
                    <span>Sign In</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("register")}
                    className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      activeTab === "register"
                        ? "bg-blue-600 text-white shadow-md border-2 border-blue-600"
                        : "bg-white text-slate-800 hover:text-blue-600 border-2 border-slate-200 shadow-sm"
                    }`}
                  >
                    <Sparkles size={14} className={activeTab === "register" ? "text-cyan-200" : "text-blue-600"} />
                    <span>Register Candidate</span>
                  </button>
                </div>

                {/* ================= SIGN IN TAB ================= */}
                {activeTab === "signin" && (
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-2 rounded-full bg-blue-600" />
                        <h2 className="font-display text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                          Sign In
                        </h2>
                      </div>
                      <button
                        type="button"
                        onClick={handleDemoLoginFill}
                        className="text-xs font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1.5 transition-colors bg-white px-3.5 py-1.5 rounded-xl border-2 border-blue-200 shadow-sm cursor-pointer hover:bg-blue-50"
                      >
                        <Sparkles size={13} className="text-blue-600" />
                        Auto-fill Demo
                      </button>
                    </div>

                    {loginError && (
                      <div className="mb-5 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs sm:text-sm font-semibold text-rose-800">
                        <AlertCircle size={17} className="mt-0.5 shrink-0 text-rose-600" />
                        <p>{loginError}</p>
                      </div>
                    )}

                    <form onSubmit={handleLoginSubmit} className="space-y-5">
                      {/* Email / Mobile */}
                      <div>
                        <label
                          htmlFor="loginEmail"
                          className="block text-xs sm:text-sm font-bold text-slate-700 mb-2"
                        >
                          Email/Mobile Number
                        </label>
                        <div className="relative">
                          <Mail
                            size={18}
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500"
                          />
                          <input
                            id="loginEmail"
                            type="email"
                            value={loginEmail}
                            onChange={(e) => setLoginEmail(e.target.value)}
                            placeholder="sedhuraman6677@gmail.com"
                            className="w-full rounded-2xl border-2 border-blue-200 bg-blue-50/30 pl-11 pr-4 py-3.5 sm:py-4 text-sm font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-500/15"
                            required
                          />
                        </div>
                      </div>

                      {/* Password */}
                      <div>
                        <label
                          htmlFor="loginPassword"
                          className="block text-xs sm:text-sm font-bold text-slate-700 mb-2"
                        >
                          Password
                        </label>
                        <div className="relative">
                          <Lock
                            size={18}
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500"
                          />
                          <input
                            id="loginPassword"
                            type={showLoginPassword ? "text" : "password"}
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            placeholder="••••••••••"
                            className="w-full rounded-2xl border-2 border-blue-200 bg-blue-50/30 pl-11 pr-12 py-3.5 sm:py-4 text-sm font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-500/15"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowLoginPassword(!showLoginPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                          >
                            {showLoginPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>

                      {/* Prominent High-Impact Blue Sign In Button */}
                      <button
                        type="submit"
                        disabled={loginLoading}
                        className="w-full mt-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 py-4 text-base font-bold text-white shadow-xl shadow-blue-600/30 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                      >
                        {loginLoading ? (
                          <span className="flex items-center justify-center gap-2">
                            <div className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                            <span>Signing In...</span>
                          </span>
                        ) : (
                          <span>Sign In</span>
                        )}
                      </button>
                    </form>

                    <div className="mt-6 space-y-2.5 pt-4 border-t border-blue-100 text-center">
                      <p className="text-xs sm:text-sm text-slate-600">
                        Don&apos;t have an account?{" "}
                        <button
                          type="button"
                          onClick={() => setActiveTab("register")}
                          className="font-bold text-blue-600 hover:text-blue-800 underline underline-offset-2 cursor-pointer"
                        >
                          Register candidate profile &rarr;
                        </button>
                      </p>
                      <p className="text-xs text-slate-400">
                        By signing in you agree to all our{" "}
                        <span className="text-blue-600 font-semibold cursor-pointer hover:underline">
                          terms &amp; conditions
                        </span>
                      </p>
                    </div>
                  </div>
                )}

                {/* ================= REGISTER TAB ================= */}
                {activeTab === "register" && (
                  <div>
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-2 rounded-full bg-blue-600" />
                        <div>
                          <h2 className="font-display text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                            Register Candidate
                          </h2>
                          <p className="text-xs text-slate-500">Stored permanently in MongoDB database</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleDemoRegisterFill}
                        className="text-xs font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1.5 transition-colors bg-white px-3.5 py-1.5 rounded-xl border-2 border-blue-200 shadow-sm cursor-pointer hover:bg-blue-50"
                      >
                        <Sparkles size={13} className="text-blue-600" />
                        Auto-fill Sample
                      </button>
                    </div>

                    {regError && (
                      <div className="mb-4 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs sm:text-sm font-semibold text-rose-800">
                        <AlertCircle size={16} className="mt-0.5 shrink-0 text-rose-600" />
                        <p>{regError}</p>
                      </div>
                    )}

                    {regSuccess && (
                      <div className="mb-4 flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-3.5 text-xs sm:text-sm font-semibold text-blue-800">
                        <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-blue-600" />
                        <p>{regSuccess}</p>
                      </div>
                    )}

                    <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            First Name *
                          </label>
                          <input
                            type="text"
                            value={regFirstName}
                            onChange={(e) => setRegFirstName(e.target.value)}
                            placeholder="Sedhu"
                            className="w-full rounded-xl border-2 border-blue-200 bg-blue-50/30 px-3.5 py-2.5 text-xs sm:text-sm font-medium text-slate-900 outline-none transition-all focus:border-blue-600 focus:bg-white"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Last Name *
                          </label>
                          <input
                            type="text"
                            value={regLastName}
                            onChange={(e) => setRegLastName(e.target.value)}
                            placeholder="Raman"
                            className="w-full rounded-xl border-2 border-blue-200 bg-blue-50/30 px-3.5 py-2.5 text-xs sm:text-sm font-medium text-slate-900 outline-none transition-all focus:border-blue-600 focus:bg-white"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Email Address *
                        </label>
                        <div className="relative">
                          <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-500" />
                          <input
                            type="email"
                            value={regEmail}
                            onChange={(e) => setRegEmail(e.target.value)}
                            placeholder="sedhuraman6677@gmail.com"
                            className="w-full rounded-xl border-2 border-blue-200 bg-blue-50/30 pl-10 pr-3.5 py-2.5 text-xs sm:text-sm font-medium text-slate-900 outline-none transition-all focus:border-blue-600 focus:bg-white"
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Mobile Phone
                          </label>
                          <input
                            type="tel"
                            value={regPhone}
                            onChange={(e) => setRegPhone(e.target.value)}
                            placeholder="+91 7338471266"
                            className="w-full rounded-xl border-2 border-blue-200 bg-blue-50/30 px-3.5 py-2.5 text-xs sm:text-sm font-medium text-slate-900 outline-none transition-all focus:border-blue-600 focus:bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Target Profession
                          </label>
                          <input
                            type="text"
                            value={regProfession}
                            onChange={(e) => setRegProfession(e.target.value)}
                            placeholder="Full Stack Engineer"
                            className="w-full rounded-xl border-2 border-blue-200 bg-blue-50/30 px-3.5 py-2.5 text-xs sm:text-sm font-medium text-slate-900 outline-none transition-all focus:border-blue-600 focus:bg-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Degree / Course
                          </label>
                          <input
                            type="text"
                            value={regEducation}
                            onChange={(e) => setRegEducation(e.target.value)}
                            placeholder="B.Tech Computer Science"
                            className="w-full rounded-xl border-2 border-blue-200 bg-blue-50/30 px-3.5 py-2.5 text-xs sm:text-sm font-medium text-slate-900 outline-none transition-all focus:border-blue-600 focus:bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            University / College
                          </label>
                          <input
                            type="text"
                            value={regUniversity}
                            onChange={(e) => setRegUniversity(e.target.value)}
                            placeholder="State University"
                            className="w-full rounded-xl border-2 border-blue-200 bg-blue-50/30 px-3.5 py-2.5 text-xs sm:text-sm font-medium text-slate-900 outline-none transition-all focus:border-blue-600 focus:bg-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Password *
                        </label>
                        <div className="relative">
                          <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-500" />
                          <input
                            type={showRegPassword ? "text" : "password"}
                            value={regPassword}
                            onChange={(e) => setRegPassword(e.target.value)}
                            placeholder="Create secure password"
                            className="w-full rounded-xl border-2 border-blue-200 bg-blue-50/30 pl-10 pr-10 py-2.5 text-xs sm:text-sm font-medium text-slate-900 outline-none transition-all focus:border-blue-600 focus:bg-white"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowRegPassword(!showRegPassword)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors"
                          >
                            {showRegPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={regLoading}
                        className="w-full mt-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 py-3.5 text-sm sm:text-base font-bold text-white shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                      >
                        {regLoading ? (
                          <span className="flex items-center justify-center gap-2">
                            <div className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                            <span>Registering in MongoDB Database...</span>
                          </span>
                        ) : (
                          <span>Complete Registration &amp; Save to Database</span>
                        )}
                      </button>
                    </form>

                    <div className="mt-4 pt-3 border-t border-blue-100 text-center">
                      <p className="text-xs sm:text-sm text-slate-600">
                        Already have an account?{" "}
                        <button
                          type="button"
                          onClick={() => setActiveTab("signin")}
                          className="font-bold text-blue-600 hover:text-blue-800 underline underline-offset-2 cursor-pointer"
                        >
                          Sign In here &rarr;
                        </button>
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      </main>

      {/* ================= BOTTOM FOOTER (CLEAN WHITE & BLUE GLASS) ================= */}
      <footer className="relative z-20 w-full px-6 sm:px-12 lg:px-20 py-5 border-t border-white/60 bg-white/70 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-medium">
          <p>
            Copyright &copy; {new Date().getFullYear()} TalentIQ Assessment Platform. All Rights Reserved.
          </p>
          <div className="flex items-center gap-4 text-slate-600">
            <span>
              Contact us:{" "}
              <a href="tel:+917338471266" className="text-blue-600 font-semibold hover:underline">
                +91-7338471266
              </a>
            </span>
            <span className="text-blue-200">|</span>
            <a href="mailto:help@talentiq.ai" className="text-blue-600 font-semibold hover:underline">
              help@talentiq.ai
            </a>
          </div>
        </div>
      </footer>

      {/* User Details Dossier Modal */}
      <UserDetailsModal
        open={userModalOpen}
        onClose={() => setUserModalOpen(false)}
        userDetails={userData}
      />

      {/* ================= INTERVIEW TRACKS MODAL (WHITE & BLUE) ================= */}
      {tracksModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl rounded-[32px] border-2 border-blue-200 bg-white p-6 sm:p-8 shadow-2xl text-slate-900">
            <button
              onClick={() => setTracksModalOpen(false)}
              className="absolute right-5 top-5 grid size-9 place-items-center rounded-full border border-blue-100 bg-blue-50 text-slate-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-2">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-blue-50 border border-blue-200 text-blue-600">
                <Layers size={22} />
              </div>
              <div>
                <h3 className="font-display text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Interview Practice Tracks
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 font-medium">
                  Curated voice assessment domains designed for engineering roles
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 my-6">
              {[
                {
                  title: "Full Stack Engineer",
                  tags: "React • Next.js • Node • DB",
                  desc: "Comprehensive assessment covering client architecture, backend APIs, and system design.",
                  level: "Mid to Senior",
                },
                {
                  title: "Frontend Specialist",
                  tags: "UI/UX • TypeScript • Performance",
                  desc: "Deep-dive into component lifecycle, rendering optimization, state, and browser APIs.",
                  level: "All Levels",
                },
                {
                  title: "Backend & Cloud",
                  tags: "APIs • Microservices • MongoDB",
                  desc: "Distributed systems, database indexing, caching strategies, and RESTful contract design.",
                  level: "Mid to Senior",
                },
                {
                  title: "Behavioral & Leadership",
                  tags: "STAR Method • Communication",
                  desc: "Situational scenarios, conflict resolution, project management, and cross-team empathy.",
                  level: "All Roles",
                },
              ].map((track, i) => (
                <div
                  key={i}
                  className="rounded-2xl border-2 border-blue-100 bg-blue-50/40 p-4 transition-all hover:border-blue-300 hover:bg-blue-50 hover:shadow-sm"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <h4 className="font-bold text-slate-900 text-sm">{track.title}</h4>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-md">
                      {track.level}
                    </span>
                  </div>
                  <p className="text-xs text-blue-700 font-semibold mb-2">{track.tags}</p>
                  <p className="text-xs text-slate-600 leading-relaxed mb-3">{track.desc}</p>
                  <Link
                    href="/interview"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800"
                  >
                    <span>Select &amp; Launch</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-blue-100">
              <span className="text-xs text-slate-500 font-medium">All tracks powered by real-time AI speech evaluation</span>
              <Link
                href="/interview"
                className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider px-5 py-2.5 shadow-md shadow-blue-500/25 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
              >
                <Mic size={14} />
                <span>Launch Assessment</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ================= AI SCORING RUBRIC MODAL (WHITE & BLUE) ================= */}
      {scoringModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl rounded-[32px] border-2 border-blue-200 bg-white p-6 sm:p-8 shadow-2xl text-slate-900">
            <button
              onClick={() => setScoringModalOpen(false)}
              className="absolute right-5 top-5 grid size-9 place-items-center rounded-full border border-blue-100 bg-blue-50 text-slate-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-2">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-blue-50 border border-blue-200 text-blue-600">
                <BarChart3 size={22} />
              </div>
              <div>
                <h3 className="font-display text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  AI Evaluation &amp; Scoring Rubric
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 font-medium">
                  Objective criteria evaluated during your live voice interview
                </p>
              </div>
            </div>

            <div className="space-y-3.5 my-6">
              {[
                {
                  label: "Technical Depth & Precision",
                  weight: "35%",
                  desc: "Correctness of algorithmic solutions, architectural reasoning, and domain knowledge.",
                  bar: "w-[35%]",
                },
                {
                  label: "Spoken Articulation & Clarity",
                  weight: "25%",
                  desc: "Crisp voice transmission, concise structure (STAR format), and minimal filler words.",
                  bar: "w-[25%]",
                },
                {
                  label: "Problem Solving & Trade-offs",
                  weight: "25%",
                  desc: "Logical breakdown of ambiguity, alternative considerations, and scalability focus.",
                  bar: "w-[25%]",
                },
                {
                  label: "Executive Presence & Confidence",
                  weight: "15%",
                  desc: "Steady speaking cadence, professional communication, and solution ownership.",
                  bar: "w-[15%]",
                },
              ].map((item, i) => (
                <div key={i} className="rounded-xl border border-blue-100 bg-blue-50/30 p-3.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-800 text-xs sm:text-sm">{item.label}</span>
                    <span className="font-extrabold text-blue-600 text-xs bg-blue-100 px-2 py-0.5 rounded-md">
                      {item.weight}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">{item.desc}</p>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-blue-100">
              <span className="text-xs text-slate-500 font-medium">Comprehensive scorecard generated upon completion</span>
              <Link
                href="/interview"
                className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider px-5 py-2.5 shadow-md shadow-blue-500/25 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
              >
                <Mic size={14} />
                <span>Start Voice Test</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
