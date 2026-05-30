"use client";

import Link from "next/link";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
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
  icon: typeof Telescope;
  kicker: string;
  title: string;
  body: string;
  bullets: string[];
  visual: () => React.JSX.Element;
}

const FEATURES: Feature[] = [
  {
    icon: Telescope,
    kicker: "Prospecting",
    title: "Find who's actually in-market",
    body:
      "Describe your ideal customer in plain English. RevenueOS searches the live web, researches every match, and ranks them by real intent — not a stale list someone bought two quarters ago.",
    bullets: ["Natural-language ICP search", "Fresh, researched matches", "Ranked by fit + intent"],
    visual: SearchMockup,
  },
  {
    icon: Radio,
    kicker: "Signals",
    title: "Know exactly why now",
    body:
      "Hiring spikes, new funding, product launches, pricing changes, fresh execs. Real buying triggers, surfaced the moment they happen and tied to the right message — so every touch has a reason.",
    bullets: ["Live trigger detection", "Confidence-scored signals", "Mapped to the right angle"],
    visual: SignalsMockup,
  },
  {
    icon: GitBranch,
    kicker: "Outreach",
    title: "Outreach that writes itself",
    body:
      "Hyper-personalized emails, LinkedIn notes, and call openers grounded in what actually changed this week. Approve a sequence and let it run on autopilot — every message earns its send.",
    bullets: ["Grounded in real signals", "Multi-step sequences", "Approve once, run hands-free"],
    visual: EmailMockup,
  },
  {
    icon: PhoneCall,
    kicker: "Call copilot",
    title: "A copilot on every call",
    body:
      "Live transcription with real-time battlecards. When a prospect pushes back, the next best move is already on screen — and every objection makes the playbook sharper for the next call.",
    bullets: ["Real-time transcription", "Objection battlecards", "Captured automatically"],
    visual: DialerMockup,
  },
  {
    icon: Gauge,
    kicker: "Prioritization",
    title: "One score that compounds",
    body:
      "Fit, intent, timing and risk roll into a single priority score, so every rep knows exactly which accounts deserve their time today. Every signal, call and reply feeds one memory that keeps getting smarter.",
    bullets: ["Composite priority score", "Daily ranked leaderboard", "Memory that compounds"],
    visual: ScoreMockup,
  },
];

const STEPS = [
  {
    n: "01",
    title: "Point it at an account",
    body: "Type a company or describe your ICP. RevenueOS researches the live web in seconds and brings back researched, ranked matches — no list-buying, no scraping setup.",
  },
  {
    n: "02",
    title: "See why now",
    body: "Open any account to find live signals, a priority score, the decision-makers, and a one-line reason to reach out today. The 'why now' is written for you.",
  },
  {
    n: "03",
    title: "Act and learn",
    body: "Generate grounded outreach, run the call with a live copilot, and let every reply and outcome sharpen the next recommendation. The system gets better as you use it.",
  },
];

const TRUST = ["Northwind", "Cobalt", "Atlas", "Meridian", "Lumen", "Vertex"];

export default function Landing() {
  const reduce = useReducedMotion();
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const mockY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -60]);

  return (
    <div className="relative z-10 min-h-screen overflow-x-hidden">
      {/* ---------------- Nav ---------------- */}
      <header className="sticky top-0 z-40 px-4 pt-3">
        <div className="glass-strong mx-auto flex h-14 max-w-6xl items-center justify-between rounded-full px-5 shadow-sm">
          <Link href="/" className="font-display text-xl tracking-tight">
            Revenue<span className="text-[var(--color-accent)]">OS</span>
          </Link>
          <nav className="hidden items-center gap-7 md:flex">
            <a href="#product" className="text-sm text-[var(--color-ink-2)] transition-colors hover:text-[var(--color-ink)]">
              Product
            </a>
            <a href="#features" className="text-sm text-[var(--color-ink-2)] transition-colors hover:text-[var(--color-ink)]">
              Features
            </a>
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
              The AI-native GTM workspace
            </div>
            <h1 className="font-display text-[3rem] leading-[0.94] tracking-tight sm:text-[4.4rem]">
              Know who to call,
              <br />
              and <span className="text-[var(--color-accent)]">exactly why</span> — today.
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-relaxed text-[var(--color-ink-2)] sm:text-xl">
              RevenueOS finds high-intent accounts, explains why they matter right now, writes the
              outreach, runs the call with a live copilot, and learns from every interaction. One brain
              for your entire outbound motion.
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
              {["Live web intelligence", "Knowledge-graph memory", "Real-time call copilot"].map((t) => (
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
            <p className="kicker mb-5 text-center">Trusted by modern revenue teams</p>
            <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 opacity-60">
              {TRUST.map((c) => (
                <span key={c} className="font-display text-xl tracking-tight text-[var(--color-ink-soft)]">
                  {c}
                </span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------------- The question band ---------------- */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <Reveal>
          <div className="kicker mb-3">Why RevenueOS</div>
          <p className="font-display text-2xl leading-snug sm:text-4xl">
            “Who should I contact today? Why now? What should I say? What happened on the call? What
            next?”{" "}
            <span className="text-[var(--color-ink-soft)]">
              RevenueOS answers all of them — from one screen.
            </span>
          </p>
        </Reveal>
      </section>

      {/* ---------------- Features (alternating) ---------------- */}
      <section id="features" className="mx-auto max-w-6xl px-6 pb-8">
        <Reveal className="mb-16">
          <div className="kicker mb-3">What it does</div>
          <h2 className="font-display text-4xl tracking-tight sm:text-5xl">
            An unfair advantage, end to end.
          </h2>
        </Reveal>

        <div className="space-y-24 sm:space-y-32">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            const Visual = f.visual;
            const flip = i % 2 === 1;
            return (
              <div key={f.title} className="grid items-center gap-12 lg:grid-cols-2">
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
              From cold list to booked meeting.
            </h2>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-[var(--color-ink-2)]">
              Three steps from a blank cursor to a meeting on the calendar. No data setup, no spreadsheets —
              just research, reasons, and action in one place.
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
              Stop guessing.
              <br className="sm:hidden" /> Start closing.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-[var(--color-ink-2)]">
              Your pipeline is hiding in plain sight on the open web. RevenueOS surfaces it every morning,
              with a reason to reach out and the words to do it.
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
