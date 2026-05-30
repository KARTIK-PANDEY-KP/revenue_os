"use client";

import Link from "next/link";
import {
  Radio,
  TrendingUp,
  Banknote,
  UserPlus,
  Check,
} from "lucide-react";

/* Shared Liquid-Glass shell for /login and /signup: a living brand panel
   (animated signal feed + proof stats + trust row) beside a structured frosted
   form card, over the global animated gradient. */

interface Point {
  icon: typeof Check;
  text: string;
}

/* Illustrative "live" feed — mirrors the kind of buying signals the product
   surfaces, so the auth screen feels like the product, not a generic form. */
const SIGNALS = [
  {
    icon: UserPlus,
    company: "Northwind Labs",
    line: "Hiring 6 AEs + a VP Sales",
    score: 94,
    when: "2m ago",
    tint: "var(--color-accent)",
    soft: "var(--color-accent-soft)",
  },
  {
    icon: Banknote,
    company: "Cedar Health",
    line: "Closed a $40M Series B",
    score: 88,
    when: "11m ago",
    tint: "var(--color-positive)",
    soft: "var(--color-positive-soft)",
  },
  {
    icon: TrendingUp,
    company: "Atlas Freight",
    line: "Web traffic up 3.2× this week",
    score: 81,
    when: "26m ago",
    tint: "var(--color-warn)",
    soft: "var(--color-warn-soft)",
  },
] as const;

const STATS = [
  { value: "2.4M", label: "signals / day" },
  { value: "37%", label: "reply rate" },
  { value: "9hrs", label: "saved / rep / wk" },
] as const;

function SignalFeed() {
  return (
    <div className="glass rounded-[var(--radius)] p-4 space-y-2.5 w-full max-w-md">
      <div className="flex items-center justify-between px-1">
        <div className="inline-flex items-center gap-2">
          <span className="grid place-items-center h-6 w-6 rounded-full bg-[var(--color-accent-soft)]">
            <Radio size={12} className="text-[var(--color-accent)]" />
          </span>
          <span className="kicker">Live signal feed</span>
        </div>
        <span className="inline-flex items-center gap-1.5 text-[0.7rem] text-[var(--color-ink-soft)] font-mono">
          <span className="live-dot h-1.5 w-1.5 rounded-full bg-[var(--color-positive)]" />
          listening
        </span>
      </div>

      {SIGNALS.map((s, i) => {
        const Icon = s.icon;
        return (
          <div
            key={s.company}
            className="card-quiet rounded-[var(--radius-sm)] px-3 py-2.5 flex items-center gap-3 reveal"
            style={{ animationDelay: `${0.15 + i * 0.12}s` }}
          >
            <span
              className="grid place-items-center h-9 w-9 shrink-0 rounded-full"
              style={{ background: s.soft }}
            >
              <Icon size={16} style={{ color: s.tint }} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-medium text-sm truncate">{s.company}</span>
                <span className="kicker shrink-0">{s.when}</span>
              </div>
              <div className="text-[0.82rem] text-[var(--color-ink-soft)] truncate">{s.line}</div>
            </div>
            <div className="text-right shrink-0">
              <div className="numeral text-lg" style={{ color: s.tint }}>{s.score}</div>
              <div className="kicker">intent</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function AuthScreen({
  eyebrow,
  title,
  brandLine,
  points,
  children,
}: {
  eyebrow: string;
  title: string;
  brandLine: string;
  points?: Point[];
  children: React.ReactNode;
}) {
  return (
    <div className="relative z-10 min-h-screen grid place-items-center p-6 sm:p-10 overflow-hidden">
      {/* Ambient glows (anchored to the viewport, behind the centered block) */}
      <div
        aria-hidden
        className="pointer-events-none fixed -top-24 -left-20 h-96 w-96 rounded-full blur-3xl"
        style={{ background: "radial-gradient(closest-side, rgba(229,67,15,0.18), transparent 70%)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed -bottom-32 -right-16 h-[26rem] w-[26rem] rounded-full blur-3xl"
        style={{ background: "radial-gradient(closest-side, rgba(31,93,63,0.12), transparent 70%)" }}
      />

      {/* Centered, width-gated two-column block — keeps brand + form together
          instead of letting them stretch to opposite edges on wide screens. */}
      <div className="relative w-full max-w-5xl grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
        {/* Brand panel */}
        <div className="hidden lg:flex flex-col gap-9">
          <div className="flex items-center gap-3">
            <Link href="/" className="font-display text-3xl tracking-tight">
              Revenue<span className="text-[var(--color-accent)]">OS</span>
            </Link>
            <span className="pill">AI-native GTM</span>
          </div>

          <div>
            <p className="font-display text-[2.6rem] leading-[1.05] tracking-tight">{brandLine}</p>
            <p className="mt-5 text-[var(--color-ink-soft)] max-w-md">
              The system that listens to the buying signals companies are already broadcasting — so your
              team can spend its time closing, not digging.
            </p>
          </div>

          <SignalFeed />

          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-3 max-w-md">
              {STATS.map((s) => (
                <div key={s.label}>
                  <div className="numeral text-3xl">{s.value}</div>
                  <div className="kicker mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Form card */}
        <div
          className="w-full max-w-md lg:justify-self-end glass-strong rounded-[var(--radius-lg)] p-8 sm:p-10 reveal"
          style={{ boxShadow: "var(--glass-shadow-hover)" }}
        >
          <div className="lg:hidden font-display text-3xl mb-8">
            Revenue<span className="text-[var(--color-accent)]">OS</span>
          </div>
          <div className="kicker mb-2">{eyebrow}</div>
          <h1 className="font-display text-3xl sm:text-[2.2rem] tracking-tight mb-6 leading-tight">{title}</h1>

          {points && points.length > 0 && (
            <ul className="mb-7 space-y-2.5">
              {points.map((p) => {
                const Icon = p.icon;
                return (
                  <li key={p.text} className="flex items-center gap-3 text-sm text-[var(--color-ink-2)]">
                    <span className="grid place-items-center h-6 w-6 shrink-0 rounded-full bg-[var(--color-accent-soft)]">
                      <Icon size={13} className="text-[var(--color-accent)]" />
                    </span>
                    {p.text}
                  </li>
                );
              })}
            </ul>
          )}

          {children}
        </div>
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="kicker">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
