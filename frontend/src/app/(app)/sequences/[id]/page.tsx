"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, Phone, Linkedin, MessageSquare, CheckSquare, Play } from "lucide-react";
import { api } from "@/lib/api";
import { Pill, Reveal, Spinner } from "@/components/ui";
import { Explain } from "@/components/Explain";
import { titleCase } from "@/lib/format";

const CHANNEL_ICON: Record<string, any> = {
  email: Mail, call: Phone, linkedin: Linkedin, sms: MessageSquare, task: CheckSquare,
};

export default function SequenceDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<any>(null);
  const [launching, setLaunching] = useState(false);

  const load = () => api.sequence(id).then(setData).catch(() => {});
  useEffect(() => { load(); }, [id]);

  async function launch() {
    setLaunching(true);
    try { await api.launchSequence(id); await load(); } finally { setLaunching(false); }
  }

  if (!data?.sequence) return <div className="pt-20 grid place-items-center"><Spinner /></div>;
  const s = data.sequence;
  const steps = data.steps ?? [];

  return (
    <div>
      <Link href="/sequences" className="kicker inline-flex items-center gap-1.5 mb-5 hover:text-[var(--color-accent)]">
        <ArrowLeft size={12} /> Sequences
      </Link>

      <Reveal>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="kicker mb-2">{s.persona} · {s.tone}</div>
            <h1 className="font-display text-4xl tracking-tight">{s.name}</h1>
            <p className="text-[var(--color-ink-soft)] mt-2">{s.objective}</p>
          </div>
          <div className="flex items-center gap-2">
            <Pill tone={s.status === "active" ? "positive" : "default"}>{titleCase(s.status)}</Pill>
            {s.status !== "active" && (
              <span className="inline-flex items-center gap-1.5">
                <button onClick={launch} disabled={launching} className="btn btn-accent">
                  <Play size={14} /> {launching ? "Launching…" : "Launch sequence"}
                </button>
                <Explain
                  title="Launch sequence"
                  label="What does Launch sequence do?"
                  text="Starts the outreach plan — steps run automatically on schedule with the right wait between each touch."
                />
              </span>
            )}
          </div>
        </div>
      </Reveal>

      {/* Step timeline */}
      <div className="relative pl-8">
        <div className="absolute left-[15px] top-3 bottom-3 w-px bg-[var(--color-line-2)]" />
        <div className="space-y-4">
          {steps.map((step: any, i: number) => {
            const Icon = CHANNEL_ICON[step.channel] ?? Mail;
            return (
              <Reveal key={step.id} delay={0.05 * i}>
                <div className="relative">
                  <span className="absolute -left-[33px] top-3 grid place-items-center h-8 w-8 rounded-full bg-[var(--color-card)] border border-[var(--color-line-2)]">
                    <Icon size={14} className="text-[var(--color-accent)]" />
                  </span>
                  <div className="card p-5">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="numeral text-lg text-[var(--color-faint)]">{String(step.step_order).padStart(2, "0")}</span>
                        <span className="kicker">{step.channel}</span>
                        <Pill>Day {step.day_offset}</Pill>
                      </div>
                      <Pill tone={step.status === "scheduled" ? "accent" : "default"}>{step.status}</Pill>
                    </div>
                    <p className="text-[0.9rem] text-[var(--color-ink-2)]">{step.instruction}</p>
                    {step.content?.subject && (
                      <div className="mt-3 card-quiet p-4">
                        <div className="font-display text-lg">{step.content.subject}</div>
                        {step.content.body && (
                          <p className="text-[0.86rem] text-[var(--color-ink-soft)] mt-1 whitespace-pre-wrap leading-relaxed">
                            {step.content.body}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </div>
  );
}
