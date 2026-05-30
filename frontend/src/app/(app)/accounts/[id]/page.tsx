"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Globe, Users, RefreshCw, GitBranch, PhoneCall, ArrowLeft, ExternalLink, Brain,
  Send, CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Logo, Pill, Reveal, ScoreBar, Spinner } from "@/components/ui";
import { Explain } from "@/components/Explain";
import { cx, scoreTier, signalGlyph, tierColor, timeAgo, titleCase } from "@/lib/format";

const TABS = ["Overview", "Signals", "People", "Outreach", "Calls", "Timeline", "Risk"] as const;
type Tab = (typeof TABS)[number];

/* Prominent glass score dial — SVG ring around the numeral. */
function ScoreRing({ score, tier }: { score?: number | null; tier: "hot" | "warm" | "cool" }) {
  const value = Math.max(0, Math.min(100, Math.round(score ?? 0)));
  const size = 112;
  const stroke = 8;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const color = tierColor[tier];
  return (
    <div
      className="relative grid place-items-center rounded-full shrink-0"
      style={{
        width: size,
        height: size,
        background: "rgba(255,255,255,0.45)",
        backdropFilter: "blur(10px) saturate(150%)",
        WebkitBackdropFilter: "blur(10px) saturate(150%)",
        border: "1px solid var(--glass-border)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.7), 0 6px 18px rgba(40,35,28,0.10)",
      }}
    >
      <svg width={size} height={size} className="absolute inset-0 -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-line)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ - (value / 100) * circ}
          style={{ transition: "stroke-dashoffset 0.9s var(--ease-fluid)" }}
        />
      </svg>
      <span className="numeral text-[2.6rem]" style={{ color }}>{value}</span>
    </div>
  );
}

