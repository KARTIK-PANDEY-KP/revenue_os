"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { cx, initials, scoreTier, tierColor } from "@/lib/format";

/* Staggered reveal wrapper */
export function Reveal({
  children, delay = 0, className,
}: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function PageHeader({
  kicker, title, sub, actions,
}: { kicker: string; title: string; sub?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-7">
      <div>
        <div className="kicker mb-2">{kicker}</div>
        <h1 className="font-display text-[2.6rem] sm:text-[3.1rem] leading-[0.95] tracking-tight">
          {title}
        </h1>
        {sub && <p className="text-[var(--color-ink-soft)] mt-2 max-w-xl text-[0.95rem]">{sub}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

export function Logo({ src, name, size = 40 }: { src?: string; name: string; size?: number }) {
  // Many account logo_urls 404 or are blocked; fall back to monogram initials
  // instead of leaving an empty box (which read as broken "checkboxes").
  const [failed, setFailed] = useState(false);
  const showImg = src && !failed;
  return (
    <div
      className="grid place-items-center rounded-[var(--radius)] border border-[var(--color-line)] bg-[var(--color-paper-2)] overflow-hidden shrink-0 text-[var(--color-ink-soft)]"
      style={{ width: size, height: size }}
    >
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name}
          width={size}
          height={size}
          className="object-contain w-full h-full"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="font-display" style={{ fontSize: Math.max(11, size * 0.36) }}>
          {initials(name)}
        </span>
      )}
    </div>
  );
}

export function ScoreBadge({ score, size = "md" }: { score?: number | null; size?: "sm" | "md" | "lg" }) {
  const tier = scoreTier(score);
  const dims = { sm: "text-2xl", md: "text-4xl", lg: "text-6xl" }[size];
  return (
    <span className={cx("numeral", dims)} style={{ color: tierColor[tier] }}>
      {Math.round(score ?? 0)}
    </span>
  );
}

/* Horizontal score bar with label + value */
export function ScoreBar({ label, value, max = 100, accent }: { label: string; value?: number; max?: number; accent?: string }) {
  const pct = Math.max(0, Math.min(100, ((value ?? 0) / max) * 100));
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="kicker">{label}</span>
        <span className="numeral text-base">{Math.round(value ?? 0)}</span>
      </div>
      <div className="h-[3px] bg-[var(--color-line)] overflow-hidden rounded-full">
        <div
          className="h-full rounded-full rule-draw"
          style={{ width: `${pct}%`, background: accent ?? "var(--color-ink)" }}
        />
      </div>
    </div>
  );
}

export function Pill({
  children, tone = "default",
}: { children: React.ReactNode; tone?: "default" | "accent" | "positive" | "warn" | "risk" }) {
  const tones: Record<string, string> = {
    default: "border-[var(--color-line-2)] text-[var(--color-ink-soft)]",
    accent: "border-[var(--color-accent)] text-[var(--color-accent)] bg-[var(--color-accent-soft)]",
    positive: "border-[var(--color-positive)] text-[var(--color-positive)] bg-[var(--color-positive-soft)]",
    warn: "border-[var(--color-warn)] text-[var(--color-warn)] bg-[var(--color-warn-soft)]",
    risk: "border-[var(--color-risk)] text-[var(--color-risk)] bg-[var(--color-risk-soft)]",
  };
  return <span className={cx("pill", tones[tone])}>{children}</span>;
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 text-[var(--color-ink-soft)]">
      <span className="relative flex h-3 w-3">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-accent)] opacity-60" />
        <span className="relative inline-flex rounded-full h-3 w-3 bg-[var(--color-accent)]" />
      </span>
      {label && <span className="font-mono text-xs tracking-wide">{label}</span>}
    </div>
  );
}

export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="card border-dashed grid place-items-center py-16 text-center">
      <div className="font-display text-2xl text-[var(--color-ink-2)]">{title}</div>
      {hint && <div className="text-[var(--color-ink-soft)] text-sm mt-2 max-w-sm">{hint}</div>}
    </div>
  );
}

/* Tiny inline bar chart */
export function MiniBars({ values, accent }: { values: number[]; accent?: string }) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex items-end gap-[3px] h-8">
      {values.map((v, i) => (
        <div
          key={i}
          className="w-1.5 rounded-sm"
          style={{ height: `${(v / max) * 100}%`, background: accent ?? "var(--color-ink-2)" }}
        />
      ))}
    </div>
  );
}
