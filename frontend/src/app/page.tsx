"use client";

import Link from "next/link";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useEffect, useRef } from "react";
import {
  ArrowRight,
  Telescope,
  Radio,
  GitBranch,
  PhoneCall,
  Gauge,
  Search,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { Reveal } from "@/components/landing/Reveal";
import { ProductsMenu } from "@/components/landing/ProductsMenu";
import {
  HeroMockup,
  SearchMockup,
  SignalsMockup,
  EmailMockup,
  DialerMockup,
  ScoreMockup,
} from "@/components/landing/mockups";

const EASE = [0.22, 1, 0.36, 1] as const;

interface Feature {
  id: string;
  icon: typeof Telescope;
  kicker: string;
  title: string;
  body: string;
  bullets: string[];
  visual: () => React.JSX.Element;
}

const FEATURES: Feature[] = [
  {
    id: "prospecting",
    icon: Telescope,
    kicker: "Prospecting",
    title: "The buyers are already out there",
    body:
      "Describe who you sell to in plain English. RevenueOS reads the live web the way a great rep would — researching every match and ranking them by real intent. The opportunities aren't hidden. We just stop letting them go ignored.",
    bullets: ["Natural-language ICP search", "Fresh, researched matches", "Ranked by fit + intent"],
    visual: SearchMockup,
  },
  {
    id: "signals",
    icon: Radio,
    kicker: "Signals",
    title: "Hear the moment they're ready",
    body:
      "Hiring spikes, fresh funding, new execs, product launches, pricing changes. These are buyers broadcasting that they're in motion. RevenueOS listens around the clock and surfaces each signal the instant it happens — so every touch has a reason.",
    bullets: ["Always-on signal listening", "Confidence-scored triggers", "Mapped to the right angle"],
    visual: SignalsMockup,
  },
  {
    id: "sequences",
    icon: GitBranch,
    kicker: "Outreach",
    title: "Say something only you could say",
    body:
      "Personalized emails, LinkedIn notes, and call openers grounded in what actually changed this week. The research is done for you — so the words you send sound like a human who noticed, not a template that didn't.",
    bullets: ["Grounded in real signals", "Multi-step sequences", "Approve once, run hands-free"],
    visual: EmailMockup,
  },
  {
    id: "copilot",
    icon: PhoneCall,
    kicker: "Call copilot",
    title: "Be fully present on the call",
    body:
      "Live transcription with real-time battlecards means you stop scrambling for notes and start actually listening. When a prospect pushes back, the next best move is already on screen — so you can focus on the person, not the prep.",
    bullets: ["Real-time transcription", "Objection battlecards", "Captured automatically"],
    visual: DialerMockup,
  },
  {
    id: "prioritization",
    icon: Gauge,
    kicker: "Prioritization",
    title: "Know which one matters right now",
    body:
      "Fit, intent, timing and risk roll into a single priority score, so you never wonder where to spend the day. Every signal, call and reply feeds one memory that keeps getting smarter — and keeps pointing you at the account that's ready today.",
    bullets: ["Composite priority score", "Daily ranked leaderboard", "Memory that compounds"],
    visual: ScoreMockup,
  },
];

const STEPS = [
  {
    n: "01",
    title: "Describe who you sell to",
    body: "Type a company or describe your ICP. RevenueOS listens to the live web in seconds and brings back researched, ranked matches — no list-buying, no scraping setup.",
  },
  {
    n: "02",
    title: "We surface why now",
    body: "Open any account to find the live signals, a priority score, the decision-makers, and a one-line reason to reach out today. You skip the research and keep the insight.",
  },
  {
    n: "03",
    title: "You do the human part",
    body: "Reach out with words that land, run the call with a live copilot, and let every reply sharpen the next recommendation. We handle the listening so you can handle the connecting.",
  },
];


export default function Landing() {
  const reduce = useReducedMotion();
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const mockY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -60]);

  // Enable smooth anchor scrolling on the document scroll element without
  // editing globals.css (owned elsewhere). Respect reduced-motion.
  useEffect(() => {
    if (reduce) return;
    const root = document.documentElement;
    const prev = root.style.scrollBehavior;
    root.style.scrollBehavior = "smooth";
    return () => {
      root.style.scrollBehavior = prev;
    };
  }, [reduce]);

  return (
    <div className="relative z-10 min-h-screen scroll-smooth overflow-x-hidden">
      {/* ---------------- Nav ---------------- */}
      <header className="sticky top-0 z-40 px-4 pt-3">
        <div className="glass-strong mx-auto flex h-14 max-w-6xl items-center justify-between rounded-full px-5 shadow-sm">
          <Link href="/" className="font-display text-xl tracking-tight">
            Revenue<span className="text-[var(--color-accent)]">OS</span>
          </Link>
          <nav className="hidden items-center gap-7 md:flex">
            <ProductsMenu />
            <a href="#how" className="text-sm text-[var(--color-ink-2)] transition-colors hover:text-[var(--color-ink)]">
              How it works
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden text-sm text-[var(--color-ink-2)] transition-colors hover:text-[var(--color-ink)] sm:block">
              Sign in
            </Link>
            <Link href="/signup" className="btn btn-primary rounded-full px-4 py-2 text-sm">
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* ---------------- Hero ---------------- */}
      <section ref={heroRef} id="product" className="relative mx-auto max-w-6xl px-6 pb-20 pt-16 sm:pt-24">
        <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_1fr]">
          <motion.div
            className="min-w-0"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 18 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE }}
          >
            <div className="pill mb-6">
              <Sparkles size={12} className="text-[var(--color-accent)]" />
              GTM intelligence that listens
            </div>
            <h1 className="font-display text-[2.7rem] leading-[0.96] tracking-tight sm:text-[4rem]">
              Your next customer is{" "}
              <span className="text-[var(--color-accent)]">already telling</span> the internet
              they&rsquo;re ready to buy.
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-relaxed text-[var(--color-ink-2)] sm:text-xl">
              Most sales teams never hear it. RevenueOS is the system that listens — catching the
              buying signals companies are already broadcasting, so your reps spend their time
              closing instead of digging.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link href="/signup" className="btn btn-accent px-6 py-3 text-base">
                Get started <ArrowRight size={16} />
              </Link>
              <Link href="/login" className="btn btn-ghost px-6 py-3 text-base">
                See it live
              </Link>
            </div>
            <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-2">
              {["Always-on signal listening", "Knowledge-graph memory", "Real-time call copilot"].map((t) => (
                <span key={t} className="flex items-center gap-1.5 text-sm text-[var(--color-ink-soft)]">
                  <CheckCircle2 size={14} className="text-[var(--color-positive)]" />
                  {t}
                </span>
              ))}
            </div>
          </motion.div>

          <motion.div style={{ y: mockY }} className="flex min-w-0 justify-center lg:justify-end">
            <motion.div
              initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 24 }}
              animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.15, ease: EASE }}
            >
              <HeroMockup />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ---------------- Trust strip ---------------- */}
      <section className="border-y border-[var(--color-line)] bg-[var(--color-paper-2)]/50">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <Reveal>
            <p className="kicker mb-5 text-center">Built for modern revenue teams</p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <span
                  key={i}
                  className="h-7 w-28 rounded-full bg-[rgba(255,255,255,0.4)] border border-[var(--glass-border)] backdrop-blur-[8px] [backdrop-filter:blur(8px)_saturate(140%)]"
                />
              ))}
            </div>
            <p className="kicker text-center mt-4 text-[var(--color-faint)]">Customer logos — coming soon</p>
          </Reveal>
        </div>
      </section>

      {/* ---------------- Manifesto / vision band ---------------- */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 h-[28rem] w-[44rem] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(229,67,15,0.10), rgba(229,67,15,0.02) 60%, transparent 74%)",
          }}
        />
        <div className="relative mx-auto max-w-4xl px-6 py-28 text-center sm:py-36">
          <Reveal>
            <div className="kicker mb-7">Our belief</div>
            <p className="font-display text-[2rem] leading-[1.12] tracking-tight sm:text-[3.2rem]">
              Companies don&rsquo;t have a lead problem.
              <br className="hidden sm:block" />{" "}
              They have an{" "}
              <span className="text-[var(--color-accent)]">attention</span> problem.
            </p>
          </Reveal>
          <Reveal delay={0.12}>
            <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-[var(--color-ink-2)] sm:text-xl">
              The signals are already out there, broadcast on the open web every day. The best
              opportunities aren&rsquo;t hidden — they&rsquo;re ignored. RevenueOS does the
              listening so your people can do what software never will:{" "}
              <span className="text-[var(--color-ink)]">build the relationship and close the deal.</span>
            </p>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mx-auto mt-7 font-display text-xl italic leading-snug text-[var(--color-ink-soft)] sm:text-2xl">
              We give salespeople their time and attention back, so selling can be human again.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ---------------- Features (alternating) ---------------- */}
      <section id="features" className="mx-auto max-w-6xl px-6 pb-8">
        <Reveal className="mb-16">
          <div className="kicker mb-3">What it does</div>
          <h2 className="font-display text-4xl tracking-tight sm:text-5xl">
            Sales teams don&rsquo;t need more leads.
            <br className="hidden sm:block" /> They need to know which one matters right now.
          </h2>
        </Reveal>

        <div className="space-y-24 sm:space-y-32">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            const Visual = f.visual;
            const flip = i % 2 === 1;
            return (
              <div key={f.title} id={f.id} className="relative grid scroll-mt-24 items-center gap-12 lg:grid-cols-2">
                {f.id === "prioritization" && (
                  <span id="memory" aria-hidden className="absolute -top-24 left-0 h-0 w-0" />
                )}
                <Reveal className={`min-w-0 ${flip ? "lg:order-2" : ""}`} delay={0.05}>
                  <div className="flex items-center gap-2">
                    <span
                      className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)]"
                      style={{ background: "var(--color-accent-soft)" }}
                    >
                      <Icon size={17} className="text-[var(--color-accent)]" strokeWidth={1.9} />
                    </span>
                    <span className="kicker">{f.kicker}</span>
                  </div>
                  <h3 className="mt-5 font-display text-3xl leading-tight tracking-tight sm:text-[2.6rem]">
                    {f.title}
                  </h3>
                  <p className="mt-4 max-w-lg text-[1.05rem] leading-relaxed text-[var(--color-ink-2)]">
                    {f.body}
                  </p>
                  <ul className="mt-6 space-y-2.5">
                    {f.bullets.map((b) => (
                      <li key={b} className="flex items-center gap-2.5 text-[0.95rem] text-[var(--color-ink-soft)]">
                        <CheckCircle2 size={16} className="shrink-0 text-[var(--color-accent)]" />
                        {b}
                      </li>
                    ))}
                  </ul>
                </Reveal>

                <Reveal className={`flex min-w-0 justify-center ${flip ? "lg:order-1 lg:justify-start" : "lg:justify-end"}`} delay={0.12}>
                  <Visual />
                </Reveal>
              </div>
            );
          })}
        </div>
      </section>

      {/* ---------------- How it works ---------------- */}
      <section id="how" className="mt-28 border-t border-[var(--color-line)] bg-[var(--color-paper-2)]/50">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <Reveal className="mb-14">
            <div className="kicker mb-3">How it works</div>
            <h2 className="font-display text-4xl tracking-tight sm:text-5xl">
              We do the listening. You do the connecting.
            </h2>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-[var(--color-ink-2)]">
              Three steps from a blank cursor to a real conversation. No data setup, no spreadsheets,
              no hours lost to research — just the signals that matter and the time to act on them.
            </p>
          </Reveal>

          <div className="grid gap-6 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={0.08 * i}>
                <div className="glass h-full rounded-[var(--radius-lg)] p-7">
                  <div className="numeral mb-4 text-5xl text-[var(--color-accent)]">{s.n}</div>
                  <h3 className="font-display text-2xl tracking-tight">{s.title}</h3>
                  <p className="mt-3 text-[0.95rem] leading-relaxed text-[var(--color-ink-soft)]">{s.body}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.1} className="mt-10">
            <div className="glass flex flex-wrap items-center gap-3 rounded-full px-5 py-3">
              <Search size={15} className="text-[var(--color-accent)]" />
              <span className="text-sm text-[var(--color-ink-soft)]">
                Try it like this:
              </span>
              <span className="font-mono text-[0.82rem] text-[var(--color-ink-2)]">
                “Series B fintechs that just hired a Head of Sales”
              </span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------------- CTA band ---------------- */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <Reveal>
          <div className="glass-strong relative overflow-hidden rounded-[var(--radius-lg)] px-8 py-16 text-center shadow-xl sm:px-16 sm:py-20">
            <div
              aria-hidden
              className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[36rem] -translate-x-1/2 rounded-full blur-3xl"
              style={{
                background:
                  "radial-gradient(circle, rgba(229,67,15,0.22), rgba(229,67,15,0.04) 60%, transparent 72%)",
              }}
            />
            <h2 className="font-display text-4xl leading-tight tracking-tight sm:text-6xl">
              Stop searching.
              <br className="sm:hidden" /> Start connecting.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-[var(--color-ink-2)]">
              Your next customer is already telling the internet they&rsquo;re ready. RevenueOS surfaces
              them every morning, with a reason to reach out — so your team can spend the day being human.
            </p>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <Link href="/signup" className="btn btn-accent px-7 py-3 text-base">
                Get started <ArrowRight size={16} />
              </Link>
              <Link href="/login" className="btn btn-ghost px-7 py-3 text-base">
                Sign in
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ---------------- Footer ---------------- */}
      <footer className="border-t border-[var(--color-line)]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-10 sm:flex-row">
          <div className="font-display text-lg tracking-tight">
            Revenue<span className="text-[var(--color-accent)]">OS</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            <a href="#features" className="text-sm text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]">
              Features
            </a>
            <a href="#how" className="text-sm text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]">
              How it works
            </a>
            <Link href="/login" className="text-sm text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]">
              Sign in
            </Link>
            <Link href="/signup" className="text-sm text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]">
              Get started
            </Link>
          </div>
          <div className="kicker">© {new Date().getFullYear()} RevenueOS</div>
        </div>
      </footer>
    </div>
  );
}
