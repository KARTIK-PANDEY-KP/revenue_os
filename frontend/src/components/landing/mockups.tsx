"use client";

import {
  TrendingUp,
  Sparkles,
  Search,
  Mail,
  Phone,
  Zap,
  Briefcase,
  Rocket,
  DollarSign,
  CheckCircle2,
  Wand2,
} from "lucide-react";
import type { ReactNode } from "react";

/* ------------------------------------------------------------------ */
/*  Shared primitives                                                  */
/* ------------------------------------------------------------------ */

/** Small initials avatar in a tinted circle. */
function Avatar({ initials, tone = "ink" }: { initials: string; tone?: "ink" | "accent" | "positive" | "warn" }) {
  const map: Record<string, string> = {
    ink: "var(--color-ink)",
    accent: "var(--color-accent)",
    positive: "var(--color-positive)",
    warn: "var(--color-warn)",
  };
  return (
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-mono text-[0.62rem] font-medium text-white"
      style={{
        background: `linear-gradient(150deg, ${map[tone]}, color-mix(in srgb, ${map[tone]} 70%, #000))`,
      }}
    >
      {initials}
    </div>
  );
}

/** A confidence / intent chip. */
function Chip({
  children,
  tone = "accent",
}: {
  children: ReactNode;
  tone?: "accent" | "positive" | "warn" | "neutral";
}) {
  const tones: Record<string, { bg: string; fg: string }> = {
    accent: { bg: "var(--color-accent-soft)", fg: "var(--color-accent-2)" },
    positive: { bg: "var(--color-positive-soft)", fg: "var(--color-positive)" },
    warn: { bg: "var(--color-warn-soft)", fg: "var(--color-warn)" },
    neutral: { bg: "color-mix(in srgb, var(--color-ink) 7%, transparent)", fg: "var(--color-ink-soft)" },
  };
  const t = tones[tone];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-[0.15rem] font-mono text-[0.58rem] uppercase tracking-wide"
      style={{ background: t.bg, color: t.fg }}
    >
      {children}
    </span>
  );
}

