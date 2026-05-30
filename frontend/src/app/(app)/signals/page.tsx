"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Logo, PageHeader, Pill, Reveal, Spinner } from "@/components/ui";
import { cx, signalGlyph, timeAgo } from "@/lib/format";

const TYPES = ["all", "hiring", "funding", "product", "pricing", "executive", "compliance", "news"];

export default function SignalsPage() {
  const [signals, setSignals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState("all");
  const [sort, setSort] = useState("detected_at");

  useEffect(() => {
    setLoading(true);
    api.signals(`?sort=${sort}`).then((d) => setSignals(d.signals ?? [])).finally(() => setLoading(false));
  }, [sort]);

  const filtered = useMemo(
    () => signals.filter((s) => type === "all" || s.type === type),
    [signals, type],
  );

  return (
    <div>
      <PageHeader
        kicker="Buying intelligence"
        title="Signals"
        sub="Every GTM, finance, and security signal RevenueOS detected across the web — newest first."
      />

      <Reveal>
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {TYPES.map((t) => (
            <button key={t} onClick={() => setType(t)}
              className={cx("pill", type === t && "border-[var(--color-ink)] text-[var(--color-ink)] bg-[var(--color-paper-2)]")}>
              {t}
            </button>
          ))}
          <select value={sort} onChange={(e) => setSort(e.target.value)}
            className="ml-auto bg-transparent outline-none font-mono text-[11px] uppercase tracking-wide cursor-pointer">
            <option value="detected_at">Recent</option>
            <option value="confidence">Confidence</option>
            <option value="impact_score">Impact</option>
          </select>
        </div>
      </Reveal>

      {loading ? (
        <div className="pt-16 grid place-items-center"><Spinner label="Loading signals…" /></div>
      ) : (
        <div className="card divide-y divide-[var(--color-line)]">
          {filtered.map((s, i) => (
            <Reveal key={s.id} delay={Math.min(0.25, 0.02 * i)}>
              <div className="grid grid-cols-[auto_1fr_auto] gap-4 px-5 py-4 items-center hover:bg-[var(--color-paper-2)]/40 transition-colors">
                <div className="grid place-items-center h-10 w-10 rounded-[var(--radius)] border border-[var(--color-line)] bg-[var(--color-accent-soft)]">
                  <span className="font-mono text-[var(--color-accent)]">{signalGlyph(s.type)}</span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="kicker text-[var(--color-accent)]">{s.type}</span>
                    {s.account_name && (
                      <Link href={`/accounts/${s.account_id}`} className="font-mono text-[11px] hover:text-[var(--color-accent)] inline-flex items-center gap-1.5">
                        <Logo src={s.account_logo} name={s.account_name} size={16} /> {s.account_name}
                      </Link>
                    )}
                    <span className="kicker ml-auto sm:ml-2">{timeAgo(s.detected_at)}</span>
                  </div>
                  <div className="font-medium mt-1 truncate">{s.title}</div>
                  <p className="text-[0.84rem] text-[var(--color-ink-soft)] line-clamp-1">{s.summary}</p>
                </div>
                <div className="hidden sm:flex flex-col items-end gap-1.5">
                  <Pill>conf {Math.round(s.confidence)}</Pill>
                  <Pill>impact {Math.round(s.impact_score)}</Pill>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}
