"use client";

import {
  X,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  GraduationCap,
  Globe,
  Building,
  User,
  ShieldCheck,
  ExternalLink,
  FileText,
  CheckCircle2,
  ArrowRight,
  Database,
  Copy,
  Check,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { btnPrimary, btnSecondary } from "@/lib/ui";

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

export type UserDetails = {
  name?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  location?: string;
  country?: string;
  dateOfBirth?: string;
  gender?: string;
  profession?: string;
  company?: string;
  education?: string;
  university?: string;
  graduationYear?: string;
  website?: string;
  linkedin?: string;
  github?: string;
  bio?: string;
  skills?: string;
  createdAt?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  userDetails: UserDetails | null;
};

type ProfileTab = "all" | "personal" | "professional" | "education";

const PROFILE_TABS: { id: ProfileTab; label: string }[] = [
  { id: "all", label: "Overview Dossier" },
  { id: "personal", label: "Personal & Contact" },
  { id: "professional", label: "Experience & Skills" },
  { id: "education", label: "Academics & Social" },
];

export default function UserDetailsModal({ open, onClose, userDetails }: Props) {
  const [activeTab, setActiveTab] = useState<ProfileTab>("all");
  const [copiedEmail, setCopiedEmail] = useState(false);

  if (!open) return null;

  const displayName =
    userDetails?.name ||
    (userDetails?.firstName && userDetails?.lastName
      ? `${userDetails.firstName} ${userDetails.lastName}`
      : "Candidate Profile");

  // Parse skills into array
  const skillsList = userDetails?.skills
    ? userDetails.skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const handleCopyEmail = () => {
    if (userDetails?.email) {
      navigator.clipboard.writeText(userDetails.email);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 sm:p-6 overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-3xl rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-blue-950/25 overflow-hidden my-auto">
        {/* Header with Executive Corporate Blue Gradient */}
        <div className="relative overflow-hidden bg-white text-slate-900 p-6 sm:p-8 border-b border-slate-200">
          <div className="relative flex items-start justify-between gap-4">
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="relative">
                <div className="flex size-16 sm:size-18 items-center justify-center rounded-2xl bg-blue-600 text-white text-2xl font-bold">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <div
                  className="absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-full bg-emerald-500 text-white ring-2 ring-white"
                  title="Verified"
                >
                  <CheckCircle2 size={14} />
                </div>
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                    {displayName}
                  </h2>
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                    <Database size={10} />
                    Synced
                  </span>
                </div>

                <p className="mt-1 text-xs sm:text-sm font-medium text-slate-600">
                  {userDetails?.profession || "Candidate"}{" "}
                  {userDetails?.company ? `• ${userDetails.company}` : ""}
                </p>

                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs font-medium text-slate-500">
                  {userDetails?.location && (
                    <span className="flex items-center gap-1">
                      <MapPin size={13} className="text-blue-600" />
                      {userDetails.location}
                      {userDetails?.country ? `, ${userDetails.country}` : ""}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                    <ShieldCheck size={13} />
                    Verified profile
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="grid size-10 place-items-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
              title="Close modal"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 bg-white px-6 sm:px-8 py-2.5 gap-2 overflow-x-auto">
          {PROFILE_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-xl px-4 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                activeTab === tab.id
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/25"
                  : "text-blue-900/70 hover:text-blue-900 hover:bg-blue-100/70"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Modal Body Content */}
        <div className="p-6 sm:p-8 max-h-[60vh] overflow-y-auto space-y-7 bg-white text-slate-900">
          {/* Candidate Bio / Executive Summary */}
          {userDetails?.bio && (activeTab === "all" || activeTab === "professional") && (
            <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-5 sm:p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-2 text-xs font-extrabold uppercase tracking-wider text-blue-900">
                <FileText size={15} className="text-blue-600" />
                <span>Executive Bio &amp; Professional Summary</span>
              </div>
              <p className="text-sm sm:text-base text-slate-700 leading-relaxed font-normal">
                {userDetails.bio}
              </p>
            </div>
          )}

          {/* 1. Personal & Contact Details */}
          {(activeTab === "all" || activeTab === "personal") && (
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-blue-900 mb-3.5 flex items-center gap-2">
                <User size={14} className="text-blue-600" />
                <span>Personal &amp; Contact Information</span>
              </h3>
              <div className="grid gap-3.5 sm:grid-cols-2">
                {/* Email */}
                <div className="flex items-start gap-3.5 rounded-xl border border-blue-100 bg-slate-50/80 p-4 transition-all hover:border-blue-300 hover:bg-blue-50/40">
                  <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-sm shadow-blue-500/20">
                    <Mail size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                        Email Address
                      </p>
                      <button
                        onClick={handleCopyEmail}
                        className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
                        title="Copy email"
                      >
                        {copiedEmail ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                        {copiedEmail ? "Copied!" : "Copy"}
                      </button>
                    </div>
                    <p className="mt-0.5 text-sm font-bold text-slate-900 truncate">
                      {userDetails?.email || "Not specified"}
                    </p>
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-start gap-3.5 rounded-xl border border-blue-100 bg-slate-50/80 p-4 transition-all hover:border-blue-300 hover:bg-blue-50/40">
                  <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-sm shadow-blue-500/20">
                    <Phone size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                      Phone Number
                    </p>
                    <p className="mt-0.5 text-sm font-bold text-slate-900">
                      {userDetails?.phone || "Not specified"}
                    </p>
                  </div>
                </div>

                {/* Location */}
                <div className="flex items-start gap-3.5 rounded-xl border border-blue-100 bg-slate-50/80 p-4 transition-all hover:border-blue-300 hover:bg-blue-50/40">
                  <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-sm shadow-blue-500/20">
                    <MapPin size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                      Location &amp; Country
                    </p>
                    <p className="mt-0.5 text-sm font-bold text-slate-900">
                      {userDetails?.location || "Not specified"}{" "}
                      {userDetails?.country ? `(${userDetails.country})` : ""}
                    </p>
                  </div>
                </div>

                {/* Date of Birth & Gender */}
                <div className="flex items-start gap-3.5 rounded-xl border border-blue-100 bg-slate-50/80 p-4 transition-all hover:border-blue-300 hover:bg-blue-50/40">
                  <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-sm shadow-blue-500/20">
                    <Calendar size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                      Date of Birth &middot; Gender
                    </p>
                    <p className="mt-0.5 text-sm font-bold text-slate-900">
                      {userDetails?.dateOfBirth || "Not specified"}
                      {userDetails?.gender ? ` • ${userDetails.gender}` : ""}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. Professional Details & Skills */}
          {(activeTab === "all" || activeTab === "professional") && (
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-blue-900 mb-3.5 flex items-center gap-2">
                <Briefcase size={14} className="text-blue-600" />
                <span>Professional Experience &amp; Skills</span>
              </h3>
              <div className="grid gap-3.5 sm:grid-cols-2">
                {/* Profession / Role */}
                <div className="flex items-start gap-3.5 rounded-xl border border-blue-100 bg-slate-50/80 p-4 transition-all hover:border-blue-300 hover:bg-blue-50/40">
                  <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-blue-700 to-blue-800 text-white shadow-sm shadow-blue-500/20">
                    <Briefcase size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                      Target Role / Profession
                    </p>
                    <p className="mt-0.5 text-sm font-bold text-slate-900">
                      {userDetails?.profession || "Not specified"}
                    </p>
                  </div>
                </div>

                {/* Company */}
                <div className="flex items-start gap-3.5 rounded-xl border border-blue-100 bg-slate-50/80 p-4 transition-all hover:border-blue-300 hover:bg-blue-50/40">
                  <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-blue-700 to-blue-800 text-white shadow-sm shadow-blue-500/20">
                    <Building size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                      Current / Past Company
                    </p>
                    <p className="mt-0.5 text-sm font-bold text-slate-900">
                      {userDetails?.company || "Not specified"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Skills Badges */}
              {skillsList.length > 0 && (
                <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-blue-900 mb-2.5 flex items-center gap-1.5">

                    Verified Candidate Competencies ({skillsList.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {skillsList.map((skill, index) => (
                      <span
                        key={index}
                        className="rounded-lg bg-blue-100 border border-blue-200 text-blue-900 px-3 py-1 text-xs font-bold shadow-sm"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3. Education & Online Profiles */}
          {(activeTab === "all" || activeTab === "education") && (
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-blue-900 mb-3.5 flex items-center gap-2">
                <GraduationCap size={14} className="text-blue-600" />
                <span>Education &amp; External Profiles</span>
              </h3>
              <div className="grid gap-3.5 sm:grid-cols-2">
                {/* Degree & Education */}
                <div className="flex items-start gap-3.5 rounded-xl border border-blue-100 bg-slate-50/80 p-4 transition-all hover:border-blue-300 hover:bg-blue-50/40">
                  <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-blue-700 text-white shadow-sm shadow-indigo-500/20">
                    <GraduationCap size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                      Education &amp; Degree
                    </p>
                    <p className="mt-0.5 text-sm font-bold text-slate-900">
                      {userDetails?.education || "Not specified"}
                    </p>
                  </div>
                </div>

                {/* University & Grad Year */}
                <div className="flex items-start gap-3.5 rounded-xl border border-blue-100 bg-slate-50/80 p-4 transition-all hover:border-blue-300 hover:bg-blue-50/40">
                  <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-blue-700 text-white shadow-sm shadow-indigo-500/20">
                    <Calendar size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                      University &middot; Graduation Year
                    </p>
                    <p className="mt-0.5 text-sm font-bold text-slate-900">
                      {userDetails?.university || "Not specified"}{" "}
                      {userDetails?.graduationYear ? `(${userDetails.graduationYear})` : ""}
                    </p>
                  </div>
                </div>

                {/* LinkedIn Link */}
                {userDetails?.linkedin && (
                  <div className="flex items-start gap-3.5 rounded-xl border border-blue-100 bg-slate-50/80 p-4 transition-all hover:border-blue-300 hover:bg-blue-50/40">
                    <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#0077b5] text-white shadow-sm">
                      <LinkedinIcon size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                        LinkedIn Profile
                      </p>
                      <a
                        href={
                          userDetails.linkedin.startsWith("http")
                            ? userDetails.linkedin
                            : `https://${userDetails.linkedin}`
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="mt-0.5 inline-flex items-center gap-1 text-sm font-bold text-blue-600 hover:text-blue-800 hover:underline truncate"
                      >
                        <span>{userDetails.linkedin}</span>
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>
                )}

                {/* GitHub Link */}
                {userDetails?.github && (
                  <div className="flex items-start gap-3.5 rounded-xl border border-blue-100 bg-slate-50/80 p-4 transition-all hover:border-blue-300 hover:bg-blue-50/40">
                    <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-900 text-white shadow-sm">
                      <GithubIcon size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                        GitHub Profile
                      </p>
                      <a
                        href={
                          userDetails.github.startsWith("http")
                            ? userDetails.github
                            : `https://${userDetails.github}`
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="mt-0.5 inline-flex items-center gap-1 text-sm font-bold text-slate-900 hover:underline truncate"
                      >
                        <span>{userDetails.github}</span>
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>
                )}

                {/* Website Link */}
                {userDetails?.website && (
                  <div className="flex items-start gap-3.5 rounded-xl border border-blue-100 bg-slate-50/80 p-4 transition-all hover:border-blue-300 hover:bg-blue-50/40 sm:col-span-2">
                    <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm">
                      <Globe size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                        Portfolio / Personal Website
                      </p>
                      <a
                        href={
                          userDetails.website.startsWith("http")
                            ? userDetails.website
                            : `https://${userDetails.website}`
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="mt-0.5 inline-flex items-center gap-1 text-sm font-bold text-blue-600 hover:underline truncate"
                      >
                        <span>{userDetails.website}</span>
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {!userDetails && (
            <div className="text-center py-12">
              <p className="text-slate-500 font-medium">
                No candidate details found. Please register or sign in to view your verified
                dossier.
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-200 bg-white px-6 sm:px-8 py-4 gap-3">
          <div className="text-xs text-slate-600 font-medium flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Profile stored in MongoDB &middot; Verified for Voice Screening</span>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={onClose}
              className={`${btnSecondary} px-5 py-2.5 text-xs font-bold cursor-pointer`}
            >
              Close
            </button>
            <Link
              href="/interview"
              onClick={onClose}
              className={`${btnPrimary} px-5 py-2.5 text-xs font-bold`}
            >
              <span>Launch Voice Interview</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