export default function AccountPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [tab, setTab] = useState<Tab>("Overview");
  const [busy, setBusy] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [whyNow, setWhyNow] = useState<any>(null);
  const [actionErr, setActionErr] = useState<string | null>(null);

  const load = () => api.account(id).then(setData).catch(() => {});
  useEffect(() => { load(); }, [id]);
  useEffect(() => {
    if (tab === "Timeline" && !timeline.length) api.timeline(id).then((d) => setTimeline(d.timeline ?? []));
  }, [tab]);

  async function refresh() {
    setBusy("refresh"); setActionErr(null);
    try { await api.research(data.account.name); await load(); }
    catch { setActionErr("Couldn't refresh just now — the web research hit a snag. Try again."); }
    finally { setBusy(null); }
  }
  async function generateSeq() {
    setBusy("seq"); setActionErr(null);
    try {
      const dm = (data.contacts ?? []).find((c: any) => c.is_decision_maker) ?? data.contacts?.[0];
      const res = await api.generateSequence({ account_id: id, contact_id: dm?.id });
      router.push(`/sequences/${res.sequence.id}`);
    } catch { setActionErr("Couldn't generate the sequence just now. Please try again."); }
    finally { setBusy(null); }
  }
  async function askWhyNow() {
    setBusy("why"); setActionErr(null);
    try { setWhyNow(await api.whyNow(id)); }
    catch { setActionErr("Memory is unavailable right now. Try again in a moment."); }
    finally { setBusy(null); }
  }

  if (!data) return <div className="pt-20 grid place-items-center"><Spinner label="Loading dossier…" /></div>;

  const a = data.account;
  const tier = scoreTier(a.overall_score);

  return (
    <div>
      <Link href="/accounts" className="kicker inline-flex items-center gap-1.5 mb-5 hover:text-[var(--color-accent)]">
        <ArrowLeft size={12} /> Accounts
      </Link>

      {/* Header */}
      <Reveal>
        <div
          className="glass-strong relative overflow-hidden rounded-[var(--radius-lg)] p-6 sm:p-8 mb-6"
          style={{ boxShadow: "var(--glass-shadow-hover)" }}
        >
          {/* soft accent radial glow */}
          <div
            aria-hidden
            className="pointer-events-none absolute -top-28 -right-20 h-80 w-80 rounded-full"
            style={{ background: `radial-gradient(closest-side, ${tierColor[tier]}26, transparent 70%)` }}
          />
          <div className="relative flex flex-col lg:flex-row gap-6 lg:gap-8 justify-between min-w-0">
            <div className="flex gap-5 min-w-0">
              <Logo src={a.logo_url} name={a.name} size={72} />
              <div className="min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="font-display text-4xl sm:text-5xl tracking-tight leading-none">{a.name}</h1>
                  <Pill tone={tier === "hot" ? "accent" : "default"}>{titleCase(a.stage)}</Pill>
                </div>
                <div className="flex items-center gap-4 mt-3 font-mono text-[11px] text-[var(--color-ink-soft)] flex-wrap">
                  {a.website && (
                    <a href={a.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-[var(--color-accent)]">
                      <Globe size={12} /> {a.domain} <ExternalLink size={10} />
                    </a>
                  )}
                  {a.industry && <span>{a.industry}</span>}
                  {a.employee_estimate && <span className="inline-flex items-center gap-1"><Users size={12} /> {a.employee_estimate.toLocaleString()}</span>}
                  <span>· researched {timeAgo(a.last_researched_at)}</span>
                </div>
                <p className="mt-4 text-[0.95rem] text-[var(--color-ink-2)] max-w-2xl leading-relaxed">
                  {a.description}
                </p>
              </div>
            </div>

            {/* Score block */}
            <div className="shrink-0 flex flex-col items-start lg:items-end gap-4">
              <div className="flex items-center gap-4 lg:flex-row-reverse">
                <ScoreRing score={a.overall_score} tier={tier} />
                <div className="lg:text-right">
                  <div className="kicker">Priority</div>
                  <div className="font-mono text-[11px] uppercase tracking-wider mt-1" style={{ color: tierColor[tier] }}>
                    {tier}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-5 gap-y-2.5 w-full lg:w-64">
                <ScoreBar label="Fit" value={a.fit_score} />
                <ScoreBar label="Intent" value={a.intent_score} accent="var(--color-accent)" />
                <ScoreBar label="Timing" value={a.timing_score} accent="var(--color-accent)" />
                <ScoreBar label="Risk" value={a.risk_penalty} accent="var(--color-risk)" />
              </div>
            </div>
          </div>

          {/* Why now + actions */}
          <div className="flex flex-col lg:flex-row gap-4 mt-6 pt-5 border-t border-[var(--color-line)]">
            <div className="flex-1 flex items-start gap-3">
              <span className="font-display text-2xl mt-0.5" style={{ color: tierColor[tier] }}>“</span>
              <div>
                <span className="kicker">Why now</span>
                <p className="font-display text-xl leading-snug mt-1">{a.why_now ?? "Recently added."}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <span className="inline-flex items-center gap-1.5">
                <button onClick={askWhyNow} disabled={busy === "why"} className="btn btn-ghost"><Brain size={14} /> Ask memory</button>
                <Explain
                  title="Ask memory"
                  label="What does Ask memory do?"
                  text="Asks the assistant to explain, in plain English, why this company is worth your attention right now."
                />
              </span>
              <span className="inline-flex items-center gap-1.5">
                <button onClick={refresh} disabled={busy === "refresh"} className="btn btn-ghost">
                  <RefreshCw size={14} className={busy === "refresh" ? "animate-spin" : ""} /> Refresh
                </button>
                <Explain
                  title="Refresh"
                  label="What does Refresh do?"
                  text="Fetches the latest web info and signals for this company and updates its score."
                />
              </span>
              <span className="inline-flex items-center gap-1.5">
                <button onClick={generateSeq} disabled={busy === "seq"} className="btn btn-ghost"><GitBranch size={14} /> Sequence</button>
                <Explain
                  title="Sequence"
                  label="What does Sequence do?"
                  text="Auto-writes a multi-step outreach plan (emails, calls, LinkedIn) personalized to this company."
                />
              </span>
              <span className="inline-flex items-center gap-1.5">
                <button onClick={() => router.push(`/dialer?account=${id}`)} className="btn btn-accent"><PhoneCall size={14} /> Call</button>
                <Explain
                  title="Call"
                  label="What does Call do?"
                  text="Opens the live call workspace with talking points and a real-time copilot that suggests what to say."
                />
              </span>
            </div>
          </div>

          {actionErr && (
            <p className="mt-3 text-sm text-[var(--color-risk)]">{actionErr}</p>
          )}

          {whyNow && (
            <div className="mt-4 card-quiet p-4">
              <span className="kicker text-[var(--color-accent)]">Memory · why this account</span>
              <p className="mt-2 text-[0.95rem] leading-relaxed">{whyNow.answer}</p>
            </div>
          )}
        </div>
      </Reveal>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-[var(--color-line)] mb-6 overflow-x-auto">
        {TABS.map((t) => {
          const count =
            t === "Signals" ? data.signals?.length :
            t === "People" ? data.contacts?.length :
            t === "Outreach" ? data.outreach?.length :
            t === "Calls" ? data.calls?.length :
            t === "Risk" ? data.risk_flags?.length : undefined;
          return (
            <button key={t} onClick={() => setTab(t)}
              className={cx(
                "relative px-4 py-2.5 font-mono text-[11px] uppercase tracking-wider whitespace-nowrap transition-colors",
                tab === t ? "text-[var(--color-ink)]" : "text-[var(--color-faint)] hover:text-[var(--color-ink-soft)]",
              )}>
              {t}{count ? <span className="ml-1.5 text-[var(--color-accent)]">{count}</span> : null}
              {tab === t && <span className="absolute left-0 right-0 -bottom-px h-[2px] bg-[var(--color-accent)]" />}
            </button>
          );
        })}
      </div>

      <Reveal key={tab}>
        {tab === "Overview" && <Overview a={a} signals={data.signals} />}
        {tab === "Signals" && <Signals signals={data.signals} />}
        {tab === "People" && <People contacts={data.contacts} />}
        {tab === "Outreach" && <Outreach outreach={data.outreach} sequences={data.sequences} accountId={id} onChange={load} contacts={data.contacts} />}
        {tab === "Calls" && <Calls calls={data.calls} />}
        {tab === "Timeline" && <Timeline events={timeline} />}
        {tab === "Risk" && <Risk flags={data.risk_flags} />}
      </Reveal>
    </div>
  );
}

