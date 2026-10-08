"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import SukiLoadingMark from "@/components/SukiLoadingMark";
import {
  ArrowRight,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  GraduationCap,
  Globe,
  Building,
  User,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  X,
  Plus,
} from "lucide-react";
import { btnPrimary, btnSecondary, input } from "@/lib/ui";
import { startPageLoad } from "@/lib/page-loader";

const LinkedinIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect width="4" height="12" x="2" y="9" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

const GithubIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

const SUGGESTED_SKILLS = [
  "React",
  "Next.js",
  "TypeScript",
  "Node.js",
  "System Design",
  "Python",
  "PostgreSQL",
  "MongoDB",
  "Distributed Systems",
  "REST APIs",
  "GraphQL",
  "Docker",
  "Cloud Architecture",
];

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    dateOfBirth: "",
    gender: "Male",
    location: "",
    country: "India",
    profession: "",
    company: "",
    education: "B.Tech Computer Science",
    university: "",
    graduationYear: "2026",
    website: "",
    linkedin: "",
    github: "",
    bio: "",
    skills: "React, Next.js, Node.js, TypeScript",
  });

  const [skillsArray, setSkillsArray] = useState<string[]>([
    "React",
    "Next.js",
    "Node.js",
    "TypeScript",
  ]);
  const [newSkillInput, setNewSkillInput] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const addSkill = (skillToAdd: string) => {
    const trimmed = skillToAdd.trim();
    if (!trimmed || skillsArray.includes(trimmed)) return;
    const updated = [...skillsArray, trimmed];
    setSkillsArray(updated);
    setFormData({ ...formData, skills: updated.join(", ") });
    setNewSkillInput("");
  };

  const removeSkill = (skillToRemove: string) => {
    const updated = skillsArray.filter((s) => s !== skillToRemove);
    setSkillsArray(updated);
    setFormData({ ...formData, skills: updated.join(", ") });
  };

  const getPasswordStrength = () => {
    const p = formData.password;
    if (!p) return { score: 0, label: "Empty", color: "bg-slate-200" };
    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;

    if (score <= 1) return { score: 1, label: "Weak", color: "bg-rose-500" };
    if (score === 2) return { score: 2, label: "Fair", color: "bg-amber-500" };
    if (score === 3) return { score: 3, label: "Good", color: "bg-blue-600" };
    return { score: 4, label: "Strong", color: "bg-emerald-500" };
  };

  const validateStep1 = () => {
    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.email.trim()) {
      setError("Please fill in your first name, last name, and email address.");
      return false;
    }
    if (!formData.email.includes("@") || !formData.email.includes(".")) {
      setError("Please enter a valid email address.");
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!formData.password || !formData.confirmPassword) {
      setError("Please create a password and confirm it.");
      return false;
    }
    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match. Please verify.");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          skills: skillsArray.join(", "),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to register candidate in database.");
      }

      // Store complete verified user record in session
      const userRecord = data.user || {
        name: `${formData.firstName} ${formData.lastName}`.trim(),
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        location: formData.location,
        country: formData.country,
        profession: formData.profession,
        company: formData.company,
        education: formData.education,
        university: formData.university,
        graduationYear: formData.graduationYear,
        website: formData.website,
        linkedin: formData.linkedin,
        github: formData.github,
        bio: formData.bio,
        skills: skillsArray.join(", "),
      };

      localStorage.setItem("userData", JSON.stringify(userRecord));
      localStorage.setItem("userEmail", formData.email);
      localStorage.setItem("isLoggedIn", "true");

      startPageLoad();
      const nextPath = new URLSearchParams(window.location.search).get("next");
      router.replace(nextPath === "/interview" ? "/interview" : "/");
    } catch (err: unknown) {
      console.error("Registration error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to complete registration. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    setStep(step + 1);
    setError("");
  };

  const prevStep = () => {
    setStep(step - 1);
    setError("");
  };

  const strength = getPasswordStrength();

  return (
    <div className="min-h-screen bg-white text-slate-900 py-10 px-4">
      <div className="relative mx-auto max-w-3xl">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-block group mb-4">
            <Image
              src="/suki-logo-cropped.png"
              alt="Suki Software Solutions"
              width={180}
              height={65}
              priority
              className="h-12 w-auto object-contain mx-auto"
            />
          </Link>
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3.5 py-1 text-xs font-semibold text-blue-700 mb-3">

              Suki Software Solutions Assessment
            </span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            Create candidate profile
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-600 max-w-lg mx-auto">
            Complete this 3-step setup so your profile is ready for a live voice interview.
          </p>
        </div>

        <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
          {/* Progress bar line */}
          <div className="relative mb-4 h-2 w-full rounded-full bg-blue-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 transition-all duration-500 shadow-sm"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>

          {/* Step Nodes */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { num: 1, title: "Identity & Contact", desc: "Basic Info", icon: User },
              { num: 2, title: "Account Security", desc: "Password", icon: Lock },
              { num: 3, title: "Career & Skills", desc: "Experience", icon: Briefcase },
            ].map((s) => {
              const isDone = s.num < step;
              const isCurrent = s.num === step;
              const Icon = s.icon;
              return (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => {
                    if (s.num === 1) setStep(1);
                    if (s.num === 2 && validateStep1()) setStep(2);
                    if (s.num === 3 && validateStep1() && validateStep2()) setStep(3);
                  }}
                  className={`flex flex-col sm:flex-row items-center gap-2.5 p-2 sm:p-3 rounded-xl transition-all text-left ${
                    isCurrent
                      ? "bg-blue-50 border-2 border-blue-300 shadow-sm"
                      : isDone
                      ? "text-blue-900 hover:bg-slate-50"
                      : "text-slate-400 opacity-60"
                  }`}
                >
                  <div
                    className={`grid size-9 shrink-0 place-items-center rounded-xl text-xs font-bold transition-all ${
                      isDone
                        ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/25"
                        : isCurrent
                        ? "bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-200"
                        : "border border-slate-200 bg-slate-50 text-slate-500"
                    }`}
                  >
                    {isDone ? <CheckCircle2 size={16} /> : <Icon size={16} />}
                  </div>
                  <div className="hidden sm:block min-w-0 flex-1">
                    <p className={`text-xs font-bold truncate ${isCurrent ? "text-blue-950" : isDone ? "text-blue-900" : "text-slate-500"}`}>
                      {s.title}
                    </p>
                    <p className="text-[10px] text-slate-500 font-medium">Step {s.num} of 3</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Registration Form Card */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {error && (
            <div className="flex items-start gap-3 border-b border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-800">
              <AlertCircle size={18} className="mt-0.5 shrink-0 text-rose-600" />
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="p-6 sm:p-10">
            {/* STEP 1: Personal & Contact */}
            {step === 1 && (
              <div className="space-y-6 fade-up">
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="font-display text-xl font-black text-slate-900 flex items-center gap-2">
                    <User size={20} className="text-blue-600" />
                    Personal &amp; Contact Details
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">
                    Enter your legal candidate identity for interview verification and certification.
                  </p>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="firstName" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      First Name <span className="text-blue-600">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        id="firstName"
                        name="firstName"
                        type="text"
                        value={formData.firstName}
                        onChange={handleChange}
                        placeholder="First name"
                        className={`${input} pl-11 text-slate-900`}
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="lastName" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Last Name <span className="text-blue-600">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        id="lastName"
                        name="lastName"
                        type="text"
                        value={formData.lastName}
                        onChange={handleChange}
                        placeholder="e.g. ram"
                        className={`${input} pl-11 text-slate-900`}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Email Address <span className="text-blue-600">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="candidate@example.com"
                        className={`${input} pl-11 text-slate-900`}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="+91 98765 43210"
                        className={`${input} pl-11 text-slate-900`}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="dateOfBirth" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Date of Birth
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        id="dateOfBirth"
                        name="dateOfBirth"
                        type="date"
                        value={formData.dateOfBirth}
                        onChange={handleChange}
                        className={`${input} pl-11 text-slate-900`}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="gender" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Gender
                    </label>
                    <select
                      id="gender"
                      name="gender"
                      value={formData.gender}
                      onChange={handleChange}
                      className={`${input} text-slate-900`}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Non-Binary">Non-Binary</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="location" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      City / Location
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        id="location"
                        name="location"
                        type="text"
                        value={formData.location}
                        onChange={handleChange}
                        placeholder="e.g. Krishnagiri, Bangalore"
                        className={`${input} pl-11 text-slate-900`}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="country" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Country
                    </label>
                    <div className="relative">
                      <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        id="country"
                        name="country"
                        type="text"
                        value={formData.country}
                        onChange={handleChange}
                        placeholder="e.g. India, United States"
                        className={`${input} pl-11 text-slate-900`}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: Account Security */}
            {step === 2 && (
              <div className="space-y-6 fade-up">
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="font-display text-xl font-black text-slate-900 flex items-center gap-2">
                    <Lock size={20} className="text-blue-600" />
                    Account Security &amp; Password
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">
                    Set a strong password to protect your candidate assessment records, audio, and video.
                  </p>
                </div>

                <div>
                  <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Password <span className="text-blue-600">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className={`${input} pl-11 pr-11 text-slate-900`}
                      required
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  {/* Password strength meter */}
                  {formData.password && (
                    <div className="mt-2.5 space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-500">Security Strength</span>
                        <span className={strength.score >= 3 ? "text-emerald-600" : "text-amber-600"}>
                          {strength.label}
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5 h-1.5">
                        {[1, 2, 3, 4].map((bar) => (
                          <div
                            key={bar}
                            className={`rounded-full transition-all ${
                              bar <= strength.score ? strength.color : "bg-slate-200"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  <p className="mt-1.5 text-xs text-slate-500">Minimum 8 characters with numbers or symbols.</p>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Confirm Password <span className="text-blue-600">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className={`${input} pl-11 pr-11 text-slate-900`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {formData.confirmPassword && (
                    <p
                      className={`mt-1.5 text-xs font-bold flex items-center gap-1 ${
                        formData.password === formData.confirmPassword
                          ? "text-emerald-600"
                          : "text-rose-600"
                      }`}
                    >
                      {formData.password === formData.confirmPassword ? (
                        <>
                          <CheckCircle2 size={13} /> Passwords match
                        </>
                      ) : (
                        "Passwords do not match yet"
                      )}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* STEP 3: Career, Skills & Academics */}
            {step === 3 && (
              <div className="space-y-6 fade-up">
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="font-display text-xl font-black text-slate-900 flex items-center gap-2">
                    <Briefcase size={20} className="text-blue-600" />
                    Career, Education &amp; Skills
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">
                    These details calibrate your AI interview rubric and generate your verified candidate dossier.
                  </p>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="profession" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Target Role / Profession
                    </label>
                    <div className="relative">
                      <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        id="profession"
                        name="profession"
                        type="text"
                        value={formData.profession}
                        onChange={handleChange}
                        placeholder="e.g. Full Stack Developer"
                        className={`${input} pl-11 text-slate-900`}
                        autoFocus
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="company" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Current or Past Company
                    </label>
                    <div className="relative">
                      <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        id="company"
                        name="company"
                        type="text"
                        value={formData.company}
                        onChange={handleChange}
                        placeholder="e.g. Tech Innovations"
                        className={`${input} pl-11 text-slate-900`}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid gap-5 sm:grid-cols-3">
                  <div className="sm:col-span-1">
                    <label htmlFor="education" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Degree / Qualification
                    </label>
                    <div className="relative">
                      <GraduationCap className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        id="education"
                        name="education"
                        type="text"
                        value={formData.education}
                        onChange={handleChange}
                        placeholder="B.Tech, B.S., M.S."
                        className={`${input} pl-11 text-slate-900`}
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-1">
                    <label htmlFor="university" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      University / College
                    </label>
                    <input
                      id="university"
                      name="university"
                      type="text"
                      value={formData.university}
                      onChange={handleChange}
                      placeholder="e.g. Anna University"
                      className={`${input} text-slate-900`}
                    />
                  </div>

                  <div className="sm:col-span-1">
                    <label htmlFor="graduationYear" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Grad Year
                    </label>
                    <input
                      id="graduationYear"
                      name="graduationYear"
                      type="text"
                      value={formData.graduationYear}
                      onChange={handleChange}
                      placeholder="e.g. 2026"
                      className={`${input} text-slate-900`}
                    />
                  </div>
                </div>

                {/* Skills Interactive Tagging */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center justify-between">
                    <span>Key Technical Skills &amp; Competencies</span>
                    <span className="text-slate-400 font-normal">Click to add suggestions</span>
                  </label>

                  {/* Active Skills Chips */}
                  <div className="flex flex-wrap gap-2 mb-3 min-h-[46px] rounded-xl border-2 border-blue-100 bg-slate-50/80 p-2.5">
                    {skillsArray.map((skill) => (
                      <span
                        key={skill}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-100 border border-blue-200 text-blue-900 px-3 py-1 text-xs font-bold shadow-sm"
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => removeSkill(skill)}
                          className="hover:text-rose-600 transition-colors"
                        >
                          <X size={13} />
                        </button>
                      </span>
                    ))}
                    {skillsArray.length === 0 && (
                      <span className="text-xs text-slate-400 py-1 px-1">
                        No skills added yet. Select or type skills below.
                      </span>
                    )}
                  </div>

                  {/* Add Skill Input */}
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={newSkillInput}
                      onChange={(e) => setNewSkillInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addSkill(newSkillInput);
                        }
                      }}
                      placeholder="Type custom skill and press Add..."
                      className={`${input} py-2.5 text-xs text-slate-900`}
                    />
                    <button
                      type="button"
                      onClick={() => addSkill(newSkillInput)}
                      className="rounded-xl border border-blue-300 bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700 transition-all shrink-0 flex items-center gap-1"
                    >
                      <Plus size={14} /> Add
                    </button>
                  </div>

                  {/* Suggested Chips */}
                  <div className="flex flex-wrap gap-1.5">
                    {SUGGESTED_SKILLS.filter((s) => !skillsArray.includes(s)).slice(0, 8).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => addSkill(s)}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:border-blue-400 hover:text-blue-700 transition-all"
                      >
                        + {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Candidate Bio */}
                <div>
                  <label htmlFor="bio" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Professional Bio / Summary
                  </label>
                  <textarea
                    id="bio"
                    name="bio"
                    rows={3}
                    value={formData.bio}
                    onChange={handleChange}
                    placeholder="Briefly describe your technical background, core domain, and what roles you are pursuing..."
                    className={`${input} py-3 text-slate-900`}
                  />
                </div>

                {/* Social Links */}
                <div className="grid gap-5 sm:grid-cols-3">
                  <div>
                    <label htmlFor="linkedin" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      LinkedIn URL
                    </label>
                    <div className="relative">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                        <LinkedinIcon size={16} />
                      </div>
                      <input
                        id="linkedin"
                        name="linkedin"
                        type="url"
                        value={formData.linkedin}
                        onChange={handleChange}
                        placeholder="https://linkedin.com/in/..."
                        className={`${input} pl-10 text-xs text-slate-900`}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="github" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      GitHub URL
                    </label>
                    <div className="relative">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                        <GithubIcon size={16} />
                      </div>
                      <input
                        id="github"
                        name="github"
                        type="url"
                        value={formData.github}
                        onChange={handleChange}
                        placeholder="https://github.com/..."
                        className={`${input} pl-10 text-xs text-slate-900`}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="website" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Portfolio / Website
                    </label>
                    <div className="relative">
                      <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input
                        id="website"
                        name="website"
                        type="url"
                        value={formData.website}
                        onChange={handleChange}
                        placeholder="https://portfolio.dev"
                        className={`${input} pl-10 text-xs text-slate-900`}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Form Actions */}
            <div className="mt-10 pt-6 border-t border-slate-100 flex items-center justify-between gap-4">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={prevStep}
                  disabled={loading}
                  className={`${btnSecondary} px-5 py-3 text-sm flex items-center gap-2`}
                >
                  <ArrowLeft size={16} />
                  <span>Previous</span>
                </button>
              ) : (
                <Link
                  href="/"
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
                >
                  &larr; Back to Home
                </Link>
              )}

              {step < 3 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  disabled={loading}
                  className={`${btnPrimary} ml-auto px-7 py-3 text-sm`}
                >
                  <span>Continue to Step {step + 1}</span>
                  <ArrowRight size={16} />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className={`${btnPrimary} ml-auto px-8 py-3.5 text-base shadow-xl shadow-blue-600/30`}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <SukiLoadingMark size={16} />
                      <span>Saving Profile to Database...</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <span>Complete Registration &amp; Open Home</span>
                      <ArrowRight size={18} />
                    </span>
                  )}
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Existing account prompt */}
        <div className="mt-8 text-center">
          <p className="text-sm font-medium text-slate-600">
            Already have a candidate profile?{" "}
            <Link href="/" className="font-semibold text-blue-700 hover:text-blue-800 underline underline-offset-4">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
