import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Headphones,
  Mic,
  Play,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  Users,
  Zap,
  Award,
  Lock,
  BarChart3,
} from "lucide-react";
import { btnPrimary, btnSecondary, card } from "@/lib/ui";

const features = [
  {
    icon: Mic,
    title: "AI-Powered Voice Analysis",
    description: "Advanced speech recognition technology captures and analyzes your responses with precision.",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    icon: TrendingUp,
    title: "Real-Time Transcription",
    description: "Watch your answers transcribed instantly as you speak, with AI-powered accuracy.",
    gradient: "from-purple-500 to-pink-500",
  },
  {
    icon: ShieldCheck,
    title: "Enterprise Security",
    description: "Bank-grade encryption and secure storage protect your data at every step.",
    gradient: "from-emerald-500 to-teal-500",
  },
];

const benefits = [
  {
    icon: Clock,
    title: "Time Efficient",
    description: "Complete assessments in under 10 minutes with streamlined questions.",
  },
  {
    icon: Star,
    title: "Fair Evaluation",
    description: "Objective AI analysis removes human bias from the screening process.",
  },
  {
    icon: BarChart3,
    title: "Detailed Insights",
    description: "Comprehensive analytics provide deep understanding of candidate capabilities.",
  },
];

const requirements = [
  {
    icon: Headphones,
    title: "Audio Equipment",
    description: "Functional microphone with clear audio quality",
  },
  {
    icon: Zap,
    title: "Stable Connection",
    description: "Reliable internet for seamless recording",
  },
  {
    icon: Users,
    title: "Quiet Space",
    description: "Distraction-free environment for best results",
  },
];

const testimonials = [
  {
    name: "Sarah Johnson",
    role: "HR Director",
    company: "TechCorp Inc.",
    content: "This platform revolutionized our hiring process. The AI voice assessments are incredibly accurate and save us hours of time.",
    rating: 5,
  },
  {
    name: "Michael Chen",
    role: "Recruitment Lead",
    company: "InnovateLabs",
    content: "The professional design and ease of use made implementation seamless. Candidates love the modern experience.",
    rating: 5,
  },
];

