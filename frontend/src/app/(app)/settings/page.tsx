"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PageHeader, Pill, Reveal, Spinner } from "@/components/ui";

const DESC: Record<string, string> = {
  brightdata: "Live web intelligence — research, hiring, funding, competitor + buying-signal discovery.",
  cognee: "Persistent memory + knowledge graph across every company, contact, signal, call, and email.",
  trigger: "Workflow engine — account monitoring, sequence automation, follow-up orchestration.",
  livekit: "Real-time voice/call infrastructure for the browser dialer and AI SDR sessions.",
  speechmatics: "Real-time transcription powering the call copilot, summaries, and coaching.",
  llm: "Claude — research synthesis, signal extraction, personalization, and the live copilot.",
  supabase: "Postgres database + auth (provisioned from /supabase migrations).",
};

export default function SettingsPage() {
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [team, setTeam] = useState<any>(null);
  const [icpText, setIcpText] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.integrations().then((d) => setIntegrations(d.integrations ?? []));
    api.team().then((d) => {
      setTeam(d.team);
      setIcpText(JSON.stringify(d.team?.icp ?? {}, null, 2));
    });
  }, []);

  async function saveIcp() {
    try {
      const icp = JSON.parse(icpText);
      await api.put("/api/settings/icp", { icp });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { alert("Invalid JSON"); }
  }

  return (
    <div>
      <PageHeader kicker="Configuration" title="Settings" sub="Sponsor integrations, your ICP, and team configuration." />

      <Reveal>
        <section className="card mb-7">
          <div className="px-5 py-4 border-b border-[var(--color-line)] flex items-center justify-between">
            <h2 className="font-display text-2xl">Sponsor stack</h2>
            <span className="kicker">{integrations.filter((i) => i.live).length}/{integrations.length} live</span>
          </div>
          <div className="divide-y divide-[var(--color-line)]">
            {integrations.map((i) => (
              <div key={i.key} className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="flex items-start gap-3">
                  <span className="mt-1.5 h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ background: i.live ? "var(--color-positive)" : "var(--color-line-2)" }} />
                  <div>
                    <div className="font-display text-lg">{i.label}</div>
                    <p className="text-[0.84rem] text-[var(--color-ink-soft)] max-w-xl">{DESC[i.key]}</p>
                  </div>
                </div>
                <Pill tone={i.live ? "positive" : "default"}>{i.live ? "Live" : "Mock"}</Pill>
              </div>
            ))}
          </div>
          {integrations.some((i) => !i.live) && (
            <div className="px-5 py-3 border-t border-[var(--color-line)] kicker">
              Add keys to <span className="font-mono normal-case">.env</span> to switch any integration from mock to live.
            </div>
          )}
        </section>
      </Reveal>

      <Reveal delay={0.08}>
        <section className="card">
          <div className="px-5 py-4 border-b border-[var(--color-line)] flex items-center justify-between">
            <div>
              <h2 className="font-display text-2xl">Ideal Customer Profile</h2>
              <p className="kicker mt-1">Drives fit scoring + prospecting · team {team?.name}</p>
            </div>
            <button onClick={saveIcp} className="btn btn-primary">{saved ? "Saved ✓" : "Save ICP"}</button>
          </div>
          <div className="p-5">
            <textarea value={icpText} onChange={(e) => setIcpText(e.target.value)} rows={14}
              spellCheck={false}
              className="w-full bg-[var(--color-paper-2)]/40 border border-[var(--color-line)] rounded-[var(--radius)] p-4 font-mono text-[0.8rem] leading-relaxed outline-none focus:border-[var(--color-ink)]" />
          </div>
        </section>
      </Reveal>
    </div>
  );
}
