"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Mic, MicOff, PhoneOff, PhoneForwarded, Circle, Phone, Lightbulb, Sparkles,
  Bot, Lock, Radio,
} from "lucide-react";
import { Room, createLocalAudioTrack, type LocalAudioTrack } from "livekit-client";
import { api } from "@/lib/api";
import { Logo, Pill, Spinner } from "@/components/ui";
import { Explain } from "@/components/Explain";
import { cx, signalGlyph, formatPhone } from "@/lib/format";

function wsUrl(callId: string): string {
  const base = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";
  // simulate=1 plays the scripted agent ↔ prospect conversation that drives the
  // transcript, the agent's spoken voice (TTS), and the live reasoning panel.
  return base.replace(/^http/, "ws") + `/api/voice/ws/${callId}?simulate=1`;
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

type Status = "select" | "ready" | "dialing" | "live" | "ended";
type LiveMode = "live" | "simulated";

function DialerInner() {
  const params = useSearchParams();
  const accountId = params.get("account");

  const [status, setStatus] = useState<Status>("select");
  const [accounts, setAccounts] = useState<any[]>([]);
  const [session, setSession] = useState<any>(null); // {call, prep, livekit, speechmatics}
  const [transcript, setTranscript] = useState<any[]>([]);
  const [copilot, setCopilot] = useState<any[]>([]);
  const [muted, setMuted] = useState(false);
  const [recording, setRecording] = useState(true);
  const [notes, setNotes] = useState("");
  const [disposition, setDisposition] = useState("connected");
  const [result, setResult] = useState<any>(null);
  const [seconds, setSeconds] = useState(0);
  const [liveMode, setLiveMode] = useState<LiveMode>("simulated");

  const wsRef = useRef<WebSocket | null>(null);
  const roomRef = useRef<Room | null>(null);
  const micRef = useRef<LocalAudioTrack | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (accountId) startSession(accountId);
    else api.accounts("?sort=overall_score").then((d) => setAccounts(d.accounts ?? []));
    return () => teardown();
  }, [accountId]);

  useEffect(() => {
    if (status !== "live") return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [status]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [transcript]);

  function teardown() {
    wsRef.current?.close();
    wsRef.current = null;
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    roomRef.current?.disconnect().catch(() => {});
    roomRef.current = null;
    micRef.current = null;
  }

  async function startSession(id: string) {
    const s = await api.createCall({ account_id: id });
    setSession(s);
    setStatus("ready");
  }

  // Voice the AI agent's lines aloud (scripted/simulated agent voice). The user
  // hears the agent through their speakers; their mic is published to the room.
  function speakAgent(text: string) {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.03;
    u.pitch = 1;
    const v = window.speechSynthesis.getVoices().find((x) => /en[-_]/i.test(x.lang));
    if (v) u.voice = v;
    window.speechSynthesis.speak(u);
  }

  // Join a genuine LiveKit room (real WebRTC + mic publish). Returns true when a
  // live room is established; false → run the same flow as a visual simulation.
  async function connectRoom(): Promise<boolean> {
    const lk = session?.livekit;
    if (!lk?.token || !lk?.url || lk.mock || String(lk.url).includes("mock")) return false;
    try {
      const room = new Room();
      roomRef.current = room;
      await room.connect(lk.url, lk.token);
      try {
        const mic = await createLocalAudioTrack();
        micRef.current = mic;
        await room.localParticipant.publishTrack(mic);
      } catch {
        // Mic permission denied — still a real room, just nothing published.
      }
      return true;
    } catch {
      roomRef.current?.disconnect().catch(() => {});
      roomRef.current = null;
      return false;
    }
  }

  function openTranscriptStream() {
    const ws = new WebSocket(wsUrl(session.call.id));
    wsRef.current = ws;
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.event === "transcript") {
        setTranscript((t) => [...t, msg.segment]);
        if (msg.segment?.speaker === "rep") speakAgent(msg.segment.text);
      }
      if (msg.event === "copilot") setCopilot((c) => [{ ...msg.copilot, at: Date.now() }, ...c]);
      if (msg.event === "done")
        setCopilot((c) => [{ kind: "wrap up", suggestion: "Conversation complete — end the call to generate the summary and scorecard.", source: "system", at: Date.now() }, ...c]);
    };
    ws.onerror = () => {};
  }

  async function beginCall() {
    if (!session) return;
    setTranscript([]);
    setCopilot([]);
    setSeconds(0);
    setStatus("dialing");

    // Try a real LiveKit room; either way, ring briefly for realism then go live.
    const connected = await connectRoom();
    setLiveMode(connected ? "live" : "simulated");
    await wait(1700);

    setStatus("live");
    openTranscriptStream();
  }

  function toggleMute() {
    setMuted((m) => {
      const next = !m;
      const t = micRef.current;
      if (t) (next ? t.mute() : t.unmute());
      return next;
    });
  }

  async function endCall() {
    teardown();
    const res = await api.endCall(session.call.id, { disposition, notes, duration_secs: seconds });
    setResult(res);
    setStatus("ended");
  }

  const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secs = String(seconds % 60).padStart(2, "0");
  const prep = session?.prep;
  const account = prep?.account;
  const contact = prep?.contact;
  const phone = formatPhone(contact?.phone);

  return (
    <div className="focus-room -mx-5 sm:-mx-8 lg:-mx-10 -my-7 min-h-[calc(100vh-2.25rem)] px-5 sm:px-8 lg:px-10 py-7">
      {status === "select" && (
        <div className="max-w-2xl">
          <div className="kicker mb-2">AI voice agent</div>
          <h1 className="font-display text-4xl mb-2 text-[var(--color-ink)]">Who should the agent call?</h1>
          <p className="text-[var(--color-ink-soft)] mb-6">Pick an account and the RevenueOS AI agent will place the call, run discovery, and handle objections live.</p>
          <div className="space-y-2">
            {accounts.slice(0, 8).map((a) => (
              <button key={a.id} onClick={() => startSession(a.id)}
                className="card w-full p-4 flex items-center justify-between hover:border-[var(--color-accent)] text-left">
                <div className="flex items-center gap-3">
                  <Logo src={a.logo_url} name={a.name} size={36} />
                  <div>
                    <div className="font-medium text-[var(--color-ink)]">{a.name}</div>
                    <div className="kicker">{a.why_now}</div>
                  </div>
                </div>
                <span className="numeral text-2xl" style={{ color: "var(--color-accent)" }}>{Math.round(a.overall_score)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {(status === "ready" || status === "dialing" || status === "live") && session && (
        <div className="grid lg:grid-cols-[320px_1fr_360px] gap-5 h-full">
          {/* Left — prospect context */}
          <div className="space-y-4">
            <div className="card p-5">
              <div className="flex items-center gap-3 mb-3">
                <Logo src={account?.logo_url} name={account?.name ?? "?"} size={48} />
                <div>
                  <div className="font-display text-2xl text-[var(--color-ink)]">{account?.name}</div>
                  <div className="kicker">{contact?.full_name ?? "Decision maker"} · {contact?.title ?? ""}</div>
                </div>
              </div>
              {phone && (
                <div className="flex items-center gap-2 mb-3 text-[0.9rem] text-[var(--color-ink-2)] font-mono">
                  <Phone size={13} className="text-[var(--color-accent)]" /> {phone}
                </div>
              )}
              <p className="text-[0.85rem] text-[var(--color-ink-soft)] leading-relaxed">{account?.description}</p>
            </div>

            <div className="card p-5">
              <div className="kicker mb-2 text-[var(--color-accent)]">Agent opener</div>
              <p className="font-display text-lg leading-snug text-[var(--color-ink)]">{prep?.opener}</p>
            </div>

            <div className="card p-5">
              <div className="kicker mb-3">Recent signals</div>
              <div className="space-y-2">
                {(prep?.signals ?? []).slice(0, 4).map((s: any) => (
                  <div key={s.id} className="flex items-start gap-2 text-[0.82rem] text-[var(--color-ink-2)]">
                    <span className="text-[var(--color-accent)] font-mono mt-0.5">{signalGlyph(s.type)}</span> {s.title}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Center — call stage */}
          <div className="card p-6 flex flex-col items-center justify-center text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-[0.06]"
              style={{ background: "radial-gradient(circle at 50% 40%, var(--color-accent), transparent 60%)" }} />
            <div className="relative">
              <div className="relative inline-grid place-items-center">
                {status === "dialing" && (
                  <span className="absolute inset-0 rounded-full border border-[var(--color-accent)] animate-ping" />
                )}
                <Logo src={account?.logo_url} name={account?.name ?? "?"} size={96} />
              </div>
              <div className="font-display text-3xl mt-5 text-[var(--color-ink)]">{account?.name}</div>

              {/* Agent identity */}
              <div className="inline-flex items-center gap-1.5 mt-2 text-[0.78rem] text-[var(--color-ink-soft)] font-mono">
                <Bot size={13} className="text-[var(--color-accent)]" /> RevenueOS AI agent
              </div>

              <div className="kicker mt-2">
                {status === "live" ? (
                  <span className="inline-flex items-center gap-2 text-[var(--color-accent)]">
                    <Circle size={7} fill="currentColor" className="live-dot" /> Live · {mins}:{secs}
                  </span>
                ) : status === "dialing" ? (
                  <span className="inline-flex items-center gap-2 text-[var(--color-accent)]">
                    <Radio size={12} className="live-dot" /> Dialing {phone || contact?.full_name}…
                  </span>
                ) : (
                  <span>{phone ? <>Ready to dial {phone}</> : "Ready to dial"}</span>
                )}
              </div>

              {/* Connection mode badge (real LiveKit room vs simulated) */}
              {(status === "live" || status === "dialing") && (
                <div className="mt-2 flex justify-center">
                  {liveMode === "live" ? (
                    <span className="inline-flex items-center gap-1.5 text-[0.7rem] font-mono text-[var(--color-positive)]">
                      <Lock size={11} /> Secure LiveKit room
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-[0.7rem] font-mono text-[var(--color-faint)]"
                      title="Set LIVEKIT_URL / API keys to place the call in a real WebRTC room.">
                      <Radio size={11} /> Simulated room · add LiveKit keys for live audio
                    </span>
                  )}
                </div>
              )}

              {status === "live" && <Waveform muted={muted} />}

              <div className="flex items-center justify-center gap-3 mt-8">
                {status === "ready" ? (
                  <span className="inline-flex items-center gap-2">
                    <button onClick={beginCall} className="btn btn-accent text-base px-6 py-3">
                      <Phone size={16} /> Start call
                    </button>
                    <Explain
                      title="Start call"
                      label="What does Start call do?"
                      text="The RevenueOS AI agent places the call, joins a live voice room, and talks to the prospect — you'll see the transcript and the agent's reasoning in real time."
                    />
                  </span>
                ) : status === "dialing" ? (
                  <span className="kicker text-[var(--color-faint)]">Connecting…</span>
                ) : (
                  <>
                    <CtrlBtn active={muted} onClick={toggleMute} icon={muted ? MicOff : Mic} label="Mute" />
                    <CtrlBtn icon={PhoneForwarded} label="Transfer" />
                    <CtrlBtn active={recording} onClick={() => setRecording((r) => !r)} icon={Circle} label="Record" accent />
                    <button onClick={endCall} className="grid place-items-center h-14 w-14 rounded-full bg-[var(--color-risk)] text-white hover:opacity-90">
                      <PhoneOff size={20} />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Bottom — notes + disposition */}
            {status === "live" && (
              <div className="relative w-full mt-8 pt-5 border-t border-[var(--color-line)]">
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                  placeholder="Call notes…" rows={2}
                  className="w-full bg-transparent outline-none text-sm text-[var(--color-ink-2)] resize-none placeholder:text-[var(--color-faint)]" />
                <div className="flex items-center gap-2 mt-2">
                  <span className="kicker">Disposition</span>
                  <select value={disposition} onChange={(e) => setDisposition(e.target.value)}
                    className="bg-transparent outline-none font-mono text-[11px] uppercase text-[var(--color-ink)] cursor-pointer">
                    {["connected", "meeting_booked", "callback", "voicemail", "not_interested", "no_answer"].map((d) => (
                      <option key={d} value={d}>{d.replace("_", " ")}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Right — transcript + agent reasoning */}
          <div className="space-y-4 flex flex-col">
            <div className="card flex-1 flex flex-col min-h-[280px]">
              <div className="px-4 py-3 border-b border-[var(--color-line)] flex items-center justify-between">
                <span className="kicker">Live transcript</span>
                <span className="kicker flex items-center gap-1.5 text-[var(--color-accent)]"><Circle size={6} fill="currentColor" className="live-dot" /> Realtime</span>
              </div>
              <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 max-h-[40vh]">
                {transcript.length === 0 && <p className="text-[var(--color-faint)] text-sm">Transcript appears here once the agent connects…</p>}
                {transcript.map((t, i) => {
                  const isAgent = t.speaker === "rep";
                  return (
                    <div key={i} className={cx("text-[0.86rem]", isAgent ? "text-[var(--color-ink)]" : "text-[var(--color-ink-2)]")}>
                      <span className={cx("kicker mr-2", isAgent && "text-[var(--color-accent)]")}>
                        {isAgent ? "AI agent" : "prospect"}
                      </span>{t.text}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card">
              <div className="px-4 py-3 border-b border-[var(--color-line)] flex items-center gap-2">
                <Lightbulb size={14} className="text-[var(--color-accent)]" />
                <span className="kicker text-[var(--color-accent)]">Agent reasoning</span>
              </div>
              <div className="px-4 py-3 space-y-2 max-h-[28vh] overflow-y-auto">
                {copilot.length === 0 && <p className="text-[var(--color-faint)] text-sm">The agent's reasoning and next moves appear here as the call unfolds…</p>}
                {copilot.map((c, i) => (
                  <div key={i} className={cx("p-3 rounded-[var(--radius)] border", i === 0 ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]/10" : "border-[var(--color-line)]")}>
                    <div className="kicker mb-1 flex items-center gap-1.5">
                      <Sparkles size={10} /> {c.kind?.replace(/[:_]/g, " ")}
                    </div>
                    <p className="text-[0.86rem] text-[var(--color-ink)]">{c.suggestion}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {status === "ended" && result && <PostCall result={result} account={account} onNew={() => location.assign("/dialer")} />}
    </div>
  );
}

function Waveform({ muted }: { muted: boolean }) {
  return (
    <div className="flex items-end justify-center gap-1 h-12 mt-6">
      {Array.from({ length: 28 }).map((_, i) => (
        <span key={i} className="w-[3px] rounded-full bg-[var(--color-accent)]"
          style={{
            height: muted ? "4px" : `${20 + Math.abs(Math.sin(i * 0.7)) * 70}%`,
            animation: muted ? "none" : `pulse-dot ${0.7 + (i % 5) * 0.18}s ease-in-out infinite`,
            opacity: muted ? 0.3 : 1,
          }} />
      ))}
    </div>
  );
}

function CtrlBtn({ icon: Icon, label, onClick, active, accent }: any) {
  return (
    <button onClick={onClick}
      className={cx("grid place-items-center h-14 w-14 rounded-full border transition-colors",
        active ? (accent ? "border-[var(--color-accent)] text-[var(--color-accent)]" : "border-[var(--color-ink)] bg-[var(--color-paper-2)]") : "border-[var(--color-line-2)] text-[var(--color-ink-soft)] hover:border-[var(--color-ink)]")}
      title={label}>
      <Icon size={18} fill={accent && active ? "currentColor" : "none"} />
    </button>
  );
}

function PostCall({ result, account, onNew }: any) {
  const sc = result.scorecard ?? {};
  const bars = [
    ["Discovery", sc.discovery_score], ["Objections", sc.objection_handling_score],
    ["Personalization", sc.personalization_score], ["Next step", sc.next_step_score],
    ["Qualification", sc.qualification_score],
  ];
  return (
    <div className="max-w-3xl mx-auto">
      <div className="kicker mb-2 text-[var(--color-accent)]">Call complete</div>
      <h1 className="font-display text-4xl mb-2 text-[var(--color-ink)]">Here’s what happened.</h1>
      <p className="text-[var(--color-ink-soft)] mb-6">AI summary, scorecard, and a follow-up draft — already saved to memory.</p>

      <div className="card p-5 mb-4">
        <div className="kicker mb-2">Summary</div>
        <p className="text-[0.95rem] leading-relaxed text-[var(--color-ink)]">{result.summary}</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="flex items-baseline justify-between mb-4">
            <span className="kicker">Scorecard</span>
            <span className="numeral text-4xl" style={{ color: "var(--color-accent)" }}>{Math.round(sc.overall_score ?? 0)}</span>
          </div>
          <div className="space-y-3">
            {bars.map(([label, v]: any) => (
              <div key={label}>
                <div className="flex justify-between mb-1"><span className="kicker">{label}</span><span className="numeral text-sm text-[var(--color-ink)]">{Math.round(v ?? 0)}</span></div>
                <div className="h-[3px] bg-[var(--color-line)] rounded-full overflow-hidden">
                  <div className="h-full bg-[var(--color-accent)] rule-draw" style={{ width: `${v ?? 0}%` }} />
                </div>
              </div>
            ))}
            <div className="pt-2"><span className="kicker">Talk ratio</span> <span className="numeral text-sm text-[var(--color-ink)]">{Math.round(sc.talk_ratio ?? 0)}% agent</span></div>
          </div>
        </div>
        <div className="card p-5">
          <div className="kicker mb-3">Improvements</div>
          <ul className="space-y-2">
            {(sc.improvements ?? []).map((imp: string, i: number) => (
              <li key={i} className="flex items-start gap-2 text-[0.88rem] text-[var(--color-ink-2)]">
                <span className="text-[var(--color-accent)] mt-0.5">→</span> {imp}
              </li>
            ))}
          </ul>
          {sc.objections_detected?.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {sc.objections_detected.map((o: string) => <Pill key={o} tone="warn">{o}</Pill>)}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2 mt-6">
        <button onClick={onNew} className="btn btn-accent"><Phone size={14} /> New call</button>
        {account && <a href={`/accounts/${account.id}`} className="btn btn-ghost">View account →</a>}
      </div>
    </div>
  );
}

export default function DialerPage() {
  return (
    <Suspense fallback={<div className="pt-20 grid place-items-center"><Spinner /></div>}>
      <DialerInner />
    </Suspense>
  );
}
