"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight, Sparkles, Zap, Phone, FlaskConical } from "lucide-react";
import { api } from "@/lib/api";
import { Logo, PageHeader, Pill, Reveal, ScoreBadge, Spinner } from "@/components/ui";
import { cx, scoreTier, signalGlyph, tierColor, timeAgo, titleCase } from "@/lib/format";

const CARDS = [
  { key: "hot_accounts", label: "Hot Accounts", sub: "score ≥ 80" },
  { key: "new_signals_24h", label: "New Signals", sub: "last 24h" },
  { key: "outreach_ready", label: "Outreach Ready", sub: "drafts" },
  { key: "calls_scheduled", label: "Calls Today", sub: "scheduled" },
  { key: "pipeline_opportunities", label: "Pipeline", sub: "opportunities" },
  { key: "accounts_with_risk", label: "Risk Flags", sub: "accounts" },
];

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [researching, setResearching] = useState(false);
  const [query, setQuery] = useState("");
  const [monitoring, setMonitoring] = useState(false);

  const load = () => api.dashboard().then(setData).catch(() => {});
  useEffect(() => { load(); }, []);

  async function research(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setResearching(true);
    try {
      const res = await api.research(query.trim());
      router.push(`/accounts/${res.account.id}`);
    } finally {
      setResearching(false);
    }
  }

  async function runMonitor() {
    setMonitoring(true);
    try { await api.runDailyMonitor(); await load(); }
    finally { setMonitoring(false); }
  }

  if (!data) return <div className="pt-20 grid place-items-center"><Spinner label="Assembling command center…" /></div>;

  const cards = data.cards ?? {};
  const board = data.leaderboard ?? [];
  const tasks = data.tasks ?? [];

  return (
    <div>
      <PageHeader
        kicker="Command center"
        title="What to do today."
        sub="High-intent accounts, why they matter now, and the single best next action — assembled from live web signals."
        actions={
          <button onClick={runMonitor} disabled={monitoring} className="btn btn-ghost">
            <Zap size={14} /> {monitoring ? "Monitoring…" : "Run daily monitor"}
          </button>
        }
      />

      {/* Research bar */}
      <Reveal>
        <form onSubmit={research} className="card flex items-center gap-3 px-4 py-3 mb-7">
          <FlaskConical size={18} className="text-[var(--color-accent)] shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Research any company by name — e.g. Cursor, Stripe, Ramp…"
            className="flex-1 bg-transparent outline-none text-[0.98rem] placeholder:text-[var(--color-faint)]"
          />
          <button className="btn btn-accent" disabled={researching}>
            {researching ? <Spinner /> : <><Sparkles size={14} /> Research</>}
          </button>
        </form>
      </Reveal>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-8">
        {CARDS.map((c, i) => (
          <Reveal key={c.key} delay={0.04 * i}>
            <div className="card px-4 py-4 h-full">
              <div className="kicker">{c.label}</div>
              <div className="numeral text-5xl mt-3 mb-1">{cards[c.key] ?? 0}</div>
              <div className="font-mono text-[10px] text-[var(--color-faint)]">{c.sub}</div>
            </div>
          </Reveal>
        ))}
      </div>

      <div className="grid lg:grid-cols-[1fr_340px] gap-7">
        {/* Leaderboard */}
        <Reveal delay={0.1}>
          <section className="card">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-line)]">
              <h2 className="font-display text-2xl">Priority Leaderboard</h2>
              <Link href="/accounts" className="kicker hover:text-[var(--color-accent)]">All accounts →</Link>
            </div>
            <div className="divide-y divide-[var(--color-line)]">
              <div className="hidden sm:grid grid-cols-[28px_1fr_70px_1.4fr_auto] gap-3 px-5 py-2 kicker">
                <span>#</span><span>Account</span><span>Score</span><span>Why now</span><span>Action</span>
              </div>
              {board.map((a: any, i: number) => (
                <Link
                  key={a.id}
                  href={`/accounts/${a.id}`}
                  className="grid grid-cols-[28px_1fr_70px_1.4fr_auto] gap-3 px-5 py-3.5 items-center hover:bg-[var(--color-paper-2)]/50 transition-colors group"
                >
                  <span className="numeral text-lg text-[var(--color-faint)]">{i + 1}</span>
                  <div className="flex items-center gap-3 min-w-0">
                    <Logo src={a.logo_url} name={a.name} size={34} />
                    <div className="min-w-0">
                      <div className="font-medium truncate flex items-center gap-1.5">
                        {a.name}
                        {a.has_risk && <span className="text-[var(--color-risk)] text-xs">⚠</span>}
                      </div>
                      <div className="font-mono text-[10px] text-[var(--color-faint)] truncate">{a.domain}</div>
                    </div>
                  </div>
                  <ScoreBadge score={a.score} size="sm" />
                  <div className="min-w-0">
                    {a.signal_type && (
                      <span className="font-mono text-[10px] mr-1.5" style={{ color: tierColor[scoreTier(a.score)] }}>
                        {signalGlyph(a.signal_type)} {a.signal_type}
                      </span>
                    )}
                    <span className="text-[0.86rem] text-[var(--color-ink-2)] line-clamp-1">
                      {a.why_now ?? a.signal ?? "—"}
                    </span>
                  </div>
                  <span className="hidden sm:inline-flex items-center gap-1 font-mono text-[11px] text-[var(--color-ink-soft)] group-hover:text-[var(--color-accent)]">
                    {a.recommended_action ?? "Review"} <ArrowUpRight size={12} />
                  </span>
                </Link>
              ))}
            </div>
          </section>
        </Reveal>

        {/* Right column */}
        <div className="space-y-7">
          <Reveal delay={0.16}>
            <section className="card">
              <div className="px-5 py-4 border-b border-[var(--color-line)] flex items-center justify-between">
                <h2 className="font-display text-xl">Today’s priorities</h2>
                <Pill tone="accent">{tasks.length}</Pill>
              </div>
              <div className="divide-y divide-[var(--color-line)]">
                {tasks.length === 0 && <div className="px-5 py-6 text-sm text-[var(--color-ink-soft)]">All clear.</div>}
                {tasks.slice(0, 6).map((t: any) => (
                  <div key={t.id} className="px-5 py-3.5 flex items-start gap-3">
                    <span className={cx("mt-1 h-2 w-2 rounded-full shrink-0",
                      t.priority === 1 ? "bg-[var(--color-accent)]" : "bg-[var(--color-line-2)]")} />
                    <div className="min-w-0">
                      <div className="text-[0.9rem] font-medium leading-snug">{t.title}</div>
                      <div className="font-mono text-[10px] text-[var(--color-faint)] mt-0.5 uppercase">
                        {titleCase(t.kind)} · P{t.priority}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </Reveal>

          <Reveal delay={0.22}>
            <section className="card">
              <div className="px-5 py-4 border-b border-[var(--color-line)] flex items-center justify-between">
                <h2 className="font-display text-xl">Fresh signals</h2>
                <Link href="/signals" className="kicker hover:text-[var(--color-accent)]">All →</Link>
              </div>
              <div className="divide-y divide-[var(--color-line)]">
                {(data.recent_signals ?? []).slice(0, 6).map((s: any) => (
                  <div key={s.id} className="px-5 py-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-[11px] text-[var(--color-accent)]">{signalGlyph(s.type)}</span>
                      <span className="kicker">{s.type}</span>
                      <span className="kicker ml-auto">{timeAgo(s.detected_at)}</span>
                    </div>
                    <div className="text-[0.88rem] leading-snug">{s.title}</div>
                  </div>
                ))}
              </div>
            </section>
          </Reveal>
        </div>
      </div>
    </div>
  );
}
