"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, SlidersHorizontal } from "lucide-react";
import { api } from "@/lib/api";
import { Logo, PageHeader, Pill, Reveal, ScoreBadge, Spinner } from "@/components/ui";
import { cx, titleCase } from "@/lib/format";

const STAGES = ["all", "new", "researching", "qualified", "engaged", "opportunity"];

export default function AccountsPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stage, setStage] = useState("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("overall_score");

  useEffect(() => {
    setLoading(true);
    api.accounts(`?sort=${sort}`).then((d) => setAccounts(d.accounts ?? [])).finally(() => setLoading(false));
  }, [sort]);

  const filtered = useMemo(() => {
    return accounts.filter((a) => {
      if (stage !== "all" && a.stage !== stage) return false;
      if (q && !a.name.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [accounts, stage, q]);

  const industries = useMemo(
    () => Array.from(new Set(accounts.map((a) => a.industry).filter(Boolean))),
    [accounts],
  );

  return (
    <div>
      <PageHeader
        kicker="Portfolio"
        title="Accounts"
        sub={`${accounts.length} companies under intelligence. Ranked by composite priority score.`}
      />

      {/* Controls */}
      <Reveal>
        <div className="card px-4 py-3 mb-6 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Search size={16} className="text-[var(--color-faint)]" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by name…"
              className="bg-transparent outline-none flex-1 text-sm placeholder:text-[var(--color-faint)]" />
          </div>
          <div className="flex items-center gap-1">
            {STAGES.map((s) => (
              <button key={s} onClick={() => setStage(s)}
                className={cx("pill", stage === s && "border-[var(--color-ink)] text-[var(--color-ink)] bg-[var(--color-paper-2)]")}>
                {s}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 border-l border-[var(--color-line)] pl-3">
            <SlidersHorizontal size={14} className="text-[var(--color-faint)]" />
            <select value={sort} onChange={(e) => setSort(e.target.value)}
              className="bg-transparent outline-none font-mono text-[11px] uppercase tracking-wide cursor-pointer">
              <option value="overall_score">Sort: Score</option>
              <option value="intent_score">Sort: Intent</option>
              <option value="timing_score">Sort: Timing</option>
              <option value="last_researched_at">Sort: Recent</option>
            </select>
          </div>
        </div>
      </Reveal>

      {industries.length > 0 && (
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          <span className="kicker">Industries</span>
          {industries.map((ind) => <Pill key={ind}>{ind}</Pill>)}
        </div>
      )}

      {loading ? (
        <div className="pt-16 grid place-items-center"><Spinner label="Loading portfolio…" /></div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((a, i) => (
            <Reveal key={a.id} delay={Math.min(0.3, 0.03 * i)}>
              <Link href={`/accounts/${a.id}`}
                className="card p-5 block hover:border-[var(--color-ink)] transition-colors group h-full">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <Logo src={a.logo_url} name={a.name} size={42} />
                    <div className="min-w-0">
                      <div className="font-display text-xl leading-tight truncate">{a.name}</div>
                      <div className="font-mono text-[10px] text-[var(--color-faint)]">{a.industry ?? a.domain}</div>
                    </div>
                  </div>
                  <ScoreBadge score={a.overall_score} size="md" />
                </div>
                <p className="text-[0.85rem] text-[var(--color-ink-soft)] line-clamp-2 min-h-[2.4em] mb-4">
                  {a.why_now ?? a.description}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex gap-1.5">
                    <Pill>{titleCase(a.stage)}</Pill>
                    {a.employee_estimate && <Pill>{a.employee_estimate.toLocaleString()} ppl</Pill>}
                  </div>
                  <span className="font-mono text-[10px] text-[var(--color-faint)] group-hover:text-[var(--color-accent)]">
                    Open →
                  </span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}