/** Subtle accent glow that sits behind a mockup. */
export function AccentGlow({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute -z-10 rounded-full blur-3xl ${className}`}
      style={{
        background:
          "radial-gradient(circle at 50% 50%, rgba(229,67,15,0.28), rgba(229,67,15,0.05) 60%, transparent 72%)",
      }}
    />
  );
}

/** A tiny window chrome bar used at the top of device frames. */
function Chrome({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-[var(--color-line)] px-4 py-2.5">
      <div className="flex gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-line-2)]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-line-2)]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-line-2)]" />
      </div>
      <div className="mx-auto -translate-x-3 font-mono text-[0.6rem] uppercase tracking-wider text-[var(--color-faint)]">
        {label}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Hero dashboard — the marquee "screenshot"                          */
/* ------------------------------------------------------------------ */

function MiniBars() {
  const bars = [38, 52, 44, 68, 60, 82, 74, 96];
  return (
    <svg viewBox="0 0 160 56" className="h-14 w-full" preserveAspectRatio="none">
      {bars.map((h, i) => (
        <rect
          key={i}
          x={i * 20 + 4}
          y={56 - (h / 100) * 56}
          width="11"
          rx="2.5"
          height={(h / 100) * 56}
          fill={i === bars.length - 1 ? "var(--color-accent)" : "color-mix(in srgb, var(--color-accent) 22%, transparent)"}
        />
      ))}
    </svg>
  );
}

export function HeroMockup() {
  const leaders = [
    { name: "Northwind Labs", who: "VP Eng hiring · 14 roles", score: 96, tone: "accent" as const, init: "NL" },
    { name: "Cobalt Systems", who: "Series B · $40M raised", score: 91, tone: "positive" as const, init: "CS" },
    { name: "Atlas Retail", who: "New CRO appointed", score: 84, tone: "warn" as const, init: "AR" },
  ];
  return (
    <div className="relative w-full max-w-[560px]">
      <AccentGlow className="-top-10 left-8 h-72 w-72" />
      <div className="glass float overflow-hidden rounded-[var(--radius-lg)] shadow-2xl">
        <Chrome label="revenueos · today" />
        <div className="space-y-4 p-5">
          {/* top metric row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-card)] p-3">
              <div className="font-mono text-[0.58rem] uppercase tracking-wide text-[var(--color-faint)]">In-market</div>
              <div className="numeral mt-1 text-2xl leading-none text-[var(--color-ink)]">247</div>
              <div className="mt-1 flex items-center gap-1 text-[0.62rem] text-[var(--color-positive)]">
                <TrendingUp size={11} /> +18 today
              </div>
            </div>
            <div className="rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-card)] p-3">
              <div className="font-mono text-[0.58rem] uppercase tracking-wide text-[var(--color-faint)]">Signals</div>
              <div className="numeral mt-1 text-2xl leading-none text-[var(--color-ink)]">1.3k</div>
              <div className="mt-1 text-[0.62rem] text-[var(--color-ink-soft)]">last 24h</div>
            </div>
            <div
              className="rounded-[var(--radius-sm)] border p-3 text-white"
              style={{
                background: "linear-gradient(155deg, var(--color-accent), var(--color-accent-2))",
                borderColor: "rgba(255,255,255,0.25)",
              }}
            >
              <div className="font-mono text-[0.58rem] uppercase tracking-wide opacity-80">Top score</div>
              <div className="numeral mt-1 text-2xl leading-none">96</div>
              <div className="mt-1 text-[0.62rem] opacity-85">Northwind Labs</div>
            </div>
          </div>

          {/* signal chip + chart */}
          <div className="rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-card)] p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={13} className="text-[var(--color-accent)]" />
                <span className="text-[0.72rem] font-medium text-[var(--color-ink-2)]">Intent momentum</span>
              </div>
              <Chip tone="accent">
                <Zap size={9} /> live
              </Chip>
            </div>
            <MiniBars />
          </div>

          {/* leaderboard */}
          <div className="rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-card)]">
            <div className="border-b border-[var(--color-line)] px-3 py-2 font-mono text-[0.58rem] uppercase tracking-wide text-[var(--color-faint)]">
              Priority queue
            </div>
            {leaders.map((l, i) => (
              <div
                key={l.name}
                className={`flex items-center gap-3 px-3 py-2.5 ${i < leaders.length - 1 ? "border-b border-[var(--color-line)]" : ""}`}
              >
                <Avatar initials={l.init} tone={l.tone} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[0.78rem] font-medium text-[var(--color-ink)]">{l.name}</div>
                  <div className="truncate text-[0.65rem] text-[var(--color-ink-soft)]">{l.who}</div>
                </div>
                <div className="numeral text-lg leading-none text-[var(--color-ink)]">{l.score}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* floating satellite chip */}
      <div
        className="glass-strong float absolute -bottom-5 -left-6 hidden items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 shadow-xl sm:flex"
        style={{ animationDelay: "1.2s" }}
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-accent)] opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--color-accent)]" />
        </span>
        <span className="text-[0.7rem] font-medium text-[var(--color-ink-2)]">New hiring signal · Northwind</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Feature mockups                                                    */
/* ------------------------------------------------------------------ */

export function SearchMockup() {
  const results = [
    { name: "Northwind Labs", meta: "Series B · 320 staff · Devtools", fit: "94", init: "NL", tone: "accent" as const },
    { name: "Cobalt Systems", meta: "Series B · 210 staff · Infra", fit: "89", init: "CS", tone: "positive" as const },
    { name: "Atlas Retail", meta: "Growth · 540 staff · Commerce", fit: "82", init: "AR", tone: "warn" as const },
  ];
  return (
    <div className="relative w-full max-w-[440px]">
      <AccentGlow className="-top-8 right-6 h-56 w-56 opacity-70" />
      <div className="glass overflow-hidden rounded-[var(--radius-lg)] shadow-xl">
        <Chrome label="prospecting" />
        <div className="space-y-3 p-4">
          <div className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-card)] px-3 py-2.5">
            <Search size={15} className="text-[var(--color-accent)]" />
            <span className="text-[0.78rem] text-[var(--color-ink-2)]">
              Series B devtools hiring backend engineers
            </span>
            <span className="ml-auto inline-block h-3.5 w-px animate-pulse bg-[var(--color-accent)]" />
          </div>
          <div className="flex items-center gap-2 px-1 text-[0.62rem] text-[var(--color-ink-soft)]">
            <Sparkles size={11} className="text-[var(--color-accent)]" />
            Researched 1,204 companies · 247 strong matches
          </div>
          {results.map((r) => (
            <div
              key={r.name}
              className="flex items-center gap-3 rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-card)] p-3"
            >
              <Avatar initials={r.init} tone={r.tone} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[0.8rem] font-medium text-[var(--color-ink)]">{r.name}</div>
                <div className="truncate text-[0.66rem] text-[var(--color-ink-soft)]">{r.meta}</div>
              </div>
              <div className="text-right">
                <div className="numeral text-base leading-none text-[var(--color-ink)]">{r.fit}</div>
                <div className="font-mono text-[0.52rem] uppercase tracking-wide text-[var(--color-faint)]">fit</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SignalsMockup() {
  const signals = [
    {
      icon: Briefcase,
      title: "Hiring spike",
      body: "14 new backend roles posted in 9 days",
      conf: "High",
      tone: "accent" as const,
    },
    {
      icon: DollarSign,
      title: "New funding",
      body: "Closed $40M Series B led by a top-tier fund",
      conf: "Confirmed",
      tone: "positive" as const,
    },
    {
      icon: Rocket,
      title: "Product launch",
      body: "Shipped enterprise tier — moving upmarket",
      conf: "Medium",
      tone: "warn" as const,
    },
  ];
  return (
    <div className="relative w-full max-w-[440px]">
      <AccentGlow className="-bottom-8 left-4 h-56 w-56 opacity-70" />
      <div className="space-y-3">
        {signals.map((s, i) => {
          const Icon = s.icon;
          return (
            <div
              key={s.title}
              className="glass float flex items-start gap-3 rounded-[var(--radius)] p-4 shadow-lg"
              style={{ animationDelay: `${i * 0.6}s`, animationDuration: "7s" }}
            >
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)]"
                style={{ background: "var(--color-accent-soft)" }}
              >
                <Icon size={16} className="text-[var(--color-accent)]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[0.85rem] font-medium text-[var(--color-ink)]">{s.title}</span>
                  <Chip tone={s.tone}>{s.conf}</Chip>
                </div>
                <p className="mt-0.5 text-[0.72rem] leading-snug text-[var(--color-ink-soft)]">{s.body}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function EmailMockup() {
  return (
    <div className="relative w-full max-w-[460px]">
      <AccentGlow className="-top-6 right-4 h-56 w-56 opacity-70" />
      <div className="glass overflow-hidden rounded-[var(--radius-lg)] shadow-xl">
        <Chrome label="sequence · draft" />
        <div className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail size={14} className="text-[var(--color-accent)]" />
              <span className="text-[0.75rem] font-medium text-[var(--color-ink-2)]">To: Priya N. · VP Engineering</span>
            </div>
            <Chip tone="accent">
              <Wand2 size={9} /> auto-written
            </Chip>
          </div>
          <div className="rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-card)] p-3.5">
            <div className="text-[0.8rem] font-medium text-[var(--color-ink)]">
              Scaling the backend team to 14?
            </div>
            <div className="mt-2 space-y-1.5 text-[0.72rem] leading-relaxed text-[var(--color-ink-soft)]">
              <p>
                Saw Northwind just opened 14 backend roles after the Series B — that pace usually means
                on-call and review load are about to spike.
              </p>
              <p>
                Teams your size use us to <span className="text-[var(--color-ink-2)]">cut review time ~40%</span>{" "}
                while headcount ramps. Worth 15 minutes next week?
              </p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="flex-1 rounded-full bg-[var(--color-line)]" style={{ height: 4 }} />
            <span className="font-mono text-[0.55rem] uppercase tracking-wide text-[var(--color-faint)]">
              Step 1 of 4
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DialerMockup() {
  const bubbles = [
    { who: "prospect", text: "Honestly, we already have a tool for this." },
    { who: "rep", text: "Totally fair — what's it missing today?" },
  ];
  return (
    <div className="relative w-full max-w-[460px]">
      <AccentGlow className="-bottom-8 right-2 h-60 w-60 opacity-80" />
      <div className="glass overflow-hidden rounded-[var(--radius-lg)] shadow-xl">
        <Chrome label="live call · 04:12" />
        <div className="space-y-3 p-4">
          <div className="flex items-center gap-2">
            <Phone size={14} className="text-[var(--color-accent)]" />
            <span className="text-[0.75rem] font-medium text-[var(--color-ink-2)]">Northwind Labs · Priya N.</span>
            <span className="ml-auto flex items-center gap-1.5 text-[0.62rem] text-[var(--color-accent)]">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-accent)] opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--color-accent)]" />
              </span>
              recording
            </span>
          </div>

          {/* transcript */}
          <div className="space-y-2">
            {bubbles.map((b, i) => (
              <div key={i} className={`flex ${b.who === "rep" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[78%] rounded-[var(--radius-sm)] px-3 py-2 text-[0.72rem] leading-snug ${
                    b.who === "rep"
                      ? "bg-[var(--color-ink)] text-[var(--color-paper)]"
                      : "border border-[var(--color-line)] bg-[var(--color-card)] text-[var(--color-ink-2)]"
                  }`}
                >
                  {b.text}
                </div>
              </div>
            ))}
          </div>

          {/* copilot battlecard */}
          <div
            className="rounded-[var(--radius-sm)] border p-3"
            style={{ borderColor: "var(--color-accent)", background: "var(--color-accent-soft)" }}
          >
            <div className="mb-1.5 flex items-center gap-1.5">
              <Sparkles size={12} className="text-[var(--color-accent-2)]" />
              <span className="font-mono text-[0.58rem] uppercase tracking-wide text-[var(--color-accent-2)]">
                Copilot · next move
              </span>
            </div>
            <p className="text-[0.74rem] leading-snug text-[var(--color-ink-2)]">
              Their current tool has no real-time review. Ask: “How long does a PR sit before someone looks?”
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ScoreMockup() {
  const score = 96;
  const r = 52;
  const c = 2 * Math.PI * r;
  const dash = (score / 100) * c;
  const leaders = [
    { name: "Northwind Labs", v: 96, init: "NL", tone: "accent" as const },
    { name: "Cobalt Systems", v: 91, init: "CS", tone: "positive" as const },
    { name: "Atlas Retail", v: 84, init: "AR", tone: "warn" as const },
    { name: "Meridian Health", v: 79, init: "MH", tone: "positive" as const },
  ];
  return (
    <div className="relative w-full max-w-[440px]">
      <AccentGlow className="-top-6 left-2 h-56 w-56 opacity-70" />
      <div className="glass overflow-hidden rounded-[var(--radius-lg)] p-5 shadow-xl">
        <div className="flex items-center gap-5">
          {/* dial */}
          <div className="relative h-32 w-32 shrink-0">
            <svg viewBox="0 0 128 128" className="h-32 w-32 -rotate-90">
              <circle cx="64" cy="64" r={r} fill="none" stroke="var(--color-line)" strokeWidth="10" />
              <circle
                cx="64"
                cy="64"
                r={r}
                fill="none"
                stroke="var(--color-accent)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${dash} ${c}`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="numeral text-3xl leading-none text-[var(--color-ink)]">{score}</span>
              <span className="font-mono text-[0.52rem] uppercase tracking-wide text-[var(--color-faint)]">
                priority
              </span>
            </div>
          </div>
          {/* factors */}
          <div className="min-w-0 flex-1 space-y-2">
            {[
              ["Fit", 94],
              ["Intent", 98],
              ["Timing", 90],
            ].map(([label, v]) => (
              <div key={label as string}>
                <div className="mb-1 flex justify-between text-[0.64rem]">
                  <span className="text-[var(--color-ink-soft)]">{label}</span>
                  <span className="numeral text-[var(--color-ink)]">{v}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-line)]">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${v as number}%`, background: "var(--color-accent)" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-card)]">
          <div className="border-b border-[var(--color-line)] px-3 py-2 font-mono text-[0.56rem] uppercase tracking-wide text-[var(--color-faint)]">
            Today&apos;s leaderboard
          </div>
          {leaders.map((l, i) => (
            <div
              key={l.name}
              className={`flex items-center gap-3 px-3 py-2 ${i < leaders.length - 1 ? "border-b border-[var(--color-line)]" : ""}`}
            >
              <span className="numeral w-4 text-[0.8rem] text-[var(--color-faint)]">{i + 1}</span>
              <Avatar initials={l.init} tone={l.tone} />
              <span className="flex-1 truncate text-[0.74rem] text-[var(--color-ink-2)]">{l.name}</span>
              <CheckCircle2 size={13} className="text-[var(--color-positive)]" />
              <span className="numeral text-[0.85rem] text-[var(--color-ink)]">{l.v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
