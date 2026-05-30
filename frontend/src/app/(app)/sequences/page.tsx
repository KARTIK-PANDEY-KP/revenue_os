"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { GitBranch } from "lucide-react";
import { api } from "@/lib/api";
import { Empty, PageHeader, Pill, Reveal, Spinner } from "@/components/ui";
import { timeAgo, titleCase } from "@/lib/format";

export default function SequencesPage() {
  const [sequences, setSequences] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.sequences().then((d) => setSequences(d.sequences ?? [])).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader
        kicker="Outbound"
        title="Sequences"
        sub="AI-generated multi-channel cadences. Trigger.dev runs the steps with real waits between touches."
        actions={<Link href="/accounts" className="btn btn-ghost"><GitBranch size={14} /> New from account</Link>}
      />

      {loading ? (
        <div className="pt-16 grid place-items-center"><Spinner /></div>
      ) : sequences.length === 0 ? (
        <Empty title="No sequences yet" hint="Open an account and hit “Sequence” to generate a personalized cadence." />
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {sequences.map((s, i) => (
            <Reveal key={s.id} delay={0.04 * i}>
              <Link href={`/sequences/${s.id}`} className="card p-5 block hover:border-[var(--color-ink)]">
                <div className="flex items-center justify-between mb-3">
                  <Pill tone={s.status === "active" ? "positive" : s.status === "draft" ? "default" : "accent"}>
                    {titleCase(s.status)}
                  </Pill>
                  <span className="kicker">{timeAgo(s.created_at)}</span>
                </div>
                <div className="font-display text-2xl leading-tight">{s.name}</div>
                <div className="font-mono text-[11px] text-[var(--color-ink-soft)] mt-1">{s.persona} · {s.objective}</div>
                <div className="flex gap-1.5 mt-4">
                  {(s.channels ?? []).map((c: string) => <Pill key={c}>{c}</Pill>)}
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}
