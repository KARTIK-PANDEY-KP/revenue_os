"use client";

import Link from "next/link";
import { Radio } from "lucide-react";

/* Shared Liquid-Glass shell for /login and /signup: a glass brand panel beside a
   floating frosted form card, over the global animated gradient. */
export function AuthScreen({
  eyebrow,
  title,
  brandLine,
  children,
}: {
  eyebrow: string;
  title: string;
  brandLine: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative z-10 min-h-screen grid lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -left-16 h-96 w-96 rounded-full blur-3xl"
          style={{ background: "radial-gradient(closest-side, rgba(229,67,15,0.20), transparent 70%)" }}
        />
        <Link href="/" className="relative font-display text-3xl tracking-tight">
          Revenue<span className="text-[var(--color-accent)]">OS</span>
        </Link>
        <div className="relative">
          <p className="font-display text-[2.6rem] leading-[1.05] tracking-tight max-w-md">{brandLine}</p>
          <p className="mt-5 text-[var(--color-ink-soft)] max-w-md">
            The system that listens to the buying signals companies are already broadcasting — so your
            team can spend its time closing, not digging.
          </p>
        </div>
        <div className="relative glass rounded-[var(--radius)] px-4 py-3 inline-flex items-center gap-3 w-max float">
          <span className="grid place-items-center h-8 w-8 rounded-full bg-[var(--color-accent-soft)]">
            <Radio size={15} className="text-[var(--color-accent)]" />
          </span>
          <div>
            <div className="kicker">Live signal</div>
            <div className="text-sm font-medium">Hiring spike detected · 2m ago</div>
          </div>
        </div>
      </div>

      {/* Form card */}
      <div className="grid place-items-center p-6 sm:p-10">
        <div
          className="w-full max-w-md glass-strong rounded-[var(--radius-lg)] p-8 sm:p-10"
          style={{ boxShadow: "var(--glass-shadow-hover)" }}
        >
          <div className="lg:hidden font-display text-3xl mb-8">
            Revenue<span className="text-[var(--color-accent)]">OS</span>
          </div>
          <div className="kicker mb-2">{eyebrow}</div>
          <h1 className="font-display text-3xl sm:text-[2.2rem] tracking-tight mb-7 leading-tight">{title}</h1>
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
