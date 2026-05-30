"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Telescope, Sparkles, Circle } from "lucide-react";
import { PageHeader, Pill, Reveal, ScoreBadge, Spinner } from "@/components/ui";
import { Explain } from "@/components/Explain";
import { Logo } from "@/components/ui";
import { signalGlyph } from "@/lib/format";

const EXAMPLES = [
  "Series A AI infrastructure startups hiring sales engineers",
  "Fintech companies that recently raised a round",
  "Dev-tools companies expanding their enterprise team",
  "Healthcare SaaS with new compliance leadership",
];

type Phase = "idle" | "running" | "done";

function streamUrl(query: string, limit = 4): string {
  const base = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";
  return `${base}/api/prospecting/stream?query=${encodeURIComponent(query)}&limit=${limit}`;
}

export default function ProspectingPage() {
  const [query, setQuery] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [status, setStatus] = useState("");
  const [companies, setCompanies] = useState<string[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [pct, setPct] = useState(0);

  const esRef = useRef<EventSource | null>(null);
  const doneRef = useRef(0);
  const totalRef = useRef(1);

  // Smoothly creep the bar forward between real events so it never looks frozen.
  useEffect(() => {
    if (phase !== "running") return;
    const t = setInterval(() => {
      setPct((p) => {
        const ceil = Math.min(98, ((doneRef.current + 0.92) / totalRef.current) * 100);
        return p < ceil ? Math.min(p + 1.2, ceil) : p;
      });
    }, 350);
    return () => clearInterval(t);
  }, [phase]);

  useEffect(() => () => esRef.current?.close(), []);

  function run(q?: string) {
    const text = (q ?? query).trim();
    if (!text) return;
    setQuery(text);
    esRef.current?.close();
    setPhase("running");
    setStatus("Connecting…");
    setCompanies([]);
    setResults([]);
    setPct(4);
    doneRef.current = 0;
    totalRef.current = 1;

    const es = new EventSource(streamUrl(text, 4));
    esRef.current = es;

    es.addEventListener("status", (e) => setStatus(JSON.parse((e as MessageEvent).data).message));
    es.addEventListener("discovered", (e) => {
      const d = JSON.parse((e as MessageEvent).data);
      setCompanies(d.companies ?? []);
      totalRef.current = d.total || 1;
      setStatus(`Found ${d.total} matching companies — researching them now…`);
      setPct(12);
    });
    es.addEventListener("tick", (e) => {
      const d = JSON.parse((e as MessageEvent).data);
      doneRef.current = d.done ?? doneRef.current;
      if (d.message) setStatus(d.message);
    });
    es.addEventListener("result", (e) => {
      const d = JSON.parse((e as MessageEvent).data);
      doneRef.current = d.done ?? doneRef.current;
      if (d.message) setStatus(d.message);
      if (d.result) setResults((r) => [...r, d.result].sort(
        (a, b) => (b.account?.overall_score ?? 0) - (a.account?.overall_score ?? 0)));
    });
    es.addEventListener("done", (e) => {
      const d = JSON.parse((e as MessageEvent).data);
      if (d.results) setResults(d.results);
      setPct(100);
      setStatus(`Done — ${d.count} accounts ready.`);
      setPhase("done");
      es.close();
    });
    es.onerror = () => {
      es.close();
      // If we already have results, treat as done; otherwise surface a soft error.
      setPhase("done");
      setStatus((s) => (results.length ? "Done." : "Connection interrupted — try again."));
      setPct(100);
    };
  }

  const running = phase === "running";
  const ran = phase !== "idle";

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
            className="flex-1 min-w-0 bg-transparent outline-none text-[1.05rem] py-3 placeholder:text-[var(--color-faint)]"
          />
          <span className="inline-flex items-center gap-1 shrink-0 pr-1">
            <button onClick={() => run()} disabled={running} className="btn btn-accent">
              {running ? <Spinner /> : <><Sparkles size={14} /> Prospect</>}
            </button>
            <Explain
              side="bottom"
              text="Describe the kind of companies you want; we search the live web, research the best matches, and rank them by buying intent. Takes ~1 minute."
            />
          </span>
        </div>
      </Reveal>

      {!ran && (
        <div className="flex flex-wrap gap-2 mb-8">
          <span className="kicker self-center">Try</span>
          {EXAMPLES.map((e) => (
            <button key={e} onClick={() => run(e)}
              className="pill hover:border-[var(--color-ink)] hover:text-[var(--color-ink)] text-left normal-case tracking-normal font-sans text-[0.8rem] py-1.5">
              {e}
            </button>
          ))}
        </div>
      )}

      {/* Live progress */}
      {ran && (
        <Reveal>
          <div className="card p-5 mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="flex items-center gap-2 text-sm font-medium">
                {running && <Circle size={8} fill="var(--color-accent)" stroke="none" className="live-dot" />}
                {status}
              </span>
              <span className="numeral text-lg text-[var(--color-ink-soft)]">{Math.round(pct)}%</span>
            </div>
            <div className="h-2 rounded-full bg-[var(--color-line)] overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${pct}%`,
                  background: "linear-gradient(90deg, var(--color-accent), #ff7a45)",
                  transition: "width 0.5s var(--ease-fluid)",
                }}
              />
            </div>
            {companies.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-4">
                {companies.map((c) => {
                  const found = results.find((r) => r.account?.name?.toLowerCase() === c.toLowerCase());
                  return (
                    <span key={c} className="pill" style={found ? {
                      borderColor: "var(--color-positive)", color: "var(--color-positive)",
                      background: "var(--color-positive-soft)",
                    } : undefined}>
                      {found ? "✓ " : "• "}{c}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </Reveal>
      )}

      {/* Results (stream in live) */}
      <div className="space-y-4">
        {results.map((r, i) => (
          <Reveal key={r.account?.id ?? i} delay={0.04 * i}>
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
