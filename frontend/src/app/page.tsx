"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Radio, Telescope, GitBranch, PhoneCall, Brain, Gauge } from "lucide-react";

const FEATURES = [
  { icon: Telescope, title: "Find who's in-market", body: "Describe your ICP in plain English. We search the live web, research every match, and rank them by intent — not a stale list." },
  { icon: Radio, title: "Know why now", body: "Hiring spikes, funding, launches, pricing changes, new execs. Real triggers, surfaced the moment they happen, tied to the right message." },
  { icon: Gauge, title: "Prioritize automatically", body: "A composite score — fit, intent, timing, risk — tells every rep exactly which accounts deserve their time today." },
  { icon: GitBranch, title: "Outreach that writes itself", body: "Hyper-personalized emails, LinkedIn notes, and call openers grounded in what actually changed this week — then run on autopilot." },
  { icon: PhoneCall, title: "A copilot on every call", body: "Live transcription with real-time battlecards. When a prospect pushes back, the next best move is already on screen." },
  { icon: Brain, title: "Memory that compounds", body: "Every signal, call, and reply feeds one knowledge graph — so the system reasons over history and gets sharper with every interaction." },
];

const STEPS = [
  ["01", "Point it at an account", "Type a company or an ICP. RevenueOS researches the live web in seconds."],
  ["02", "See why now", "Signals, scores, decision-makers and a one-line reason to reach out — today."],
  ["03", "Act and learn", "Generate outreach, run the call with a copilot, and let every outcome sharpen the next."],
];

export default function Landing() {
  return (
    <div className="relative z-10 min-h-screen">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-[var(--color-line)] bg-[var(--color-paper)]/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="font-display text-2xl tracking-tight">
            Revenue<span className="text-[var(--color-accent)]">OS</span>
          </div>
          <nav className="flex items-center gap-6">
            <a href="#features" className="hidden sm:block text-sm text-[var(--color-ink-2)] hover:text-[var(--color-ink)]">Features</a>
            <a href="#how" className="hidden sm:block text-sm text-[var(--color-ink-2)] hover:text-[var(--color-ink)]">How it works</a>
            <Link href="/login" className="text-sm text-[var(--color-ink-2)] hover:text-[var(--color-ink)]">Sign in</Link>
            <Link href="/signup" className="btn btn-primary">Get started</Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 sm:pt-28">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}>
          <div className="kicker mb-5">The AI-native GTM workspace</div>
          <h1 className="font-display text-[3.4rem] sm:text-[5.5rem] leading-[0.92] tracking-tight max-w-4xl">
            Know who to call,
            <br /> and <span className="text-[var(--color-accent)]">exactly why</span> — today.
          </h1>
          <p className="mt-7 text-lg sm:text-xl text-[var(--color-ink-2)] max-w-2xl leading-relaxed">
            RevenueOS finds high-intent accounts, explains why they matter right now, writes the
            outreach, runs the call with a live copilot, and learns from every interaction. One brain
            for your entire outbound motion.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link href="/signup" className="btn btn-accent text-base px-6 py-3">
              Start free <ArrowRight size={16} />
            </Link>
            <Link href="/login" className="btn btn-ghost text-base px-6 py-3">See it live</Link>
          </div>
          <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-2 kicker">
            <span>Live web intelligence</span><span>·</span>
            <span>Knowledge-graph memory</span><span>·</span>
            <span>Real-time call copilot</span>
          </div>
        </motion.div>
      </section>

      {/* The question band */}
      <section className="border-y border-[var(--color-line)] bg-[var(--color-paper-2)]/40">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <p className="font-display text-2xl sm:text-3xl leading-snug max-w-4xl">
            “Who should I contact today? Why now? What should I say? What happened on the call?
            What next?” <span className="text-[var(--color-ink-soft)]">RevenueOS answers all of them — from one screen.</span>
          </p>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-20">
        <div className="kicker mb-3">What it does</div>
        <h2 className="font-display text-4xl sm:text-5xl tracking-tight mb-12">An unfair advantage, end to end.</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-[var(--color-line)] border border-[var(--color-line)] rounded-[var(--radius)] overflow-hidden">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div key={f.title}
                initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.04 * i }}
                className="bg-[var(--color-card)] p-7">
                <Icon size={22} className="text-[var(--color-accent)] mb-4" strokeWidth={1.8} />
                <h3 className="font-display text-xl mb-2">{f.title}</h3>
                <p className="text-[0.92rem] text-[var(--color-ink-soft)] leading-relaxed">{f.body}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-t border-[var(--color-line)] bg-[var(--color-paper-2)]/40">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="kicker mb-3">How it works</div>
          <h2 className="font-display text-4xl sm:text-5xl tracking-tight mb-12">From cold list to booked meeting.</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map(([n, t, b]) => (
              <div key={n}>
                <div className="numeral text-5xl text-[var(--color-accent)] mb-3">{n}</div>
                <h3 className="font-display text-2xl mb-2">{t}</h3>
                <p className="text-[0.95rem] text-[var(--color-ink-soft)] leading-relaxed">{b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-6 py-24 text-center">
        <h2 className="font-display text-4xl sm:text-6xl tracking-tight">Stop guessing. Start closing.</h2>
        <p className="mt-5 text-lg text-[var(--color-ink-2)] max-w-xl mx-auto">
          Your pipeline is hiding in plain sight on the open web. RevenueOS surfaces it every morning.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/signup" className="btn btn-accent text-base px-7 py-3">Get started free <ArrowRight size={16} /></Link>
        </div>
      </section>

      <footer className="border-t border-[var(--color-line)]">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="font-display text-lg">Revenue<span className="text-[var(--color-accent)]">OS</span></div>
          <div className="kicker">© {new Date().getFullYear()} RevenueOS — The AI-native GTM workspace</div>
        </div>
      </footer>
    </div>
  );
}
