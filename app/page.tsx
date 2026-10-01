"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
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
  Hexagon,
  Layers,
  BarChart3,
  X,
  Menu,
} from "lucide-react";
import UserDetailsModal, { UserDetails } from "@/components/UserDetailsModal";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"signin" | "register">("signin");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState<UserDetails | null>(null);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [tracksModalOpen, setTracksModalOpen] = useState(false);
  const [scoringModalOpen, setScoringModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  // Check stored user session after hydration.
  useEffect(() => {
    const timeout = window.setTimeout(() => {
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
    }, 0);

    return () => window.clearTimeout(timeout);
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
    } catch (err: unknown) {
      console.error("Login error:", err);
      setLoginError(
        err instanceof Error
          ? err.message
          : "Invalid credentials. Please verify your email and password.",
      );
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
    } catch (err: unknown) {
      console.error("Registration error:", err);
      setRegError(err instanceof Error ? err.message : "Failed to complete registration.");
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
    <div className="relative min-h-screen w-full flex flex-col justify-between bg-white text-slate-900 selection:bg-blue-600 selection:text-white font-sans overflow-x-hidden">
      {/* ================= FLOWING CYAN-BLUE & WHITE WAVE BACKGROUND WITH 3D ANIMATION ================= */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-gradient-to-br from-sky-100 via-blue-50 to-indigo-100">
        <div className="absolute inset-0 animate-wave-3d">
          <Image
            src="/bg-wave.jpg"
            alt=""
            fill
            priority
            quality={100}
            sizes="100vw"
            className="object-cover object-center brightness-110 contrast-105 saturate-110"
            aria-hidden="true"
          />
        </div>
        {/* Enhanced bright overlay for better readability and visual appeal */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-white/10 to-white/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-transparent to-indigo-500/5" />
      </div>

      {/* ================= TOP NAVIGATION BAR (CLEAN WHITE & BLUE GLASS) ================= */}
      <div className="relative z-20 w-full max-w-[85%] mx-auto mt-6 px-6 sm:px-12 lg:px-20">
        <header className="flex items-center justify-between border-b border-blue-100/60 bg-white/80 sticky top-0 backdrop-blur-md py-5" style={{ borderRadius: "15px" }}>
        {/* Left: Hexagon Icon + Company Title */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative flex size-9 items-center justify-center rounded-xl bg-blue-50 border border-blue-200">
            <Hexagon size={22} className="stroke-[2.4] text-blue-600 transition-transform group-hover:scale-110" />
            <div className="absolute size-2 rounded-full bg-blue-600" />
          </div>
          <span className="font-display text-sm sm:text-base font-extrabold uppercase tracking-[0.25em] text-slate-900">
            Talent<span className="text-blue-600">IQ</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-4 sm:gap-8">
          <nav className="flex items-center gap-7 text-xs font-bold uppercase tracking-[0.15em] text-slate-600">
            <Link
              href="/interview"
              className="flex items-center gap-1.5 text-blue-600 font-extrabold hover:text-blue-800 transition-colors py-1 border-b-2 border-blue-600"
            >
              <Sparkles size={14} className="text-blue-600" />
              <span>Assessment</span>
            </Link>
            <button
              type="button"
              onClick={() => setTracksModalOpen(true)}
              className="flex items-center gap-1.5 hover:text-blue-600 transition-colors cursor-pointer py-1"
            >
              <Layers size={14} className="text-blue-600" />
              <span>Interview Tracks</span>
            </button>
            <button
              type="button"
              onClick={() => setScoringModalOpen(true)}
              className="flex items-center gap-1.5 hover:text-blue-600 transition-colors cursor-pointer py-1"
            >
              <BarChart3 size={14} className="text-blue-600" />
              <span>AI Scoring Rubric</span>
            </button>
            {isLoggedIn && (
              <button
                type="button"
                onClick={() => setUserModalOpen(true)}
                className="flex items-center gap-1.5 hover:text-blue-600 transition-colors cursor-pointer py-1"
              >
                <User size={14} className="text-blue-600" />
                <span>Candidate Dossier</span>
              </button>
            )}
          </nav>

          {/* Action CTAs: Start Interview & Auth Controls */}
          {isLoggedIn ? (
            <div className="flex items-center gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={() => setUserModalOpen(true)}
                className="hidden sm:flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50/80 px-3.5 py-1.5 text-xs font-bold text-blue-900 hover:bg-blue-100 transition-all cursor-pointer shadow-sm"
              >
                <div className="size-5 rounded-full bg-blue-600 text-white text-[10px] grid place-items-center font-bold">
                  {candidateDisplayName.charAt(0).toUpperCase()}
                </div>
                <span className="max-w-[120px] truncate">{candidateDisplayName}</span>
              </button>

              <Link
                href="/interview"
                className="rounded-full bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 text-xs font-bold uppercase tracking-[0.12em] shadow-md shadow-blue-500/25 flex items-center gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <Mic size={14} />
                <span>Launch Interview</span>
                <ArrowRight size={13} />
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                title="Sign out"
                className="size-9 rounded-full border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 grid place-items-center text-slate-500 transition-all cursor-pointer shadow-sm"
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={() => setActiveTab("register")}
                className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-slate-700 hover:text-blue-600 px-3 py-2 cursor-pointer transition-colors"
              >
                <Sparkles size={13} className="text-blue-600" />
                <span>Register Profile</span>
              </button>

              <Link
                href="/interview"
                className="rounded-full bg-blue-600 hover:bg-blue-700 text-white px-5 sm:px-6 py-2.5 text-xs font-bold uppercase tracking-[0.12em] shadow-md shadow-blue-500/25 flex items-center gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <Mic size={14} />
                <span>Start Interview</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Hamburger Menu */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden flex items-center justify-center size-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 hover:bg-blue-100 transition-all cursor-pointer"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-white/95 backdrop-blur-md">
          <div className="flex flex-col h-full px-6 py-4">
            {/* Mobile Header */}
            <div className="flex items-center justify-between mb-8">
              <Link href="/" className="flex items-center gap-3 group" onClick={() => setMobileMenuOpen(false)}>
                <div className="relative flex size-9 items-center justify-center rounded-xl bg-blue-50 border border-blue-200">
                  <Hexagon size={22} className="stroke-[2.4] text-blue-600" />
                  <div className="absolute size-2 rounded-full bg-blue-600" />
                </div>
                <span className="font-display text-base font-extrabold uppercase tracking-[0.25em] text-slate-900">
                  Talent<span className="text-blue-600">IQ</span>
                </span>
              </Link>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center size-10 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all cursor-pointer"
              >
                <X size={24} />
              </button>
            </div>

            {/* Mobile Navigation */}
            <nav className="flex flex-col gap-2">
              <Link
                href="/interview"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 font-bold text-sm hover:bg-blue-100 transition-all cursor-pointer"
              >
                <Sparkles size={20} className="text-blue-600" />
                <span>Assessment</span>
              </Link>
              <button
                type="button"
                onClick={() => { setTracksModalOpen(true); setMobileMenuOpen(false); }}
                className="flex items-center gap-3 px-4 py-4 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-all cursor-pointer"
              >
                <Layers size={20} className="text-blue-600" />
                <span>Interview Tracks</span>
              </button>
              <button
                type="button"
                onClick={() => { setScoringModalOpen(true); setMobileMenuOpen(false); }}
                className="flex items-center gap-3 px-4 py-4 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-all cursor-pointer"
              >
                <BarChart3 size={20} className="text-blue-600" />
                <span>AI Scoring Rubric</span>
              </button>
              {isLoggedIn && (
                <button
                  type="button"
                  onClick={() => { setUserModalOpen(true); setMobileMenuOpen(false); }}
                  className="flex items-center gap-3 px-4 py-4 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-all cursor-pointer"
                >
                  <User size={20} className="text-blue-600" />
                  <span>Candidate Dossier</span>
                </button>
              )}
            </nav>

            {/* Mobile Action Buttons */}
            <div className="mt-auto pt-8 border-t border-slate-200">
              {isLoggedIn ? (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-50 border border-blue-200">
                    <div className="size-10 rounded-full bg-blue-600 text-white text-sm grid place-items-center font-bold">
                      {candidateDisplayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{candidateDisplayName}</p>
                      <p className="text-xs text-slate-500">Logged in</p>
                    </div>
                  </div>
                  <Link
                    href="/interview"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 text-sm font-bold uppercase tracking-[0.12em] shadow-md shadow-blue-500/25 transition-all cursor-pointer"
                  >
                    <Mic size={18} />
                    <span>Launch Interview</span>
                    <ArrowRight size={18} />
                  </Link>
                  <button
                    type="button"
                    onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                    className="flex items-center justify-center gap-2 rounded-xl border-2 border-slate-200 text-slate-700 px-6 py-4 text-sm font-bold hover:bg-slate-50 transition-all cursor-pointer"
                  >
                    <LogOut size={18} />
                    <span>Sign Out</span>
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={() => { setActiveTab("register"); setMobileMenuOpen(false); }}
                    className="flex items-center justify-center gap-2 rounded-xl border-2 border-blue-200 text-blue-700 px-6 py-4 text-sm font-bold hover:bg-blue-50 transition-all cursor-pointer"
                  >
                    <Sparkles size={18} className="text-blue-600" />
                    <span>Register Profile</span>
                  </button>
                  <Link
                    href="/interview"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 text-sm font-bold uppercase tracking-[0.12em] shadow-md shadow-blue-500/25 transition-all cursor-pointer"
                  >
                    <Mic size={18} />
                    <span>Start Interview</span>
                    <ArrowRight size={18} />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= MAIN CONTENT: LEFT INTRO / RIGHT WHITE & BLUE SIGN IN CARD ================= */}
      <main className="relative z-10 flex-1 flex items-center px-6 sm:px-12 lg:px-20 py-10 lg:py-16">
        <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* ================= LEFT SIDE: WELCOME & PLATFORM INTRO ================= */}
          <div className="lg:col-span-6 space-y-7 lg:pr-6">
            
            {/* Headline */}
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.1]">
              Welcome to <br />
              <span className="text-blue-600">
                TalentIQ Portal
              </span>
            </h1>

            {/* Intro Paragraph */}
            <p className="text-base sm:text-lg text-slate-700 leading-relaxed font-normal max-w-xl">
              TalentIQ is a comprehensive practice, assignment, and voice interview platform designed to help new graduates and candidates enhance their technical depth, master real-time spoken communication, and prepare for premier career opportunities.
            </p>

            {/* Direct Action Link - Solid Non-Transparent High-Impact Button */}
            <div className="pt-2">
              <Link
                href="/interview"
                className="inline-flex items-center gap-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-base px-8 py-4 shadow-xl shadow-blue-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] border-2 border-blue-600 cursor-pointer"
              >
                <span>Launch Assessment</span>
                <ArrowRight size={20} />
              </Link>
            </div>

          </div>

          {/* ================= RIGHT SIDE: WHITE AND BLUE AUTH CARD ================= */}
          <div className="lg:col-span-6 w-full max-w-[540px] mx-auto lg:ml-auto">
            {isLoggedIn && userData ? (
              /* ================= LOGGED IN CANDIDATE DOSSIER CARD ================= */
              <div className="rounded-[35px] border-2 border-blue-200 bg-white p-8 sm:p-10 shadow-2xl shadow-blue-950/10 text-slate-900">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-2 rounded-full bg-blue-600" />
                    <h2 className="font-display text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                      Candidate Portal
                    </h2>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200 px-3.5 py-1.5 text-xs font-bold text-blue-700">
                    <CheckCircle2 size={14} className="text-blue-600" /> Verified &amp; Synced
                  </span>
                </div>

                <div className="flex items-center gap-5 p-5 rounded-2xl bg-blue-50/80 border border-blue-200 mb-6">
                  <div className="relative">
                    <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-2xl shadow-md">
                      {candidateDisplayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="absolute -bottom-1 -right-1 grid size-6 place-items-center rounded-full bg-blue-600 text-white ring-2 ring-white">
                      <Check size={14} className="stroke-[3]" />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-slate-900 text-lg truncate">
                      {candidateDisplayName}
                    </h3>
                    <p className="text-sm text-blue-700 font-semibold truncate">
                      {userData.profession || "Full Stack Candidate"}
                    </p>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {userData.email}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 mb-6 text-sm text-slate-600">
                  <div className="flex items-center justify-between py-2 border-b border-blue-50">
                    <span className="font-medium text-slate-500 flex items-center gap-2">
                      <Database size={15} className="text-blue-600" /> Database Registry:
                    </span>
                    <span className="font-bold text-blue-700">MongoDB Synchronized</span>
                  </div>
                  {userData.phone && (
                    <div className="flex items-center justify-between py-2 border-b border-blue-50">
                      <span className="font-medium text-slate-500 flex items-center gap-2">
                        <Phone size={15} className="text-blue-600" /> Contact Phone:
                      </span>
                      <span className="font-bold text-slate-800">{userData.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between py-2 border-b border-blue-50">
                    <span className="font-medium text-slate-500 flex items-center gap-2">
                      <GraduationCap size={15} className="text-blue-600" /> Education:
                    </span>
                    <span className="font-bold text-slate-800 truncate max-w-[220px]">
                      {userData.education || "Bachelor's Degree"}
                    </span>
                  </div>
                </div>

                <Link
                  href="/interview"
                  className="w-full py-4 text-base font-bold text-white rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2.5 mb-3.5 transition-all hover:scale-[1.01] active:scale-[0.99]"
                >
                  <span>Launch Interview Directly</span>
                  <ArrowRight size={18} />
                </Link>

                <button
                  type="button"
                  onClick={() => setUserModalOpen(true)}
                  className="w-full py-3.5 text-sm font-bold text-slate-800 rounded-2xl border-2 border-slate-200 bg-white hover:bg-slate-50 shadow-sm flex items-center justify-center gap-2 cursor-pointer mb-3 transition-all"
                >
                  <User size={16} className="text-blue-600" />
                  <span>View Complete Profile Dossier</span>
                </button>

                <div className="pt-2 text-center">
                  <button
                    onClick={handleLogout}
                    className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:text-rose-600 hover:border-rose-200 shadow-sm transition-colors cursor-pointer"
                  >
                    Switch candidate or sign out
                  </button>
                </div>
              </div>
            ) : (
              /* ================= TABBED AUTH & REGISTRATION CARD (WHITE AND BLUE) ================= */
              <div className="rounded-[35px] border-2 border-blue-200 bg-white p-8 sm:p-10 shadow-2xl shadow-blue-950/10 text-slate-900">
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
                <Sparkles size={14} />
                <span>Start Assessment</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