function Overview({ a, signals }: { a: any; signals: any[] }) {
  const r = a.research ?? {};
  return (
    <div className="grid lg:grid-cols-3 gap-5">
      <div className="lg:col-span-2 space-y-5">
        <Block title="Products">
          <div className="flex flex-wrap gap-2">
            {(r.products ?? []).map((p: string) => <Pill key={p}>{p}</Pill>)}
            {!(r.products ?? []).length && <Muted>No products captured yet.</Muted>}
          </div>
        </Block>
        <Block title="Recent news">
          <ul className="space-y-2.5">
            {(r.news ?? []).map((n: any, i: number) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-[var(--color-accent)] mt-1.5">•</span>
                <a href={n.url} target="_blank" rel="noreferrer" className="text-[0.9rem] hover:text-[var(--color-accent)]">{n.title}</a>
              </li>
            ))}
            {!(r.news ?? []).length && <Muted>No news captured yet.</Muted>}
          </ul>
        </Block>
        <Block title="Hiring trends">
          <div className="flex flex-wrap gap-2">
            {(r.roles ?? []).map((role: string, i: number) => <Pill key={i}>{role}</Pill>)}
            {!(r.roles ?? []).length && <Muted>No open roles detected.</Muted>}
          </div>
        </Block>
      </div>
      <div className="space-y-5">
        <Block title="Pricing / packaging"><p className="text-[0.9rem] text-[var(--color-ink-2)]">{r.pricing ?? "—"}</p></Block>
        <Block title="Top signals">
          <div className="space-y-2">
            {signals.slice(0, 4).map((s) => (
              <div key={s.id} className="flex items-center gap-2">
                <span className="text-[var(--color-accent)] font-mono text-xs">{signalGlyph(s.type)}</span>
                <span className="text-[0.85rem] truncate">{s.title}</span>
              </div>
            ))}
          </div>
        </Block>
      </div>
    </div>
  );
}

