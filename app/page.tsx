import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Headphones,
  Mic,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { btnPrimary, btnSecondary, card } from "@/lib/ui";

const features = [
  {
    icon: Mic,
    title: "Voice-Based Assessment",
    description: "Answer questions naturally using your voice with automatic transcription.",
  },
  {
    icon: Clock,
    title: "Quick & Efficient",
    description: "Complete the entire assessment in just 5-10 minutes with streamlined questions.",
  },
  {
    icon: ShieldCheck,
    title: "Secure & Private",
    description: "Your responses are encrypted and stored securely with enterprise-grade protection.",
  },
];

const requirements = [
  {
    icon: Headphones,
    title: "Working Microphone",
    description: "Ensure your microphone is functioning and browser permissions are granted.",
  },
  {
    icon: Zap,
    title: "Stable Internet",
    description: "A reliable connection ensures smooth recording and real-time transcription.",
  },
  {
    icon: Users,
    title: "Quiet Environment",
    description: "Choose a distraction-free space for the best audio quality and results.",
  },
];

const steps = [
  { number: "01", title: "Enter Details", description: "Provide your name to begin the session" },
  { number: "02", title: "System Check", description: "Verify your microphone and audio setup" },
  { number: "03", title: "Answer Questions", description: "Respond to screening questions by voice" },
  { number: "04", title: "Complete Assessment", description: "Review and submit your responses" },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-slate-200/50 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/20">
              <ShieldCheck size={22} aria-hidden="true" />
            </span>
            <div>
              <p className="font-display text-base font-bold text-slate-900">TalentIQ</p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-600">Assessment Portal</p>
            </div>
          </div>
          <Link
            href="/interview"
            className={btnSecondary}
          >
            Begin Assessment
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-indigo-50 opacity-50" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
              <Sparkles size={16} className="text-blue-600" />
              AI-Powered Voice Assessment
            </div>
            <h1 className="mt-8 font-display text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Candidate Interview
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                {" "}Assessment
              </span>
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-slate-600 sm:text-xl">
              Experience the future of candidate screening with our voice-based assessment platform. 
              Answer questions naturally while AI transcribes and analyzes your responses in real-time.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/interview"
                className={`${btnPrimary} px-8 py-4 text-base shadow-xl shadow-blue-500/25 hover:shadow-blue-500/30`}
              >
                Start Assessment <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <Link
                href="#how-it-works"
                className={`${btnSecondary} px-8 py-4 text-base`}
              >
                Learn More
              </Link>
            </div>
            
            {/* Stats */}
            <div className="mt-16 grid grid-cols-3 gap-8 border-t border-slate-200 pt-8">
              <div>
                <p className="font-display text-3xl font-bold text-slate-900">5-10</p>
                <p className="mt-1 text-sm text-slate-600">Minutes</p>
              </div>
              <div>
                <p className="font-display text-3xl font-bold text-slate-900">4</p>
                <p className="mt-1 text-sm text-slate-600">Questions</p>
              </div>
              <div>
                <p className="font-display text-3xl font-bold text-slate-900">100%</p>
                <p className="mt-1 text-sm text-slate-600">Secure</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Why Choose Our Platform?
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Our voice-based assessment platform provides a modern, efficient, and secure way to evaluate candidates.
            </p>
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className={`${card} group relative overflow-hidden p-8 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div className="relative">
                  <span className="grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25">
                    <feature.icon size={28} aria-hidden="true" />
                  </span>
                  <h3 className="mt-6 font-display text-xl font-bold text-slate-900">{feature.title}</h3>
                  <p className="mt-3 text-base leading-relaxed text-slate-600">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-slate-50 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              How It Works
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Complete your assessment in four simple steps
            </p>
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => (
              <div key={step.number} className="relative">
                <div className="text-center">
                  <span className="inline-flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-2xl font-bold text-white shadow-lg shadow-blue-500/25">
                    {step.number}
                  </span>
                  <h3 className="mt-6 font-display text-lg font-bold text-slate-900">{step.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{step.description}</p>
                </div>
                {index < steps.length - 1 && (
                  <div className="absolute top-8 left-[calc(50%+2rem)] hidden h-0.5 w-16 bg-gradient-to-r from-blue-300 to-transparent lg:block" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Requirements Section */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Requirements
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Ensure you have everything ready for a smooth assessment experience
            </p>
          </div>
          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {requirements.map((req) => (
              <div
                key={req.title}
                className={`${card} flex items-start gap-4 p-6 transition-all duration-300 hover:shadow-lg`}
              >
                <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-600">
                  <req.icon size={24} aria-hidden="true" />
                </span>
                <div>
                  <h3 className="font-display text-base font-bold text-slate-900">{req.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{req.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-br from-[#0a2540] to-[#12457a] py-20 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to Begin Your Assessment?
          </h2>
          <p className="mt-4 text-lg text-blue-100">
            Start your voice-based interview assessment now and showcase your skills professionally.
          </p>
          <Link
            href="/interview"
            className={`${btnPrimary} mt-8 inline-flex bg-white px-8 py-4 text-base !text-[#0a2540] hover:!bg-blue-50 shadow-xl`}
          >
            Start Assessment <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-3">
              <span className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 text-white">
                <ShieldCheck size={18} aria-hidden="true" />
              </span>
              <div>
                <p className="font-display text-sm font-bold text-slate-900">TalentIQ</p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-600">Assessment Portal</p>
              </div>
            </div>
            <p className="text-sm text-slate-600">
              Built with Next.js, MongoDB, and AI-powered voice technology
            </p>
          </div>
          <div className="mt-8 border-t border-slate-200 pt-8 text-center text-sm text-slate-500">
            <p>&copy; {new Date().getFullYear()} TalentIQ. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
