"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Phone } from "lucide-react";
import { api } from "@/lib/api";
import { Empty, PageHeader, Pill, Reveal, Spinner } from "@/components/ui";
import { timeAgo, titleCase } from "@/lib/format";

export default function CallsPage() {
  const [calls, setCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.calls().then((d) => setCalls(d.calls ?? [])).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader
        kicker="History"
        title="Calls"
        sub="Every call, transcribed in real time and summarized automatically."
        actions={<Link href="/dialer" className="btn btn-accent"><Phone size={14} /> New call</Link>}
      />

      {loading ? (
        <div className="pt-16 grid place-items-center"><Spinner /></div>
      ) : calls.length === 0 ? (
        <Empty title="No calls yet" hint="Head to the Dialer to make your first call." />
      ) : (
        <div className="card divide-y divide-[var(--color-line)]">
          {calls.map((c, i) => (
            <Reveal key={c.id} delay={Math.min(0.25, 0.03 * i)}>
              <Link href={`/coaching?call=${c.id}`} className="flex items-center justify-between px-5 py-4 hover:bg-[var(--color-paper-2)]/40">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="grid place-items-center h-10 w-10 rounded-full border border-[var(--color-line)]">
                    <Phone size={15} className="text-[var(--color-ink-soft)]" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium">{titleCase(c.disposition ?? c.status)}</div>
                    <div className="kicker mt-0.5">{timeAgo(c.created_at)} · {c.duration_secs ?? 0}s</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {c.summary && <p className="hidden md:block text-[0.82rem] text-[var(--color-ink-soft)] max-w-md line-clamp-1">{c.summary}</p>}
                  <Pill tone={c.status === "completed" ? "positive" : "default"}>{c.status}</Pill>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}