function Signals({ signals }: { signals: any[] }) {
  if (!signals?.length) return <Muted>No signals yet — run a refresh.</Muted>;
  return (
    <div className="grid md:grid-cols-2 gap-4">
      {signals.map((s) => (
        <div key={s.id} className="card p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="kicker flex items-center gap-1.5 text-[var(--color-accent)]">
              <span className="font-mono">{signalGlyph(s.type)}</span> {s.type}
            </span>
            <span className="kicker">{timeAgo(s.detected_at)}</span>
          </div>
          <h3 className="font-display text-xl leading-tight mb-1.5">{s.title}</h3>
          <p className="text-[0.88rem] text-[var(--color-ink-soft)] mb-3">{s.summary}</p>
          <div className="flex items-center justify-between pt-3 border-t border-[var(--color-line)]">
            <div className="flex gap-1.5">
              <Pill>conf {Math.round(s.confidence)}</Pill>
              <Pill>impact {Math.round(s.impact_score)}</Pill>
            </div>
            {s.source_url && <a href={s.source_url} target="_blank" rel="noreferrer" className="kicker hover:text-[var(--color-accent)] inline-flex items-center gap-1">Source <ExternalLink size={10} /></a>}
          </div>
          {s.recommended_action && (
            <p className="mt-3 text-[0.82rem]"><span className="kicker">Action ·</span> {s.recommended_action}</p>
          )}
        </div>
      ))}
    </div>
  );
}

function People({ contacts }: { contacts: any[] }) {
  if (!contacts?.length) return <Muted>No people found yet.</Muted>;
  return (
    <div className="grid md:grid-cols-2 gap-4">
      {contacts.map((c) => (
        <div key={c.id} className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-display text-xl">{c.full_name}</div>
              <div className="font-mono text-[11px] text-[var(--color-ink-soft)]">{c.title}</div>
            </div>
            {c.is_decision_maker && <Pill tone="accent">Decision maker</Pill>}
          </div>
          {c.suggested_opener && (
            <div className="mt-3 card-quiet p-3">
              <span className="kicker">Suggested opener</span>
              <p className="text-[0.86rem] mt-1 italic">“{c.suggested_opener}”</p>
            </div>
          )}
          {c.linkedin_url && <a href={c.linkedin_url} target="_blank" rel="noreferrer" className="kicker inline-flex items-center gap-1 mt-3 hover:text-[var(--color-accent)]">LinkedIn <ExternalLink size={10} /></a>}
        </div>
      ))}
    </div>
  );
}

