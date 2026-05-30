"use client";

/**
 * /demo — a static "presentation tour" guide. It does NOT mutate anything; it
 * reads the live data (read-only) to build deep-links to the real, already
 * populated product screens, then lists them in screenshot order with a
 * description of what each shows and which providers power the data.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Camera } from "lucide-react";
import { api } from "@/lib/api";

interface Stop {
  n: number;
  group: string;
  title: string;
  path: string;
  shows: string;
  data: string;
  tip?: string;
}

export default function DemoTour() {
  const [heroId, setHeroId] = useState<string>("");
  const [heroName, setHeroName] = useState<string>("");
  const [seqId, setSeqId] = useState<string>("");
  const [callId, setCallId] = useState<string>("");
  const [counts, setCounts] = useState<{ accounts?: number; signals?: number }>({});

  useEffect(() => {
    api.accounts("?sort=overall_score").then((d) => {
      const a = d.accounts ?? [];
      if (a[0]) { setHeroId(a[0].id); setHeroName(a[0].name); }
      setCounts((c) => ({ ...c, accounts: a.length }));
    }).catch(() => {});
    api.sequences().then((d) => {
      const s = (d.sequences ?? []);
      const active = s.find((x: any) => x.status === "active") ?? s[0];
      if (active) setSeqId(active.id);
    }).catch(() => {});
    api.coachingCalls().then((d) => {
      const c = (d.calls ?? []).find((x: any) => x.scorecard) ?? (d.calls ?? [])[0];
      if (c) setCallId(c.id);
    }).catch(() => {});
    api.signals().then((d) => setCounts((c) => ({ ...c, signals: (d.signals ?? []).length }))).catch(() => {});
  }, []);

  const acct = heroId ? `/accounts/${heroId}` : "/accounts";
  const seq = seqId ? `/sequences/${seqId}` : "/sequences";

  const stops: Stop[] = [
    { n: 1, group: "Marketing", title: "Landing page", path: "/",
      shows: "The thesis hook (“your next customer is already telling the internet…”), vision manifesto, product mockups, the Products mega-menu, and how-it-works.",
      data: "Static marketing — hand-built product mockups." },
    { n: 2, group: "Onboarding", title: "Create workspace (sign-up)", path: "/signup",
      shows: "Liquid-Glass sign-up: brand panel with a live signal feed + proof stats, structured form.",
      data: "Real auth — stored in Supabase (app_users)." },
    { n: 3, group: "Onboarding", title: "Sign in", path: "/login",
      shows: "Matching glass sign-in screen.", data: "Real auth (Supabase)." },
    { n: 4, group: "Workspace", title: "Dashboard", path: "/dashboard",
      shows: "Command-center hero with a greeting, the research bar, 6 stat cards, the priority leaderboard, today’s tasks, fresh signals, and the live signal ticker.",
      data: "Scoring engine + Supabase; signals from Bright Data; ranked by composite intent score." },
    { n: 5, group: "Workspace", title: "Accounts portfolio", path: "/accounts",
      shows: "Every researched company as a glass card with score, stage, and why-now.",
      data: `Bright Data research → Supabase (${counts.accounts ?? "—"} real accounts).` },
    { n: 6, group: "Workspace", title: `Account intelligence — ${heroName || "top account"}`, path: acct,
      shows: "Hero header with a score ring + fit/intent/timing/risk; tabs: Overview, Signals, People, Outreach, Calls, Timeline, Risk. Click “Ask memory” for the Cognee answer; per-button eye-icon explainers.",
      data: "Bright Data (pages + SERP) → Claude signal extraction → scoring; Cognee memory; live decision-makers.",
      tip: "Screenshot each tab. On Outreach, click Send to capture the green “Sent ✓”." },
    { n: 7, group: "Discovery", title: "Prospecting", path: "/prospecting",
      shows: "Plain-English ICP search with a live streaming progress bar (status + discovered companies + results appearing one-by-one).",
      data: "Bright Data SERP discovery → per-company research → Claude ranking (live SSE).",
      tip: "Type an ICP and hit Prospect to capture the live progress bar mid-run." },
    { n: 8, group: "Discovery", title: "Signals", path: "/signals",
      shows: `All detected GTM/finance/security signals with type, confidence, impact, source (${counts.signals ?? "—"} signals).`,
      data: "Bright Data evidence → Claude normalization." },
    { n: 9, group: "Outbound", title: "Sequences", path: "/sequences",
      shows: "Multi-channel cadences with status (active/draft) and channels.",
      data: "AI-generated (Claude) plans; Trigger.dev orchestration." },
    { n: 10, group: "Outbound", title: "Sequence detail", path: seq,
      shows: "The step timeline (email/call/LinkedIn across days) with drafted copy, scheduled dates, per-step Send buttons, and a Call button on call steps.",
      data: "Claude-written steps; launching schedules steps + creates tasks; Trigger.dev run dispatched.",
      tip: "Click Send on an email step (→ “Sent ✓”). Click Call on a call step to jump into the live call." },
    { n: 11, group: "Voice", title: "Dialer (call workspace)", path: heroId ? `/dialer?account=${heroId}` : "/dialer",
      shows: "Prospect context + suggested opener + recent signals on the left; the call stage in the middle; live transcript + AI copilot battlecards on the right.",
      data: "LiveKit room + Speechmatics; AI voice agent (Claude); copilot from transcript.",
      tip: "Click Start call to capture the live transcript + copilot in action." },
    { n: 12, group: "Voice", title: "Calls history", path: "/calls",
      shows: "Every call session with disposition, duration, and AI summary.",
      data: "Speechmatics transcript → Claude summary → Supabase." },
    { n: 13, group: "Coaching", title: "Coaching", path: callId ? `/coaching?call=${callId}` : "/coaching",
      shows: "Call scorecard (discovery / objections / personalization / next-step / talk ratio), the transcript, the rep leaderboard, and the AI roleplay trainer.",
      data: "Claude scoring over the Speechmatics transcript.",
      tip: "A completed call is pre-selected with a real scorecard + transcript." },
    { n: 14, group: "Config", title: "Settings", path: "/settings",
      shows: "Connected services (all live with status dots) + the editable ICP (tag chips).",
      data: "Live integration status; ICP drives scoring + prospecting." },
  ];

  const groups = Array.from(new Set(stops.map((s) => s.group)));

  return (
    <div className="relative z-10 min-h-screen max-w-4xl mx-auto px-6 py-12">
      <div className="kicker mb-2">Presentation tour</div>
      <h1 className="font-display text-[3rem] leading-[0.95] tracking-tight">
        Screenshot RevenueOS <span className="text-[var(--color-accent)]">in order.</span>
      </h1>
      <p className="text-[var(--color-ink-soft)] mt-3 max-w-2xl">
        Every screen below is already populated with <strong>real data</strong> — accounts and
        signals researched live from the open web (Bright Data), scored and written by Claude,
        remembered in Cognee, and persisted in Supabase. Open each link in order and capture it.
        This page changes nothing.
      </p>

      <div className="mt-10 space-y-10">
        {groups.map((g) => (
          <section key={g}>
            <div className="kicker mb-3 text-[var(--color-accent)]">{g}</div>
            <div className="space-y-3">
              {stops.filter((s) => s.group === g).map((s) => (
                <Link key={s.n} href={s.path} target="_blank"
                  className="card p-5 flex gap-4 items-start hover:border-[var(--color-ink)] transition-colors group">
                  <span className="numeral text-3xl text-[var(--color-faint)] w-10 shrink-0">
                    {String(s.n).padStart(2, "0")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-xl">{s.title}</h3>
                      <ArrowUpRight size={15} className="text-[var(--color-faint)] group-hover:text-[var(--color-accent)]" />
                    </div>
                    <div className="font-mono text-[11px] text-[var(--color-faint)] mt-0.5">{s.path}</div>
                    <p className="text-[0.9rem] text-[var(--color-ink-2)] mt-2">{s.shows}</p>
                    <p className="text-[0.8rem] text-[var(--color-ink-soft)] mt-1.5">
                      <span className="kicker">Data ·</span> {s.data}
                    </p>
                    {s.tip && (
                      <p className="text-[0.8rem] text-[var(--color-accent)] mt-1.5 inline-flex items-start gap-1.5">
                        <Camera size={13} className="mt-0.5 shrink-0" /> {s.tip}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>

      <p className="kicker mt-12 text-center">RevenueOS — the AI-native GTM workspace</p>
    </div>
  );
}