const stats = [
  { value: "98%", label: "Accuracy Rate" },
  { value: "50K+", label: "Assessments" },
  { value: "200+", label: "Companies" },
  { value: "4.9/5", label: "User Rating" },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-slate-200/50 bg-white/80 backdrop-blur-xl transition-all duration-300">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="relative">
              <span className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 text-white shadow-xl shadow-blue-500/30">
                <ShieldCheck size={26} aria-hidden="true" />
              </span>
              <div className="absolute -top-1 -right-1 size-3 rounded-full bg-emerald-500 ring-2 ring-white" />
            </div>
            <div>
              <p className="font-display text-lg font-bold tracking-tight text-slate-900">TalentIQ</p>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-600">Assessment Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="#features"
              className="hidden text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 sm:block"
            >
              Features
            </Link>
            <Link
              href="#how-it-works"
              className="hidden text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 sm:block"
            >
              How It Works
            </Link>
            <Link
              href="/interview"
              className={`${btnPrimary} px-6 py-2.5 text-sm shadow-lg shadow-blue-500/25 hover:shadow-blue-500/30`}
            >
              Start Assessment
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50/50">
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 size-96 rounded-full bg-blue-400/10 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 size-96 rounded-full bg-indigo-400/10 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[800px] rounded-full bg-gradient-to-r from-blue-100/20 to-indigo-100/20 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8 lg:py-40">
          <div className="mx-auto max-w-4xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/80 px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm backdrop-blur-sm fade-up">
              <Sparkles size={16} className="text-blue-600" />
              <span>AI-Powered Voice Assessment Platform</span>
            </div>
            
            <h1 className="mt-8 font-display text-5xl font-bold tracking-tight text-slate-900 sm:text-6xl lg:text-7xl fade-up" style={{ animationDelay: '0.1s' }}>
              Transform Your
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                {" "}Hiring Process
              </span>
            </h1>
            
            <p className="mt-6 text-xl leading-relaxed text-slate-600 sm:text-2xl fade-up" style={{ animationDelay: '0.2s' }}>
              Experience the future of candidate screening with our advanced voice-based assessment platform. 
              AI-powered transcription and analysis deliver accurate, unbiased evaluations in minutes.
            </p>
            
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row fade-up" style={{ animationDelay: '0.3s' }}>
              <Link
                href="/interview"
                className={`${btnPrimary} group relative overflow-hidden px-8 py-4 text-base shadow-xl shadow-blue-500/25 hover:shadow-blue-500/30`}
              >
                <span className="relative z-10 flex items-center gap-2">
                  Start Free Assessment
                  <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-0 transition-opacity group-hover:opacity-100" />
              </Link>
              <Link
                href="#how-it-works"
                className={`${btnSecondary} group flex items-center gap-2 px-8 py-4 text-base`}
              >
                <Play size={18} className="text-blue-600" />
                Watch Demo
              </Link>
            </div>

            {/* Trust indicators */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-slate-500 fade-up" style={{ animationDelay: '0.4s' }}>
              <div className="flex items-center gap-2">
                <Lock size={16} className="text-emerald-600" />
                <span>Bank-Level Security</span>
              </div>
              <div className="flex items-center gap-2">
                <Award size={16} className="text-blue-600" />
                <span>GDPR Compliant</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap size={16} className="text-amber-600" />
                <span>Instant Results</span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="mx-auto mt-20 max-w-5xl fade-up" style={{ animationDelay: '0.5s' }}>
            <div className="grid grid-cols-2 gap-8 rounded-3xl border border-slate-200 bg-white/80 p-8 shadow-xl backdrop-blur-sm sm:grid-cols-4">
              {stats.map((stat, index) => (
                <div key={stat.label} className="text-center">
                  <p className="font-display text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    {stat.value}
                  </p>
                  <p className="mt-2 text-sm font-medium text-slate-600">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
              <Star size={16} />
              Powerful Features
            </div>
            <h2 className="mt-6 font-display text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              Everything You Need
            </h2>
            <p className="mt-4 text-xl text-slate-600">
              Our platform combines cutting-edge AI with intuitive design to deliver exceptional assessment experiences.
            </p>
          </div>

          <div className="mt-20 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className={`${card} group relative overflow-hidden p-8 transition-all duration-500 hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-2 fade-up`}
                style={{ animationDelay: `${index * 0.15}s` }}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 transition-opacity duration-500 group-hover:opacity-5`} />
                <div className="relative">
                  <div className={`inline-flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br ${feature.gradient} text-white shadow-xl shadow-blue-500/25 transition-transform duration-300 group-hover:scale-110`}>
                    <feature.icon size={32} aria-hidden="true" />
                  </div>
                  <h3 className="mt-6 font-display text-xl font-bold text-slate-900">{feature.title}</h3>
                  <p className="mt-3 text-base leading-relaxed text-slate-600">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-gradient-to-br from-slate-50 to-blue-50/30 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-16 lg:grid-cols-2">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
                <TrendingUp size={16} />
                Key Benefits
              </div>
              <h2 className="mt-6 font-display text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
                Why Choose Us?
              </h2>
              <p className="mt-4 text-xl text-slate-600">
                Our platform delivers measurable results that transform your recruitment process.
              </p>
              
              <div className="mt-10 space-y-6">
                {benefits.map((benefit, index) => (
                  <div key={benefit.title} className="flex items-start gap-4 fade-up" style={{ animationDelay: `${(index + 1) * 0.1}s` }}>
                    <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25">
                      <benefit.icon size={24} aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="font-display text-lg font-bold text-slate-900">{benefit.title}</h3>
                      <p className="mt-1 text-base text-slate-600">{benefit.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl transform rotate-3 opacity-10" />
              <div className={`${card} relative p-8 shadow-2xl`}>
                <div className="space-y-6">
                  {testimonials.map((testimonial, index) => (
                    <div key={testimonial.name} className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-6 fade-up" style={{ animationDelay: `${(index + 1) * 0.15}s` }}>
                      <div className="flex items-start gap-4">
                        <div className="grid size-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 text-white font-bold text-lg">
                          {testimonial.name.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-1">
                            {[...Array(testimonial.rating)].map((_, i) => (
                              <Star key={i} size={16} className="fill-amber-400 text-amber-400" />
                            ))}
                          </div>
                          <p className="mt-3 text-base text-slate-700">{testimonial.content}</p>
                          <div className="mt-4">
                            <p className="font-semibold text-slate-900">{testimonial.name}</p>
                            <p className="text-sm text-slate-600">{testimonial.role} at {testimonial.company}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-purple-50 px-4 py-2 text-sm font-semibold text-purple-700">
              <Play size={16} />
              Simple Process
            </div>
            <h2 className="mt-6 font-display text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              How It Works
            </h2>
            <p className="mt-4 text-xl text-slate-600">
              Complete your assessment in four simple steps
            </p>
          </div>

          <div className="mt-20">
            <div className="relative">
              {/* Connection line */}
              <div className="absolute left-8 top-8 bottom-8 w-0.5 bg-gradient-to-b from-blue-500 via-indigo-500 to-purple-500 hidden lg:block" />
              
              <div className="space-y-12 lg:space-y-0">
                {[
                  { number: "01", title: "Enter Your Details", description: "Provide your name and basic information to begin the assessment session", icon: Users },
                  { number: "02", title: "System Check", description: "Verify your microphone and audio equipment are working properly", icon: Headphones },
                  { number: "03", title: "Voice Assessment", description: "Answer screening questions naturally using your voice with AI transcription", icon: Mic },
                  { number: "04", title: "Review & Submit", description: "Review your transcribed responses and submit the completed assessment", icon: CheckCircle2 },
                ].map((step, index) => (
                  <div key={step.number} className="relative lg:grid lg:grid-cols-3 lg:gap-8 lg:items-center fade-up" style={{ animationDelay: `${(index + 1) * 0.1}s` }}>
                    <div className={`lg:text-${index % 2 === 0 ? 'right' : 'left'}`}>
                      <div className="inline-flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-2xl font-bold shadow-xl shadow-blue-500/25 ring-4 ring-white">
                        {step.number}
                      </div>
                    </div>
                    <div className={`mt-6 lg:mt-0 lg:col-span-2 lg:text-${index % 2 === 0 ? 'left' : 'right'}`}>
                      <div className={`${card} p-8 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10`}>
                        <div className="flex items-center gap-3 mb-4">
                          <step.icon size={24} className="text-blue-600" />
                          <h3 className="font-display text-xl font-bold text-slate-900">{step.title}</h3>
                        </div>
                        <p className="text-base text-slate-600">{step.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Requirements Section */}
      <section className="bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 py-24 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-blue-100">
              <Zap size={16} />
              Get Ready
            </div>
            <h2 className="mt-6 font-display text-4xl font-bold tracking-tight sm:text-5xl">
              Before You Start
            </h2>
            <p className="mt-4 text-xl text-blue-100">
              Ensure you have everything ready for the best assessment experience
            </p>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {requirements.map((req, index) => (
              <div
                key={req.title}
                className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm transition-all duration-300 hover:bg-white/10 hover:scale-105 fade-up"
                style={{ animationDelay: `${(index + 1) * 0.1}s` }}
              >
                <div className="grid size-14 place-items-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/25">
                  <req.icon size={28} aria-hidden="true" />
                </div>
                <h3 className="mt-6 font-display text-lg font-bold">{req.title}</h3>
                <p className="mt-2 text-base text-blue-100">{req.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative overflow-hidden py-24 sm:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yIDItNCAyLTRzLTItMi0yLTJ2MmMwIDItMiA0LTQgNHMtNCAyLTQgMnYtMmMwLTItMi00LTItNHMyLTItMi0ydjJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
        
        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="font-display text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Ready to Transform Your Hiring?
          </h2>
          <p className="mt-6 text-xl text-blue-100">
            Join thousands of companies using TalentIQ to make better hiring decisions faster.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/interview"
              className="group relative inline-flex items-center gap-2 rounded-2xl bg-white px-8 py-4 text-base font-bold text-blue-600 shadow-2xl transition-all duration-300 hover:scale-105 hover:shadow-white/25"
            >
              Start Free Assessment
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="#features"
              className="inline-flex items-center gap-2 rounded-2xl border-2 border-white/30 px-8 py-4 text-base font-semibold text-white transition-all duration-300 hover:bg-white/10"
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white">
                  <ShieldCheck size={22} aria-hidden="true" />
                </span>
                <div>
                  <p className="font-display text-base font-bold text-slate-900">TalentIQ</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-600">Assessment Portal</p>
                </div>
              </div>
              <p className="text-sm text-slate-600">
                AI-powered voice assessment platform for modern recruitment.
              </p>
            </div>

            <div>
              <h3 className="font-display text-sm font-bold text-slate-900">Product</h3>
              <ul className="mt-4 space-y-3">
                <li><Link href="#features" className="text-sm text-slate-600 transition-colors hover:text-slate-900">Features</Link></li>
                <li><Link href="#how-it-works" className="text-sm text-slate-600 transition-colors hover:text-slate-900">How It Works</Link></li>
                <li><Link href="/interview" className="text-sm text-slate-600 transition-colors hover:text-slate-900">Start Assessment</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-display text-sm font-bold text-slate-900">Company</h3>
              <ul className="mt-4 space-y-3">
                <li><Link href="#" className="text-sm text-slate-600 transition-colors hover:text-slate-900">About Us</Link></li>
                <li><Link href="#" className="text-sm text-slate-600 transition-colors hover:text-slate-900">Careers</Link></li>
                <li><Link href="#" className="text-sm text-slate-600 transition-colors hover:text-slate-900">Contact</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-display text-sm font-bold text-slate-900">Legal</h3>
              <ul className="mt-4 space-y-3">
                <li><Link href="#" className="text-sm text-slate-600 transition-colors hover:text-slate-900">Privacy Policy</Link></li>
                <li><Link href="#" className="text-sm text-slate-600 transition-colors hover:text-slate-900">Terms of Service</Link></li>
                <li><Link href="#" className="text-sm text-slate-600 transition-colors hover:text-slate-900">Cookie Policy</Link></li>
              </ul>
            </div>
          </div>

          <div className="mt-12 border-t border-slate-200 pt-8">
            <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
              <p className="text-sm text-slate-600">
                &copy; {new Date().getFullYear()} TalentIQ. All rights reserved.
              </p>
              <p className="text-sm text-slate-600">
                Built with Next.js, MongoDB, and AI-powered voice technology
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
