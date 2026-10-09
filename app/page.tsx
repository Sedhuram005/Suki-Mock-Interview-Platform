"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PillNav from "@/components/PillNav";
import GridDistortion from "@/components/GridDistortion";
import SukiLoadingMark from "@/components/SukiLoadingMark";
import { startPageLoad } from "@/lib/page-loader";
import {
  ArrowRight,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  ClipboardList,
  CheckCircle2,
  User,
  LogOut,
  Check,
  Layers,
  BarChart3,
  X,
  Code2,
  Clock,
  Server,
  Users,
  Mic,
  ShieldCheck,
  Scale,
  ChevronRight,
  Zap,
  Info,
  FileCheck,
} from "lucide-react";
import UserDetailsModal, { UserDetails } from "@/components/UserDetailsModal";

export default function Home() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"signin" | "register">("signin");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [continueToAssessment, setContinueToAssessment] = useState(false);
  const [assessmentSignInPrompt, setAssessmentSignInPrompt] = useState(false);
  const [userData, setUserData] = useState<UserDetails | null>(null);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [tracksModalOpen, setTracksModalOpen] = useState(false);
  const [scoringModalOpen, setScoringModalOpen] = useState(false);
  const [selectedRubricIndex, setSelectedRubricIndex] = useState<number | null>(0);

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

  // Check stored user session after hydration
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const shouldContinueToAssessment = new URLSearchParams(window.location.search).get("next") === "/interview";
      const loggedIn = localStorage.getItem("isLoggedIn") === "true";
      const rawUserData = localStorage.getItem("userData");
      setContinueToAssessment(shouldContinueToAssessment);

      if (shouldContinueToAssessment && loggedIn) {
        router.replace("/interview");
        return;
      }

      if (shouldContinueToAssessment) {
        setAssessmentSignInPrompt(true);
        setActiveTab("signin");
      }

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
  }, [router]);

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
      if (continueToAssessment) {
        startPageLoad();
        router.replace("/interview");
      }
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
      if (continueToAssessment) {
        startPageLoad();
        router.replace("/interview");
      }
    } catch (err: unknown) {
      console.error("Registration error:", err);
      setRegError(err instanceof Error ? err.message : "Failed to complete registration.");
    } finally {
      setRegLoading(false);
    }
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

  // Rubric Dimensions Definition
  const rubricData = [
    {
      id: "tech-depth",
      label: "Technical Depth & Precision",
      weight: 35,
      weightStr: "35%",
      icon: Code2,
      color: "from-blue-600 to-indigo-600",
      accentBg: "bg-blue-50 border-blue-200 text-blue-700",
      barColor: "bg-gradient-to-r from-blue-600 to-indigo-600",
      desc: "Correctness of algorithmic solutions, architectural reasoning, and domain knowledge.",
      keySignals: [
        "Algorithmic correctness & edge-case handling",
        "Asymptotic complexity analysis (Big-O time & space)",
        "Idiomatic code patterns & system architecture",
      ],
      tip: "Structure your thoughts by stating the brute force approach, then optimize with clear trade-offs.",
    },
    {
      id: "spoken-articulation",
      label: "Spoken Articulation & Clarity",
      weight: 28,
      weightStr: "28%",
      icon: Mic,
      color: "from-cyan-500 to-blue-600",
      accentBg: "bg-cyan-50 border-cyan-200 text-cyan-800",
      barColor: "bg-gradient-to-r from-cyan-500 to-blue-600",
      desc: "Crisp voice transmission, concise structure (STAR format), and minimal filler words.",
      keySignals: [
        "Structured explanations using STAR (Situation, Task, Action, Result)",
        "Minimal vocal fillers ('um', 'like', long dead pauses < 2%)",
        "Concise technical vocabulary & crisp delivery cadence",
      ],
      tip: "Pause for 2 seconds to formulate thoughts rather than speaking while thinking with filler words.",
    },
    {
      id: "problem-solving",
      label: "Problem Solving & Trade-offs",
      weight: 25,
      weightStr: "25%",
      icon: Scale,
      color: "from-violet-600 to-purple-600",
      accentBg: "bg-violet-50 border-violet-200 text-violet-800",
      barColor: "bg-gradient-to-r from-violet-600 to-purple-600",
      desc: "Logical breakdown of ambiguity, alternative considerations, and scalability focus.",
      keySignals: [
        "Asking clarifying questions on inputs, scale, and assumptions",
        "Evaluating alternative approaches before writing code",
        "Identifying single points of failure & distributed bottlenecks",
      ],
      tip: "Always state two possible approaches and explain why you choose one over the other.",
    },
    {
      id: "executive-presence",
      label: "Executive Presence & Confidence",
      weight: 12,
      weightStr: "12%",
      icon: ShieldCheck,
      color: "from-emerald-500 to-teal-600",
      accentBg: "bg-emerald-50 border-emerald-200 text-emerald-800",
      barColor: "bg-gradient-to-r from-emerald-500 to-teal-600",
      desc: "Steady speaking cadence, professional communication, and solution ownership.",
      keySignals: [
        "Even, measured vocal cadence (130-150 words per minute)",
        "Collaborative demeanor when receiving AI hints or counter-questions",
        "Decisive solution ownership without defensive hesitation",
      ],
      tip: "Treat the AI as a staff engineer partner in a real engineering team calibration.",
    },
  ];

  return (
    <div className="relative isolate min-h-screen w-full flex flex-col justify-between bg-transparent text-slate-900 selection:bg-blue-500 selection:text-slate-900 font-sans overflow-x-hidden">
      <div
        aria-hidden="true"
        className="fixed inset-0 -z-20 bg-[url('/landing-space-bg.png')] bg-cover bg-top bg-no-repeat"
      >
        <GridDistortion
          imageSrc="/landing-space-bg.png"
          grid={15}
          mouse={0.1}
          strength={0.15}
          relaxation={0.9}
          className="pointer-events-none"
        />
      </div>
      <div
        aria-hidden="true"
        className="fixed inset-0 -z-10 bg-gradient-to-b from-slate-950/35 via-slate-950/20 to-slate-950/50"
      />

      {/* ================= TOP NAVIGATION BAR (PILL NAV) ================= */}
      <header className="relative z-30 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-3">
        <PillNav
          logo="/suki-nav-logo.png"
          logoAlt="Suki Software Solutions"
          className="bg-gradient-to-r from-blue-600 via-blue-950 to-black border border-white/15 rounded-[27px] px-2 py-2 shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl"
          baseColor="linear-gradient(110deg, #2563eb 0%, #10275f 54%, #020617 100%)"
          pillColor="rgba(255, 255, 255, 0.92)"
          hoveredPillTextColor="#ffffff"
          pillTextColor="#0f172a"
          items={[
            { label: 'Assessment', href: '/interview' },
            { label: 'Tracks', href: '#', onClick: () => setTracksModalOpen(true) },
            { label: 'Scoring rubric', href: '#', onClick: () => setScoringModalOpen(true) },
            ...(isLoggedIn ? [{ label: 'Profile', href: '#', onClick: () => setUserModalOpen(true) }] : [])
          ]}
          mobileItems={[
            ...(isLoggedIn ? [
              { label: 'Launch Interview', href: '/interview' },
              { label: 'Sign Out', href: '#', onClick: handleLogout }
            ] : [
              { label: 'Sign In', href: '#', onClick: () => {
                setActiveTab('signin');
                const el = document.getElementById('auth-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }},
              { label: 'Register Candidate', href: '#', onClick: () => {
                setActiveTab('register');
                const el = document.getElementById('auth-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
            ])
          ]}
          rightContent={
            <div className="hidden md:flex items-center gap-3">
              {isLoggedIn ? (
                <>
                  <button
                    type="button"
                    onClick={() => setUserModalOpen(true)}
                    className="flex items-center gap-2.5 rounded-full border border-slate-200 bg-white shadow-md hover:bg-blue-50 px-3.5 py-2 text-xs font-bold text-slate-900 transition-all cursor-pointer shadow-xs"
                  >
                    <div className="size-6 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 text-slate-900 text-[11px] grid place-items-center font-black shadow-xs">
                      {candidateDisplayName.charAt(0).toUpperCase()}
                    </div>
                    <span className="max-w-[130px] truncate font-semibold">{candidateDisplayName}</span>
                  </button>

                  <Link
                    href="/interview"
                    className="rounded-full bg-white hover:bg-slate-100 text-blue-900 px-5 py-2.5 text-sm font-bold shadow-sm flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <span>Launch interview</span>
                    <ArrowRight size={13} />
                  </Link>

                  <button
                    type="button"
                    onClick={handleLogout}
                    title="Sign out"
                    className="size-10 rounded-full border border-slate-200 bg-white shadow-md hover:bg-rose-500 hover:border-rose-400 hover:text-slate-900 flex items-center justify-center text-slate-900 transition-all cursor-pointer shadow-xs"
                  >
                    <LogOut size={14} />
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('signin');
                      const el = document.getElementById('auth-section');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="rounded-full bg-white hover:bg-slate-100 text-blue-900 px-6 py-2.5 text-sm font-bold shadow-sm flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <User size={15} />
                    <span>Sign In</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('register');
                      const el = document.getElementById('auth-section');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="rounded-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 text-sm font-bold shadow-sm flex items-center gap-2 transition-colors cursor-pointer"
                  >

                    <span>Register</span>
                  </button>
                </div>
              )}
            </div>
          }
        />
      </header>
      {/* ================= MAIN CONTENT HERO & ACTION CONSOLE ================= */}
      <main className="relative z-10 flex-1 flex items-center px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">

          {/* ================= LEFT SIDE: HERO & VALUE PROPOSITIONS ================= */}
          <div className="lg:col-span-6 xl:col-span-7 space-y-6">

            {/* Suki Software Solutions Hero Brand Showcase */}
            <div className="inline-flex items-center gap-3.5 bg-white/95 border border-white/40 pl-3.5 pr-4 py-2 rounded-2xl shadow-xl backdrop-blur-xl">
              <div className="bg-transparent px-2 py-1 rounded-lg">
                <Image
                  src="/suki-logo-cropped.png"
                  alt="Suki Software Solutions"
                  width={160}
                  height={57}
                  priority
                  className="h-7 sm:h-8 w-auto object-contain"
                />
              </div>
            </div>

            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-[1.12]">
              Practice technical interviews with{" "}
              <span className="bg-gradient-to-r from-sky-300 via-blue-300 to-white bg-clip-text text-transparent drop-shadow-md">
                Suki Voice AI
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-100 leading-relaxed max-w-2xl font-medium drop-shadow-sm">
              Run a realistic engineering interview over voice powered by Suki Software Solutions. Evaluates technical depth, problem solving, and spoken articulation, then returns a structured STAR scorecard.
            </p>

            {/* Value Proposition Pills Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
              <div className="group relative flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-[0_8px_30px_rgba(0,0,0,0.12)] transition-all duration-300 hover:border-blue-400 hover:shadow-[0_12px_35px_rgba(37,99,235,0.22)] hover:-translate-y-1">
                <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 border border-blue-100 text-blue-600 shrink-0 group-hover:scale-105 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-xs">
                  <Mic size={20} />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-tight">Natural voice</h4>
                  <p className="text-xs text-slate-500 font-medium leading-tight mt-0.5">Conversational interview flow</p>
                </div>
              </div>

              <div
                onClick={() => setScoringModalOpen(true)}
                className="group relative flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-[0_8px_30px_rgba(0,0,0,0.12)] cursor-pointer transition-all duration-300 hover:border-blue-400 hover:shadow-[0_12px_35px_rgba(37,99,235,0.22)] hover:-translate-y-1"
              >
                <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 border border-blue-100 text-blue-600 shrink-0 group-hover:scale-105 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-xs">
                  <BarChart3 size={20} />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-tight">
                    Four-pillar rubric
                  </h4>
                  <p className="text-xs text-slate-500 font-medium leading-tight mt-0.5">Code, speech, &amp; architecture</p>
                </div>
              </div>

              <div className="group relative flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-[0_8px_30px_rgba(0,0,0,0.12)] transition-all duration-300 hover:border-blue-400 hover:shadow-[0_12px_35px_rgba(37,99,235,0.22)] hover:-translate-y-1">
                <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 border border-blue-100 text-blue-600 shrink-0 group-hover:scale-105 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-xs">
                  <FileCheck size={20} />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-tight">Scorecard</h4>
                  <p className="text-xs text-slate-500 font-medium leading-tight mt-0.5">Instant strengths &amp; gaps</p>
                </div>
              </div>

              <div className="group relative flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-[0_8px_30px_rgba(0,0,0,0.12)] transition-all duration-300 hover:border-blue-400 hover:shadow-[0_12px_35px_rgba(37,99,235,0.22)] hover:-translate-y-1">
                <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 border border-blue-100 text-blue-600 shrink-0 group-hover:scale-105 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-xs">
                  <Clock size={20} />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-tight">1 Hour Total</h4>
                  <p className="text-xs text-slate-500 font-medium leading-tight mt-0.5">30m Voice + 30m MCQ</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3.5 pt-3">
              <Link
                href="/interview"
                className="inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold text-sm sm:text-base px-7 py-3.5 shadow-xl shadow-blue-600/30 hover:shadow-blue-600/50 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <span>Launch assessment</span>
                <ArrowRight size={18} />
              </Link>

              <button
                type="button"
                onClick={() => setScoringModalOpen(true)}
                className="inline-flex items-center gap-2.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 hover:text-blue-600 font-bold text-sm sm:text-base px-6 py-3.5 shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <BarChart3 size={18} className="text-blue-600" />
                <span>Scoring rubric</span>
              </button>

              <button
                type="button"
                onClick={() => setTracksModalOpen(true)}
                className="inline-flex items-center gap-2.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 hover:text-blue-600 font-bold text-sm sm:text-base px-5 py-3.5 shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <Layers size={18} className="text-blue-600" />
                <span>Browse tracks</span>
              </button>
            </div>

          </div>

          {/* ================= RIGHT SIDE: CANDIDATE PORTAL / AUTH CARD ================= */}
          <div id="auth-section" className="lg:col-span-6 xl:col-span-5 w-full max-w-[500px] mx-auto lg:ml-auto">
            {isLoggedIn && userData ? (
              /* ================= CANDIDATE READINESS CONSOLE (LOGGED IN) ================= */
              <div className="rounded-2xl border border-slate-200 bg-white shadow-md p-7 sm:p-8 shadow-2xl backdrop-blur-xl text-slate-900">
                <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-200">
                  <div className="flex items-center gap-2.5">
                    <div className="bg-white px-2 py-1 rounded-lg">
                      <Image
                        src="/suki-logo-cropped.png"
                        alt="Suki Software Solutions"
                        width={140}
                        height={50}
                        className="h-7 w-auto object-contain"
                      />
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-slate-300 px-3 py-1 text-[11px] font-semibold text-slate-900">
                    <span className="size-1.5 rounded-full bg-sky-300" />
                    Suki Verified
                  </span>
                </div>

                <div className="flex items-center gap-4 p-4 rounded-2xl bg-white shadow-sm border border-slate-200 mb-6">
                  <div className="relative">
                    <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-blue-500 text-slate-900 font-bold text-xl">
                      {candidateDisplayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-full bg-emerald-400 text-slate-900 ring-2 ring-slate-900">
                      <Check size={12} className="stroke-[3]" />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-slate-900 text-base truncate">
                      {candidateDisplayName}
                    </h3>
                    <p className="text-xs text-sky-200 font-semibold truncate">
                      {userData.profession || "Full Stack Candidate"}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {userData.email}
                    </p>
                  </div>
                </div>

                {/* Readiness Pre-Flight Checklist */}
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 mb-6 space-y-2.5">
                  <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200">
                    <span className="text-slate-600 font-medium flex items-center gap-2">
                      <Mic size={14} className="text-blue-600" /> Microphone Sensor:
                    </span>
                    <span className="font-bold text-emerald-400 flex items-center gap-1">
                      <span className="size-1.5 rounded-full bg-emerald-400" /> Ready
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200">
                    <span className="text-slate-600 font-medium flex items-center gap-2">
                      <Layers size={14} className="text-blue-600" /> Target Track:
                    </span>
                    <span className="font-bold text-slate-900">Full Stack Engineering</span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-medium flex items-center gap-2">
                      <BarChart3 size={14} className="text-blue-600" /> Target Rubric:
                    </span>
                    <span className="font-bold text-sky-200">4 Objective Pillars (100%)</span>
                  </div>
                </div>

                {/* Primary Launch Action */}
                <Link
                  href="/interview"
                  className="w-full py-4 text-sm sm:text-base font-bold text-blue-900 rounded-xl bg-white hover:bg-slate-100 flex items-center justify-center gap-2.5 mb-3 transition-colors shadow-lg"
                >

                  <span>Launch Live Interview Directly</span>
                  <ArrowRight size={18} />
                </Link>

                {/* View Dossier Action */}
                <button
                  type="button"
                  onClick={() => setUserModalOpen(true)}
                  className="w-full py-3 text-xs sm:text-sm font-bold text-slate-900 rounded-xl border border-slate-300 bg-white shadow-md hover:bg-blue-50 shadow-lg backdrop-blur-md flex items-center justify-center gap-2 cursor-pointer mb-4 transition-all"
                >
                  <User size={15} className="text-blue-600" />
                  <span>View Full Candidate Dossier</span>
                </button>

                <div className="text-center">
                  <button
                    onClick={handleLogout}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                  >
                    <LogOut size={13} />
                    <span>Switch candidate or sign out</span>
                  </button>
                </div>
              </div>
            ) : (
              /* ================= TABBED AUTH & REGISTRATION CARD (LOGGED OUT) ================= */
              <div className="rounded-2xl border border-slate-200 bg-white shadow-md p-7 sm:p-8 shadow-2xl backdrop-blur-xl text-slate-900">
                <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-200">
                  <div className="bg-white px-2 py-1 rounded-lg">
                    <Image
                      src="/suki-logo-cropped.png"
                      alt="Suki Software Solutions"
                      width={150}
                      height={53}
                      className="h-7 sm:h-8 w-auto object-contain"
                    />
                  </div>
                  <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Candidate Portal
                  </span>
                </div>

                {/* Segmented Switcher */}
                <div className="flex items-center gap-1 p-1 rounded-2xl bg-white shadow-sm border border-slate-200 mb-6">
                  <button
                    type="button"
                    onClick={() => setActiveTab("signin")}
                    className={`flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      activeTab === "signin"
                        ? "bg-blue-50 text-slate-900 shadow-md border border-slate-300 backdrop-blur-md"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <span>Sign In</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("register")}
                    className={`flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      activeTab === "register"
                        ? "bg-blue-50 text-slate-900 shadow-md border border-slate-300 backdrop-blur-md"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >

                    <span>Register Candidate</span>
                  </button>
                </div>

                {assessmentSignInPrompt && (
                  <div
                    role="region"
                    aria-labelledby="assessment-access-title"
                    aria-live="polite"
                    className="mb-5 overflow-hidden rounded-2xl border border-blue-200/80 bg-white shadow-md shadow-blue-950/5"
                  >
                    <div className="h-1 bg-gradient-to-r from-blue-700 via-blue-500 to-sky-300" aria-hidden="true" />
                    <div className="p-4 sm:p-5">
                      <div className="flex items-start gap-3.5">
                        <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-100">
                          <Lock size={18} aria-hidden="true" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-blue-700">
                            Before you begin
                          </p>
                          <h3 id="assessment-access-title" className="mt-0.5 text-sm font-semibold leading-5 text-slate-900">
                            Your assessment is ready
                          </h3>
                          <p className="mt-1 text-xs leading-5 text-slate-600">
                            Sign in or create an account to continue. After authentication, we’ll take you straight to the launch screen.
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-2.5">
                        <button
                          type="button"
                          onClick={() => setActiveTab("signin")}
                          className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-blue-700 px-3 py-2 text-xs font-semibold text-white shadow-sm shadow-blue-900/15 transition-all hover:-translate-y-0.5 hover:bg-blue-800 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                        >
                          Sign in
                          <ChevronRight size={15} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTab("register")}
                          className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                        >
                          Create account
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ================= SIGN IN TAB ================= */}
                {activeTab === "signin" && (
                  <div>
                    <div className="flex items-center justify-between mb-5">
                      <div>
                        <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                          Sign in
                        </h2>
                        <p className="text-xs text-slate-600">Access saved profile and scorecards</p>
                      </div>
                    </div>

                    {loginError && (
                      <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-semibold text-rose-800 shadow-sm animate-fade-in">
                        <AlertCircle size={16} className="mt-0.5 shrink-0 text-rose-600" />
                        <p className="flex-1 leading-relaxed">{loginError}</p>
                        <button
                          type="button"
                          onClick={() => setLoginError("")}
                          aria-label="Dismiss error"
                          className="shrink-0 p-0.5 text-rose-400 hover:text-rose-700 transition-colors"
                        >
                          <X size={15} />
                        </button>
                      </div>
                    )}

                    <form onSubmit={handleLoginSubmit} className="space-y-4">
                      <div>
                        <label
                          htmlFor="loginEmail"
                          className="block text-xs font-bold text-slate-700 mb-1.5"
                        >
                          Email Address
                        </label>
                        <div className="relative">
                          <Mail
                            size={16}
                            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                          />
                          <input
                            id="loginEmail"
                            type="email"
                            value={loginEmail}
                            onChange={(e) => {
                              setLoginEmail(e.target.value);
                              if (loginError) setLoginError("");
                            }}
                            placeholder="candidate@example.com"
                            className="w-full rounded-xl border border-slate-200 bg-white shadow-sm pl-10 pr-3.5 py-3 text-xs sm:text-sm font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-sky-400 focus:bg-slate-50 focus:ring-2 focus:ring-sky-400/20"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label
                          htmlFor="loginPassword"
                          className="block text-xs font-bold text-slate-700 mb-1.5"
                        >
                          Password
                        </label>
                        <div className="relative">
                          <Lock
                            size={16}
                            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                          />
                          <input
                            id="loginPassword"
                            type={showLoginPassword ? "text" : "password"}
                            value={loginPassword}
                            onChange={(e) => {
                              setLoginPassword(e.target.value);
                              if (loginError) setLoginError("");
                            }}
                            placeholder="••••••••••"
                            className="w-full rounded-xl border border-slate-200 bg-white shadow-sm pl-10 pr-10 py-3 text-xs sm:text-sm font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-sky-400 focus:bg-slate-50 focus:ring-2 focus:ring-sky-400/20"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowLoginPassword(!showLoginPassword)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 transition-colors cursor-pointer"
                          >
                            {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={loginLoading}
                        className="w-full mt-2 rounded-xl bg-blue-600 hover:bg-blue-700 py-3.5 text-sm font-bold text-white shadow-lg transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center"
                      >
                        {loginLoading ? (
                          <span className="flex items-center justify-center gap-2">
                            <SukiLoadingMark size={16} />
                            <span>Signing In...</span>
                          </span>
                        ) : (
                          <span>Sign In to Console</span>
                        )}
                      </button>
                    </form>

                    <div className="mt-5 pt-4 border-t border-slate-200 text-center">
                      <p className="text-xs text-slate-500">
                        Need a new profile?{" "}
                        <button
                          type="button"
                          onClick={() => setActiveTab("register")}
                          className="font-bold text-blue-600 hover:text-sky-200 underline underline-offset-2 cursor-pointer"
                        >
                          Register candidate here &rarr;
                        </button>
                      </p>
                    </div>
                  </div>
                )}

                {/* ================= REGISTER TAB ================= */}
                {activeTab === "register" && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                          Register
                        </h2>
                        <p className="text-xs text-slate-600">Synced directly to MongoDB</p>
                      </div>
                    </div>

                    {regError && (
                      <div className="mb-3.5 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800 shadow-sm animate-fade-in">
                        <AlertCircle size={15} className="mt-0.5 shrink-0 text-rose-600" />
                        <p className="flex-1 leading-relaxed">{regError}</p>
                        <button
                          type="button"
                          onClick={() => setRegError("")}
                          aria-label="Dismiss error"
                          className="shrink-0 p-0.5 text-rose-400 hover:text-rose-700 transition-colors"
                        >
                          <X size={15} />
                        </button>
                      </div>
                    )}

                    {regSuccess && (
                      <div className="mb-3.5 flex items-start gap-2.5 rounded-xl border border-emerald-500/50 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-200">
                        <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-400" />
                        <p>{regSuccess}</p>
                      </div>
                    )}

                    <form onSubmit={handleRegisterSubmit} className="space-y-3">
                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            First Name *
                          </label>
                          <input
                            type="text"
                            value={regFirstName}
                            onChange={(e) => setRegFirstName(e.target.value)}
                            placeholder="First name"
                            className="w-full rounded-xl border border-slate-200 bg-white shadow-sm px-3 py-2 text-xs font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-sky-400 focus:bg-slate-50 focus:ring-2 focus:ring-sky-400/20"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Last Name *
                          </label>
                          <input
                            type="text"
                            value={regLastName}
                            onChange={(e) => setRegLastName(e.target.value)}
                            placeholder="Last name"
                            className="w-full rounded-xl border border-slate-200 bg-white shadow-sm px-3 py-2 text-xs font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-sky-400 focus:bg-slate-50 focus:ring-2 focus:ring-sky-400/20"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Email Address *
                        </label>
                        <div className="relative">
                          <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                          <input
                            type="email"
                            value={regEmail}
                            onChange={(e) => setRegEmail(e.target.value)}
                            placeholder="candidate@example.com"
                            className="w-full rounded-xl border border-slate-200 bg-white shadow-sm pl-8 pr-3 py-2 text-xs font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-sky-400 focus:bg-slate-50 focus:ring-2 focus:ring-sky-400/20"
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Mobile Phone
                          </label>
                          <input
                            type="tel"
                            value={regPhone}
                            onChange={(e) => setRegPhone(e.target.value)}
                            placeholder="+91 7338471266"
                            className="w-full rounded-xl border border-slate-200 bg-white shadow-sm px-3 py-2 text-xs font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-sky-400 focus:bg-slate-50 focus:ring-2 focus:ring-sky-400/20"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Target Profession
                          </label>
                          <input
                            type="text"
                            value={regProfession}
                            onChange={(e) => setRegProfession(e.target.value)}
                            placeholder="Full Stack Engineer"
                            className="w-full rounded-xl border border-slate-200 bg-white shadow-sm px-3 py-2 text-xs font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-sky-400 focus:bg-slate-50 focus:ring-2 focus:ring-sky-400/20"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Degree / Course
                          </label>
                          <input
                            type="text"
                            value={regEducation}
                            onChange={(e) => setRegEducation(e.target.value)}
                            placeholder="B.Tech Computer Science"
                            className="w-full rounded-xl border border-slate-200 bg-white shadow-sm px-3 py-2 text-xs font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-sky-400 focus:bg-slate-50 focus:ring-2 focus:ring-sky-400/20"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            University / College
                          </label>
                          <input
                            type="text"
                            value={regUniversity}
                            onChange={(e) => setRegUniversity(e.target.value)}
                            placeholder="State University"
                            className="w-full rounded-xl border border-slate-200 bg-white shadow-sm px-3 py-2 text-xs font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-sky-400 focus:bg-slate-50 focus:ring-2 focus:ring-sky-400/20"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Password *
                        </label>
                        <div className="relative">
                          <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                          <input
                            type={showRegPassword ? "text" : "password"}
                            value={regPassword}
                            onChange={(e) => setRegPassword(e.target.value)}
                            placeholder="Create secure password"
                            className="w-full rounded-xl border border-slate-200 bg-white shadow-sm pl-8 pr-9 py-2 text-xs font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-sky-400 focus:bg-slate-50 focus:ring-2 focus:ring-sky-400/20"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowRegPassword(!showRegPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 transition-colors cursor-pointer"
                          >
                            {showRegPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={regLoading}
                        className="w-full mt-2 rounded-xl bg-white hover:bg-slate-100 py-3 text-sm font-bold text-blue-900 shadow-lg transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center"
                      >
                        {regLoading ? (
                          <span className="flex items-center justify-center gap-2">
                            <SukiLoadingMark size={16} />
                            <span>Saving to Database...</span>
                          </span>
                        ) : (
                          <span>Complete Registration &amp; Save</span>
                        )}
                      </button>
                    </form>

                    <div className="mt-4 pt-3 border-t border-slate-200 text-center">
                      <p className="text-xs text-slate-500">
                        Already have an account?{" "}
                        <button
                          type="button"
                          onClick={() => setActiveTab("signin")}
                          className="font-bold text-blue-600 hover:text-sky-200 underline underline-offset-2 cursor-pointer"
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

      <footer className="relative z-20 w-full px-4 sm:px-6 lg:px-8 py-5 bg-transparent">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-medium text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
          <div className="flex items-center gap-3">
            <Image
              src="/suki-logo-cropped.png"
              alt="Suki Software Solutions"
              width={150}
              height={53}
              className="h-8 sm:h-9 w-auto object-contain brightness-0 invert drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]"
            />
            <span className="hidden sm:inline text-white/45">|</span>
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
              <span>Voice Interview Assessment Portal</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-white/90">
            <span>
              Helpline:{" "}
              <a href="tel:+917338471266" className="font-semibold text-sky-300 hover:text-white hover:underline">
                +91-7338471266
              </a>
            </span>
            <span className="hidden sm:inline text-white/45">|</span>
            <a href="mailto:contact@sukisoftwaresolutions.com" className="font-semibold text-sky-300 hover:text-white hover:underline">
              contact@sukisoftwaresolutions.com
            </a>
            <span className="hidden sm:inline text-white/45">|</span>
            <span>&copy; {new Date().getFullYear()} Suki Software Solutions</span>
          </div>
        </div>
      </footer>


      {/* ================= USER DETAILS DOSSIER MODAL ================= */}
      <UserDetailsModal
        open={userModalOpen}
        onClose={() => setUserModalOpen(false)}
        userDetails={userData}
      />

      {/* ================= ENHANCED AI SCORING RUBRIC MODAL ================= */}
      {scoringModalOpen && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-3xl border border-blue-100 bg-white/95 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl shadow-blue-950/20 text-slate-900 my-auto overflow-hidden">

            {/* Header Ambient Glow */}
            <div className="pointer-events-none absolute -top-24 -right-24 size-56 rounded-full bg-gradient-to-br from-blue-500/15 to-indigo-500/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -left-24 size-56 rounded-full bg-gradient-to-tr from-cyan-500/15 to-blue-500/10 blur-3xl" />

            {/* Close Button */}
            <button
              onClick={() => setScoringModalOpen(false)}
              className="absolute right-5 top-5 grid size-9 place-items-center rounded-xl border border-slate-200 bg-slate-50/80 text-slate-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all cursor-pointer shadow-2xs"
              aria-label="Close rubric modal"
            >
              <X size={18} />
            </button>

            {/* Modal Title & Badges */}
            <div className="flex items-start gap-4 mb-5 pb-4 border-b border-slate-100">
              <div className="relative flex items-center justify-center rounded-2xl bg-white border border-slate-200/90 shadow-2xs shrink-0 px-3 py-2">
                <Image
                  src="/suki-logo-cropped.png"
                  alt="Suki Software Solutions"
                  width={150}
                  height={53}
                  className="h-9 sm:h-10 w-auto object-contain"
                />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    AI Evaluation &amp; Scoring Rubric
                  </h3>
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-blue-700">
                    <Zap size={10} className="fill-blue-600 text-blue-600" />
                    100% Weight Sum
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                  Objective criteria evaluated during your Suki Software Solutions live voice interview
                </p>
              </div>
            </div>

            {/* Rubric Dimension Cards */}
            <div className="space-y-3 my-5">
              {rubricData.map((item, i) => {
                const IconComponent = item.icon;
                const isSelected = selectedRubricIndex === i;

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedRubricIndex(isSelected ? null : i)}
                    className={`rounded-2xl border transition-all duration-200 p-4 cursor-pointer ${
                      isSelected
                        ? "border-blue-300 bg-blue-50/40 shadow-sm"
                        : "border-slate-200/90 bg-slate-50/40 hover:border-blue-200 hover:bg-slate-50"
                    }`}
                  >
                    {/* Item Header */}
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex size-8 items-center justify-center rounded-lg bg-gradient-to-br ${item.color} text-slate-900 shadow-xs`}
                        >
                          <IconComponent size={16} />
                        </div>
                        <span className="font-bold text-slate-900 text-xs sm:text-sm">
                          {item.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`font-black text-xs px-2.5 py-1 rounded-lg border ${item.accentBg}`}
                        >
                          {item.weightStr}
                        </span>
                        <ChevronRight
                          size={15}
                          className={`text-slate-400 transition-transform duration-200 ${
                            isSelected ? "rotate-90 text-blue-600" : ""
                          }`}
                        />
                      </div>
                    </div>

                    {/* Progress Bar Visualizing Exact Rubric Weight */}
                    <div className="w-full bg-slate-200/70 h-2 rounded-full overflow-hidden mb-2.5">
                      <div
                        className={`h-full rounded-full ${item.barColor} transition-all duration-500`}
                        style={{ width: `${item.weight}%` }}
                      />
                    </div>

                    {/* Description */}
                    <p className="text-xs text-slate-600 leading-relaxed font-normal">
                      {item.desc}
                    </p>

                    {/* Expandable Deep Breakdown / Signals */}
                    {isSelected && (
                      <div className="mt-3 pt-3 border-t border-blue-100/80 space-y-2 animate-fade-in">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Evaluated Signals:
                        </div>
                        <ul className="space-y-1">
                          {item.keySignals.map((signal, sIdx) => (
                            <li
                              key={sIdx}
                              className="text-xs text-slate-700 flex items-start gap-2"
                            >
                              <CheckCircle2
                                size={13}
                                className="text-emerald-500 shrink-0 mt-0.5"
                              />
                              <span>{signal}</span>
                            </li>
                          ))}
                        </ul>

                        {/* Practical Tip */}
                        <div className="flex items-start gap-2 p-2.5 rounded-xl bg-blue-100/60 text-blue-950 text-[11px] font-medium mt-2">
                          <Info size={14} className="text-blue-600 shrink-0 mt-0.5" />
                          <span>
                            <strong>AI Pro-tip:</strong> {item.tip}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer Summary & CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2 text-xs text-slate-500">

                <span>Personalized STAR scorecard generated upon completion</span>
              </div>
              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setScoringModalOpen(false)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Close
                </button>
                <Link
                  href="/interview"
                  onClick={() => setScoringModalOpen(false)}
                  className="w-full sm:w-auto rounded-xl bg-blue-600 hover:bg-blue-700 text-slate-900 font-semibold text-xs px-5 py-2.5 shadow-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <ClipboardList size={14} />
                  <span>Start Assessment</span>
                </Link>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ================= INTERVIEW TRACKS MODAL ================= */}
      {tracksModalOpen && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-4xl rounded-3xl border border-blue-100 bg-white/95 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl shadow-blue-950/20 text-slate-900 my-auto overflow-hidden">

            {/* Header Ambient Glow */}
            <div className="pointer-events-none absolute -top-24 -right-24 size-60 rounded-full bg-blue-500/15 blur-3xl" />

            <button
              onClick={() => setTracksModalOpen(false)}
              className="absolute right-5 top-5 grid size-9 place-items-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all cursor-pointer shadow-2xs"
            >
              <X size={18} />
            </button>

            {/* Header */}
            <div className="flex items-center gap-4 mb-6 pb-4 border-b border-slate-100">
              <div className="relative flex items-center justify-center rounded-2xl bg-white border border-slate-200/90 shadow-2xs p-2">
                <Image
                  src="/suki-logo-cropped.png"
                  alt="Suki Software Solutions"
                  width={150}
                  height={53}
                  className="h-9 sm:h-10 w-auto object-contain"
                />
              </div>
              <div>
                <h3 className="font-display text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Engineering Practice Tracks
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 font-medium">
                  Curated voice assessment tracks calibrated for technical roles at Suki Software Solutions
                </p>
              </div>
            </div>

            {/* Track Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
              {[
                {
                  title: "Full Stack Engineer",
                  icon: Code2,
                  tags: "React • Next.js • Node • Databases",
                  desc: "Comprehensive assessment covering client architecture, backend APIs, data modeling, and end-to-end system design.",
                  level: "Mid to Senior",
                  questions: "5 Scenarios",
                  duration: "~15 mins",
                  color: "from-blue-600 to-indigo-600",
                },
                {
                  title: "Frontend Specialist",
                  icon: Mic,
                  tags: "UI/UX • TypeScript • Web Performance",
                  desc: "Deep-dive into component lifecycle, rendering optimization, state machines, accessibility, and modern browser APIs.",
                  level: "All Levels",
                  questions: "5 Scenarios",
                  duration: "~15 mins",
                  color: "from-cyan-500 to-blue-600",
                },
                {
                  title: "Backend & Distributed Systems",
                  icon: Server,
                  tags: "APIs • Microservices • MongoDB • Caching",
                  desc: "Distributed consistency, indexing strategies, rate limiting, pub/sub pipelines, and RESTful contract design.",
                  level: "Mid to Senior",
                  questions: "5 Scenarios",
                  duration: "~15 mins",
                  color: "from-violet-600 to-purple-600",
                },
                {
                  title: "Behavioral & Engineering Leadership",
                  icon: Users,
                  tags: "STAR Method • Conflict • Mentorship",
                  desc: "Situational scenarios, architectural debates, cross-team empathy, delivery deadlines, and crisis retrospectives.",
                  level: "All Levels",
                  questions: "5 Scenarios",
                  duration: "~15 mins",
                  color: "from-emerald-500 to-teal-600",
                },
              ].map((track, i) => (
                <div
                  key={i}
                  className="group relative rounded-2xl border border-slate-200/90 bg-slate-50/40 p-5 transition-all duration-300 hover:border-blue-300 hover:bg-white hover:shadow-lg hover:shadow-blue-500/10 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex size-11 items-center justify-center rounded-xl bg-gradient-to-br ${track.color} text-slate-900 shadow-xs`}
                        >
                          <track.icon size={22} />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm sm:text-base">
                            {track.title}
                          </h4>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                              {track.level}
                            </span>
                            <span className="text-[11px] text-slate-400 font-medium">
                              {track.questions} • {track.duration}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <p className="text-[11px] font-bold text-blue-600 mb-2 flex items-center gap-1.5">
                      <span className="size-1.5 rounded-full bg-blue-500" />
                      {track.tags}
                    </p>
                    <p className="text-xs text-slate-600 leading-relaxed mb-4">
                      {track.desc}
                    </p>
                  </div>

                  <Link
                    href="/interview"
                    onClick={() => setTracksModalOpen(false)}
                    className="inline-flex items-center justify-between w-full p-2.5 rounded-xl bg-blue-50/70 hover:bg-blue-600 text-blue-700 hover:text-slate-900 font-bold text-xs transition-all group-hover:shadow-xs"
                  >
                    <span>Select &amp; Launch Track</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <CheckCircle2 size={16} className="text-emerald-500" />
                <span>All tracks powered by real-time voice latency &lt;300ms</span>
              </div>
              <Link
                href="/interview"
                onClick={() => setTracksModalOpen(false)}
                className="w-full sm:w-auto rounded-xl bg-blue-600 hover:bg-blue-700 text-slate-900 font-semibold text-xs px-6 py-2.5 shadow-sm flex items-center justify-center gap-2 transition-colors"
              >
                <ClipboardList size={15} />
                <span>Launch Assessment</span>
              </Link>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
