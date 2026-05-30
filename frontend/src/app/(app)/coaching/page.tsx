"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { GraduationCap, Trophy, Bot, Send } from "lucide-react";
import { api } from "@/lib/api";
import { Empty, PageHeader, Pill, Reveal, Spinner } from "@/components/ui";
import { cx, timeAgo, titleCase } from "@/lib/format";

function CoachingInner() {
  const params = useSearchParams();
  const [calls, setCalls] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.coachingCalls(), api.leaderboard()]).then(([c, l]) => {
      const cs = c.calls ?? [];
      setCalls(cs);
      setLeaderboard(l.leaderboard ?? []);
      const wanted = params.get("call");
      const pick = cs.find((x: any) => x.id === wanted) ?? cs[0];
      if (pick) setSelected(pick);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selected) api.call(selected.id).then(setDetail);
  }, [selected]);

  if (loading) return <div className="pt-16 grid place-items-center"><Spinner /></div>;

  return (
    <div>
      <PageHeader kicker="Enablement" title="Coaching" sub="Scorecards, transcripts, objection patterns, and an AI roleplay trainer." />

      <div className="grid lg:grid-cols-[300px_1fr] gap-6">
        {/* Left: call list + leaderboard */}
        <div className="space-y-6">
          <div className="card">
            <div className="px-4 py-3 border-b border-[var(--color-line)] kicker">Reviewed calls</div>
            <div className="divide-y divide-[var(--color-line)] max-h-[40vh] overflow-y-auto">
              {calls.length === 0 && <div className="px-4 py-5 text-sm text-[var(--color-ink-soft)]">No completed calls yet.</div>}
              {calls.map((c) => (
                <button key={c.id} onClick={() => setSelected(c)}
                  className={cx("w-full text-left px-4 py-3 hover:bg-[var(--color-paper-2)]/50", selected?.id === c.id && "bg-[var(--color-paper-2)]/60")}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-[0.9rem]">{titleCase(c.disposition ?? c.status)}</span>
                    {c.scorecard && <span className="numeral text-lg" style={{ color: "var(--color-accent)" }}>{Math.round(c.scorecard.overall_score)}</span>}
                  </div>
                  <div className="kicker mt-0.5">{timeAgo(c.created_at)}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="px-4 py-3 border-b border-[var(--color-line)] flex items-center gap-2">
              <Trophy size={14} className="text-[var(--color-accent)]" /><span className="kicker">Rep leaderboard</span>
            </div>
            <div className="divide-y divide-[var(--color-line)]">
              {leaderboard.length === 0 && <div className="px-4 py-4 text-sm text-[var(--color-ink-soft)]">No data yet.</div>}
              {leaderboard.map((r) => (
                <div key={r.rep_id} className="px-4 py-3 flex items-center justify-between">
                  <span className="font-mono text-[11px] truncate max-w-[160px]">#{r.rank} · {r.rep_id.slice(0, 8)}</span>
                  <span className="numeral text-base">{r.avg_score}</span>
                </div>
              ))}
            </div>
          </div>

          <Roleplay />
        </div>

        {/* Right: detail */}
        <div>
          {!detail ? (
            <Empty title="Select a call" hint="Pick a reviewed call to see its scorecard and transcript." />
          ) : (
            <Reveal key={detail.call.id}>
              <ScorecardView detail={detail} />
            </Reveal>
          )}
        </div>
      </div>
    </div>
  );
}

function ScorecardView({ detail }: { detail: any }) {
  const sc = detail.scorecard ?? {};
  const call = detail.call;
  const bars = [
    ["Discovery", sc.discovery_score], ["Objection handling", sc.objection_handling_score],
    ["Personalization", sc.personalization_score], ["Next step", sc.next_step_score],
    ["Qualification", sc.qualification_score],
  ];
  return (
    <div className="space-y-5">
      <div className="card p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="kicker mb-1">Call scorecard</div>
            <h2 className="font-display text-3xl">{titleCase(call.disposition ?? call.status)}</h2>
            <div className="kicker mt-1">{timeAgo(call.created_at)} · {call.duration_secs ?? 0}s</div>
          </div>
          <div className="text-right">
            <div className="kicker">Overall</div>
            <span className="numeral text-6xl" style={{ color: "var(--color-accent)" }}>{Math.round(sc.overall_score ?? 0)}</span>
          </div>
        </div>
        {call.summary && <p className="mt-4 pt-4 border-t border-[var(--color-line)] text-[0.95rem] leading-relaxed text-[var(--color-ink-2)]">{call.summary}</p>}
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        <div className="card p-5">
          <div className="kicker mb-4">Breakdown</div>
          <div className="space-y-3">
            {bars.map(([label, v]: any) => (
              <div key={label}>
                <div className="flex justify-between mb-1"><span className="text-[0.84rem]">{label}</span><span className="numeral text-sm">{Math.round(v ?? 0)}</span></div>
                <div className="h-[3px] bg-[var(--color-line)] rounded-full overflow-hidden">
                  <div className="h-full bg-[var(--color-ink)] rule-draw" style={{ width: `${v ?? 0}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-[var(--color-line)] flex items-center justify-between">
            <span className="kicker">Talk ratio (rep)</span><span className="numeral text-lg">{Math.round(sc.talk_ratio ?? 0)}%</span>
          </div>
        </div>
        <div className="card p-5">
          <div className="kicker mb-3">Improvements</div>
          <ul className="space-y-2">
            {(sc.improvements ?? []).map((imp: string, i: number) => (
              <li key={i} className="flex items-start gap-2 text-[0.88rem] text-[var(--color-ink-2)]"><span className="text-[var(--color-accent)] mt-0.5">→</span> {imp}</li>
            ))}
          </ul>
          {sc.objections_detected?.length > 0 && (
            <div className="mt-4"><div className="kicker mb-2">Objections detected</div>
              <div className="flex flex-wrap gap-1.5">{sc.objections_detected.map((o: string) => <Pill key={o} tone="warn">{o}</Pill>)}</div>
            </div>
          )}
        </div>
      </div>

      {detail.transcript?.length > 0 && (
        <div className="card p-5">
          <div className="kicker mb-3">Transcript</div>
          <div className="space-y-2.5 max-h-[40vh] overflow-y-auto">
            {detail.transcript.map((t: any, i: number) => (
              <div key={i} className="text-[0.88rem]">
                <span className="kicker mr-2">{t.speaker}</span>
                <span className={t.speaker === "rep" ? "text-[var(--color-ink-soft)]" : ""}>{t.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Roleplay() {
  const [turns, setTurns] = useState<{ role: string; text: string }[]>([]);
  const [input, setInput] = useState("");
  const [coaching, setCoaching] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const scenario = "Cold call to a VP of Sales at a fast-growing dev-tools company.";

  async function send() {
    if (!input.trim()) return;
    const mine = { role: "rep", text: input.trim() };
    const next = [...turns, mine];
    setTurns(next);
    setInput("");
    setBusy(true);
    try {
      const res = await api.roleplay({ scenario, turns: next });
      setTurns((t) => [...t, { role: "prospect", text: res.reply }]);
      setCoaching(res.coaching);
    } finally { setBusy(false); }
  }

  return (
    <div className="card">
      <div className="px-4 py-3 border-b border-[var(--color-line)] flex items-center gap-2">
        <Bot size={14} className="text-[var(--color-accent)]" /><span className="kicker">AI roleplay</span>
      </div>
      <div className="px-4 py-3 space-y-2 max-h-[26vh] overflow-y-auto">
        {turns.length === 0 && <p className="text-[var(--color-faint)] text-sm">Practice your pitch against a skeptical VP. Type your opener…</p>}
        {turns.map((t, i) => (
          <div key={i} className={cx("text-[0.85rem]", t.role === "rep" ? "text-right" : "")}>
            <span className="kicker block mb-0.5">{t.role}</span>
            <span className={cx("inline-block px-3 py-1.5 rounded-[var(--radius)]", t.role === "rep" ? "bg-[var(--color-ink)] text-[var(--color-paper)]" : "card-quiet")}>{t.text}</span>
          </div>
        ))}
        {coaching && <div className="text-[0.78rem] text-[var(--color-accent)] italic">Coach: {coaching}</div>}
      </div>
      <div className="px-3 py-3 border-t border-[var(--color-line)] flex items-center gap-2">
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Your line…" className="flex-1 bg-transparent outline-none text-sm placeholder:text-[var(--color-faint)]" />
        <button onClick={send} disabled={busy} className="btn btn-accent px-3 py-2"><Send size={13} /></button>
      </div>
    </div>
  );
}

export default function CoachingPage() {
  return (
    <Suspense fallback={<div className="pt-16 grid place-items-center"><Spinner /></div>}>
      <CoachingInner />
    </Suspense>
  );
}