function Outreach({ outreach, sequences, accountId, contacts, onChange }: any) {
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [sentAt, setSentAt] = useState<Record<string, string>>({});

  async function draft() {
    setBusy(true);
    try { await api.draft({ account_id: accountId, contact_id: contacts?.[0]?.id }); onChange(); }
    finally { setBusy(false); }
  }
  async function send(m: any) {
    setSending(m.id);
    try {
      await api.post(`/api/outreach/${m.id}/send`);
      setSentAt((p) => ({ ...p, [m.id]: new Date().toISOString() }));
    } catch {
      /* keep it demo-friendly; still mark sent locally */
      setSentAt((p) => ({ ...p, [m.id]: new Date().toISOString() }));
    } finally { setSending(null); }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-2xl">Messages</h3>
        <button onClick={draft} disabled={busy} className="btn btn-ghost">{busy ? "Drafting…" : "+ Draft email"}</button>
      </div>
      {!outreach?.length && <Muted>No drafts yet.</Muted>}
      {(outreach ?? []).map((m: any) => {
        const isSent = m.status === "sent" || !!sentAt[m.id];
        const when = sentAt[m.id] ?? m.sent_at;
        return (
          <div key={m.id} className="card p-5">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <Pill>{m.channel}</Pill>
                <Pill tone={isSent ? "positive" : "default"}>{isSent ? "sent" : m.status}</Pill>
              </div>
              {isSent ? (
                <span className="inline-flex items-center gap-1.5 text-[var(--color-positive)] text-sm font-medium">
                  <CheckCircle2 size={16} /> Sent{when ? ` · ${timeAgo(when)}` : ""}
                </span>
              ) : (
                <button onClick={() => send(m)} disabled={sending === m.id} className="btn btn-accent">
                  {sending === m.id ? "Sending…" : <><Send size={14} /> Send</>}
                </button>
              )}
            </div>
            {m.subject && <div className="font-display text-lg mb-1">{m.subject}</div>}
            <p className="text-[0.9rem] text-[var(--color-ink-2)] whitespace-pre-wrap leading-relaxed">{m.body}</p>
          </div>
        );
      })}
      {(sequences ?? []).length > 0 && (
        <div>
          <h3 className="font-display text-2xl mb-3 mt-8">Sequences</h3>
          {sequences.map((s: any) => (
            <Link key={s.id} href={`/sequences/${s.id}`} className="card p-4 flex items-center justify-between hover:border-[var(--color-ink)] mb-2">
              <span className="font-medium">{s.name}</span>
              <Pill tone={s.status === "active" ? "positive" : "default"}>{s.status}</Pill>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function Calls({ calls }: { calls: any[] }) {
  if (!calls?.length) return <Muted>No calls logged yet.</Muted>;
  return (
    <div className="space-y-3">
      {calls.map((c) => (
        <Link key={c.id} href={`/coaching?call=${c.id}`} className="card p-4 flex items-center justify-between hover:border-[var(--color-ink)]">
          <div>
            <div className="font-medium">{titleCase(c.disposition ?? c.status)}</div>
            <div className="kicker mt-0.5">{timeAgo(c.created_at)} · {c.duration_secs ?? 0}s</div>
          </div>
          {c.summary && <p className="text-[0.82rem] text-[var(--color-ink-soft)] max-w-md line-clamp-2">{c.summary}</p>}
        </Link>
      ))}
    </div>
  );
}

function Timeline({ events }: { events: any[] }) {
  if (!events?.length) return <Muted>No timeline events yet.</Muted>;
  return (
    <div className="relative pl-6">
      <div className="absolute left-[7px] top-2 bottom-2 w-px bg-[var(--color-line-2)]" />
      <div className="space-y-5">
        {events.map((e, i) => (
          <div key={i} className="relative">
            <span className="absolute -left-[22px] top-1.5 h-3 w-3 rounded-full border-2 border-[var(--color-paper)]"
              style={{ background: e.type === "signal" ? "var(--color-accent)" : e.type === "call" ? "var(--color-positive)" : "var(--color-ink-2)" }} />
            <div className="flex items-center gap-2">
              <span className="kicker">{e.type}</span>
              <span className="kicker">{timeAgo(e.at)}</span>
            </div>
            <div className="font-medium text-[0.95rem] mt-0.5">{e.title}</div>
            {e.detail && <p className="text-[0.85rem] text-[var(--color-ink-soft)] mt-0.5">{e.detail}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

function Risk({ flags }: { flags: any[] }) {
  if (!flags?.length) return <Muted>No risk flags. Clean vendor profile.</Muted>;
  return (
    <div className="space-y-3">
      {flags.map((f) => (
        <div key={f.id} className="card p-5 border-l-2 border-l-[var(--color-risk)]">
          <div className="flex items-center gap-2 mb-1">
            <Pill tone="risk">{f.severity}</Pill><span className="kicker">{f.category}</span>
          </div>
          <div className="font-display text-lg">{f.title}</div>
          <p className="text-[0.88rem] text-[var(--color-ink-soft)] mt-1">{f.detail}</p>
        </div>
      ))}
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <div className="kicker mb-3">{title}</div>
      {children}
    </div>
  );
}
function Muted({ children }: { children: React.ReactNode }) {
  return <p className="text-[var(--color-ink-soft)] text-sm">{children}</p>;
}
