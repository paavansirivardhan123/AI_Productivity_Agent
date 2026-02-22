import Link from "next/link";
import {
  MessageSquare,
  Calendar,
  FileText,
  ArrowUpRight,
  Sparkles,
  Check,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  const features = [
    {
      icon: MessageSquare,
      title: "AI Chat Assistant",
      desc: "Streaming conversations, voice input, file uploads.",
      span: "col-span-1",
    },
    {
      icon: Calendar,
      title: "Smart Scheduler",
      desc: "Day-wise plans. Google Calendar sync (Premium).",
      span: "col-span-1",
    },
    {
      icon: FileText,
      title: "Document AI",
      desc: "Summarize, Q&A, generate study material.",
      span: "col-span-2 md:col-span-1",
    },
  ];

  const plans = [
    {
      name: "Free",
      price: "$0",
      desc: "Get started",
      features: ["AI Chat", "Basic Scheduler", "5 chats/day", "Docs (5MB)"],
      cta: "Get Started",
      featured: false,
    },
    {
      name: "Premium",
      price: "$19",
      period: "/mo",
      desc: "Power users",
      features: ["Unlimited Chat", "Calendar Sync", "Advanced Scheduler", "Unlimited docs", "Priority support"],
      cta: "Upgrade",
      featured: true,
    },
  ];

  return (
    <div className="min-h-screen grain">
      {/* Nav – minimal, floating */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="rounded-xl bg-primary/90 p-2 shadow-lg shadow-primary/20 transition group-hover:shadow-primary/30">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-semibold tracking-tight">
              ProdAgent
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="font-medium rounded-lg">
                Log in
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm" className="rounded-lg font-medium shadow-lg shadow-primary/25 hover:shadow-primary/35">
                Sign up
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero – editorial, asymmetric */}
      <section className="relative gradient-orb pt-32 pb-24 px-6 overflow-hidden">
        <div className="absolute top-1/4 -right-32 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-72 h-72 rounded-full bg-primary/5 blur-3xl" />
        <div className="relative mx-auto max-w-5xl">
          <div className="max-w-3xl">
            <p className="text-sm font-medium text-primary uppercase tracking-widest mb-4">
              AI-Powered Productivity
            </p>
            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold tracking-tight leading-[1.1]">
              Your workspace,{" "}
              <span className="text-primary">smarter.</span>
            </h1>
            <p className="mt-8 text-lg text-muted-foreground max-w-xl leading-relaxed">
              Chat with AI, plan your schedule, process documents—all in one place.
              Built for learners and professionals who move fast.
            </p>
            <div className="mt-12 flex flex-wrap gap-4">
              <Link href="/register">
                <Button
                  size="lg"
                  className="gap-2 rounded-xl px-8 text-base font-medium shadow-xl shadow-primary/30 hover:shadow-primary/40 transition-shadow"
                >
                  Start for free
                  <ArrowUpRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-xl px-8 text-base font-medium border-2"
                >
                  Sign in
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features – bento grid */}
      <section className="py-24 px-6">
        <div className="mx-auto max-w-6xl">
          <p className="font-display text-3xl sm:text-4xl font-semibold tracking-tight max-w-2xl">
            Everything you need to stay productive.
          </p>
          <p className="mt-4 text-muted-foreground max-w-xl">
            One workspace. Three powerful tools.
          </p>
          <div className="mt-16 grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className={`group rounded-2xl bg-card/80 backdrop-blur border p-6 sm:p-8 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 ${f.span}`}
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-6 group-hover:bg-primary/20 transition-colors">
                  <f.icon className="h-7 w-7" strokeWidth={1.5} />
                </div>
                <h3 className="font-display text-xl font-semibold tracking-tight mb-2">
                  {f.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing – side-by-side, editorial */}
      <section className="py-24 px-6 bg-muted/40">
        <div className="mx-auto max-w-5xl">
          <p className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
            Simple pricing.
          </p>
          <p className="mt-4 text-muted-foreground">
            No hidden fees. Cancel anytime.
          </p>
          <div className="mt-16 grid md:grid-cols-2 gap-8">
            {plans.map((p) => (
              <div
                key={p.name}
                className={`relative rounded-3xl p-8 sm:p-10 transition-all duration-300 ${
                  p.featured
                    ? "bg-primary text-primary-foreground shadow-2xl shadow-primary/25 scale-[1.02]"
                    : "bg-card border"
                }`}
              >
                {p.featured && (
                  <div className="absolute -top-3 right-8 flex items-center gap-1 rounded-full bg-white/20 px-4 py-1.5 text-xs font-medium backdrop-blur">
                    <Zap className="h-3.5 w-3.5" /> Most popular
                  </div>
                )}
                <h3 className="font-display text-2xl font-semibold">{p.name}</h3>
                <p className={`mt-1 text-sm ${p.featured ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                  {p.desc}
                </p>
                <p className="mt-6 font-display text-4xl font-bold">
                  {p.price}
                  {p.period && (
                    <span className="text-lg font-normal opacity-80">{p.period}</span>
                  )}
                </p>
                <ul className="mt-8 space-y-4">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-3 text-sm">
                      <Check
                        className={`h-5 w-5 shrink-0 ${p.featured ? "text-primary-foreground" : "text-primary"}`}
                      />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href={p.featured ? "/register?plan=premium" : "/register"} className="block mt-10">
                  <Button
                    className={`w-full rounded-xl py-6 text-base font-medium ${
                      p.featured
                        ? "bg-white text-primary hover:bg-white/90"
                        : ""
                    }`}
                    variant={p.featured ? "default" : "outline"}
                  >
                    {p.cta}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-6 bg-muted/30">
        <div className="mx-auto max-w-6xl">
          <p className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
            What users say
          </p>
          <p className="mt-4 text-muted-foreground max-w-xl">
            Trusted by productivity-focused professionals.
          </p>
          <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                quote: "ProdAgent transformed how I plan my week. The scheduler is incredibly smart.",
                name: "Sarah Chen",
                role: "Product Designer",
              },
              {
                quote: "Document summaries save me hours. I can digest reports in minutes now.",
                name: "Marcus Johnson",
                role: "Consultant",
              },
              {
                quote: "The AI chat feels like having a productivity coach available 24/7.",
                name: "Elena Rodriguez",
                role: "Software Engineer",
              },
            ].map((t) => (
              <div
                key={t.name}
                className="rounded-2xl border-2 bg-card p-6 sm:p-8"
              >
                <p className="text-muted-foreground leading-relaxed">&quot;{t.quote}&quot;</p>
                <p className="mt-6 font-medium">{t.name}</p>
                <p className="text-sm text-muted-foreground">{t.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA – full width, striking */}
      <section className="py-24 px-6">
        <div className="mx-auto max-w-4xl text-center">
          <div className="rounded-3xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-12 sm:p-16 border">
            <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
              Ready to work smarter?
            </h2>
            <p className="mt-4 text-muted-foreground text-lg max-w-xl mx-auto">
              Join thousands who already use ProdAgent daily.
            </p>
            <Link href="/register" className="inline-block mt-8">
              <Button
                size="lg"
                className="rounded-xl px-10 text-base font-medium glow-ring"
              >
                Create free account
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-10 px-6">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row justify-between items-center gap-4">
          <span className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} ProdAgent
          </span>
          <div className="flex gap-8 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">
              Privacy
            </a>
            <a href="#" className="hover:text-foreground transition-colors">
              Terms
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
