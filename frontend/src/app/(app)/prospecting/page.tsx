"use client";

import { useState } from "react";
import Link from "next/link";
import { Telescope, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { Logo, PageHeader, Pill, Reveal, ScoreBadge, Spinner } from "@/components/ui";
import { Explain } from "@/components/Explain";
import { signalGlyph } from "@/lib/format";

const EXAMPLES = [
  "Series A AI infrastructure startups hiring sales engineers",
  "Companies similar to Cursor that recently launched enterprise plans",
  "Fintech companies with recent compliance hiring",
  "Dev-tools companies that changed pricing this quarter",
];

export default function ProspectingPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [ran, setRan] = useState(false);

  async function run(q?: string) {
    const text = (q ?? query).trim();
    if (!text) return;
    setQuery(text);
    setLoading(true);
    setRan(true);
    try {
      const d = await api.prospect(text, 4);
      setResults(d.results ?? []);
    } finally { setLoading(false); }
  }

  return (
    <div>
      <PageHeader
        kicker="Discovery"
        title="Find your next accounts."
        sub="Describe your ICP in plain language. RevenueOS searches the live web, researches each match, and ranks them by intent."
      />

      <Reveal>
        <div className="card p-2 mb-4 flex items-center gap-3">
          <Telescope size={20} className="text-[var(--color-accent)] ml-3 shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && run()}
            placeholder="Describe the companies you want to find…"
            className="flex-1 bg-transparent outline-none text-[1.05rem] py-3 placeholder:text-[var(--color-faint)]"
          />
          <button onClick={() => run()} disabled={loading} className="btn btn-accent">
            {loading ? <Spinner /> : <><Sparkles size={14} /> Prospect</>}
          </button>
          <Explain
            side="bottom"
            title="Prospect"
            label="What does Prospect do?"
            text="Describe the kind of companies you want; we search the web, research the best matches, and rank them by buying intent."
            className="mr-3"
          />
        </div>
      </Reveal>

      {!ran && (
        <div className="flex flex-wrap gap-2 mb-8">
          <span className="kicker self-center">Try</span>
          {EXAMPLES.map((e) => (
            <button key={e} onClick={() => run(e)} className="pill hover:border-[var(--color-ink)] hover:text-[var(--color-ink)] text-left normal-case tracking-normal font-sans text-[0.8rem] py-1.5">
              {e}
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div className="py-16 grid place-items-center">
          <Spinner label="Searching the web, researching matches, scoring intent…" />
        </div>
      )}

      <div className="space-y-4">
        {results.map((r, i) => (
          <Reveal key={r.account.id} delay={0.05 * i}>
            <div className="card p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-4 min-w-0">
                  <Logo src={r.account.logo_url} name={r.account.name} size={52} />
                  <div className="min-w-0">
                    <Link href={`/accounts/${r.account.id}`} className="font-display text-2xl hover:text-[var(--color-accent)]">
                      {r.account.name}
                    </Link>
                    <div className="font-mono text-[11px] text-[var(--color-faint)] mb-2">
                      {r.account.industry} · {r.account.domain}
                    </div>
                    <p className="text-[0.88rem] text-[var(--color-ink-soft)] max-w-2xl">{r.account.why_now}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="kicker mb-1">Intent</div>
                  <ScoreBadge score={r.confidence} size="md" />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-[var(--color-line)]">
                <div>
                  <div className="kicker mb-2">Signals</div>
                  <div className="space-y-1">
                    {(r.signals ?? []).slice(0, 3).map((s: any) => (
                      <div key={s.id} className="text-[0.84rem] flex items-center gap-2">
                        <span className="text-[var(--color-accent)] font-mono">{signalGlyph(s.type)}</span> {s.title}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="kicker mb-2">Decision makers</div>
                  <div className="flex flex-wrap gap-1.5">
                    {(r.decision_makers ?? []).map((d: any) => <Pill key={d.id}>{d.full_name} · {d.title}</Pill>)}
                  </div>
                </div>
              </div>
              {r.suggested_opener && (
                <div className="mt-3 card-quiet p-3">
                  <span className="kicker">Suggested opener</span>
                  <p className="text-[0.86rem] mt-1 italic">“{r.suggested_opener}”</p>
                </div>
              )}
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
