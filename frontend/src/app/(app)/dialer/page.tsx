"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Mic, MicOff, PhoneOff, PhoneForwarded, Circle, Phone, Sparkles,
  Bot, Lock, Radio, Send, Ear,
} from "lucide-react";
import { Room } from "livekit-client";
import { api } from "@/lib/api";
import { Logo, Pill, Spinner } from "@/components/ui";
import { Explain } from "@/components/Explain";
import { cx, signalGlyph, formatPhone } from "@/lib/format";

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

type Status = "select" | "ready" | "dialing" | "live" | "ended";
type LiveMode = "live" | "simulated";
type Conv = "idle" | "listening" | "thinking" | "speaking";
type Turn = { speaker: "agent" | "prospect"; text: string };

function DialerInner() {
  const params = useSearchParams();
  const accountId = params.get("account");
  const contactId = params.get("contact");
  const autostart = params.get("start") === "1";
  const startedRef = useRef(false);

  const [status, setStatus] = useState<Status>("select");
  const [accounts, setAccounts] = useState<any[]>([]);
  const [session, setSession] = useState<any>(null); // {call, prep, livekit, speechmatics}
  const [transcript, setTranscript] = useState<Turn[]>([]);
  const [convState, setConvState] = useState<Conv>("idle");
  const [muted, setMuted] = useState(false);
  const [recording, setRecording] = useState(true);
  const [notes, setNotes] = useState("");
  const [disposition, setDisposition] = useState("connected");
  const [result, setResult] = useState<any>(null);
  const [seconds, setSeconds] = useState(0);
  const [liveMode, setLiveMode] = useState<LiveMode>("simulated");
  const [error, setError] = useState<string | null>(null);
  const [sttSupported, setSttSupported] = useState(true);
  const [typed, setTyped] = useState("");

  const roomRef = useRef<Room | null>(null);
  const recRef = useRef<any>(null);
  const histRef = useRef<Turn[]>([]);
  const liveRef = useRef(false);
  const mutedRef = useRef(false);
  const convRef = useRef<Conv>("idle");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" &&
      !((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)) {
      setSttSupported(false);
    }
  }, []);

  useEffect(() => {
    if (accountId) startSession(accountId);
    else api.accounts("?sort=overall_score").then((d) => setAccounts(d.accounts ?? []));
    return () => teardown();
  }, [accountId]);

  // Auto-begin the call when launched from a sequence's Call step (?start=1).
  useEffect(() => {
    if (autostart && status === "ready" && session && !startedRef.current) {
      startedRef.current = true;
      beginCall();
    }
  }, [autostart, status, session]);

  useEffect(() => {
    if (status !== "live") return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [status]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [transcript]);

  function setConv(s: Conv) {
    convRef.current = s;
    setConvState(s);
  }

  function teardown() {
    liveRef.current = false;
    stopListening();
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    roomRef.current?.disconnect().catch(() => {});
    roomRef.current = null;
  }

  async function startSession(id: string) {
    setError(null);
    try {
      // createCall returns fast (DB-only prep) so the dialer opens immediately.
      const s = await api.createCall({ account_id: id, contact_id: contactId ?? undefined });
      setSession(s);
      setStatus("ready");
      // Upgrade the opener + objections with the richer LLM prep in the
      // background — never blocks the call workspace from opening.
      api.callPrep(id)
        .then((full) =>
          setSession((cur: any) =>
            cur ? { ...cur, prep: { ...cur.prep, ...full } } : cur))
        .catch(() => {});
    } catch {
      setError("Couldn't start the call — the backend may be busy. Try again.");
    }
  }

  // Speak a line aloud (the AI agent's voice) and chain to onEnd when finished.
  function speak(text: string, onEnd?: () => void) {
    const synth = typeof window !== "undefined" ? window.speechSynthesis : null;
    if (!synth) { onEnd?.(); return; }
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.02;
    u.pitch = 1;
    const v = synth.getVoices().find((x) => /en[-_]/i.test(x.lang));
    if (v) u.voice = v;
    u.onend = () => onEnd?.();
    u.onerror = () => onEnd?.();
    synth.speak(u);
  }

  function pushTurn(speaker: "agent" | "prospect", text: string) {
    histRef.current = [...histRef.current, { speaker, text }];
    setTranscript((t) => [...t, { speaker, text }]);
  }

  // Join a genuine LiveKit room (real WebRTC). Returns true when a live room is
  // established; false → keep the same flow but flagged as a simulated room.
  async function connectRoom(): Promise<boolean> {
    const lk = session?.livekit;
    if (!lk?.token || !lk?.url || lk.mock || String(lk.url).includes("mock")) return false;
    try {
      const room = new Room();
      roomRef.current = room;
      await room.connect(lk.url, lk.token);
      return true;
    } catch {
      roomRef.current?.disconnect().catch(() => {});
      roomRef.current = null;
      return false;
    }
  }

  // One AI turn: ask Claude for the agent's next line, speak it, then listen.
  async function agentTurn(userText: string | null) {
    setConv("thinking");
    let reply = "";
    try {
      const r = await api.converse({
        account_id: accountId ?? undefined,
        contact_id: session?.prep?.contact?.id,
        history: histRef.current,
        user_text: userText,
      });
      reply = r.reply;
    } catch {
      reply = "Sorry, I'm having trouble hearing you — could you repeat that?";
    }
    if (!liveRef.current) return; // call ended while we were thinking
    if (!reply) reply = "Sorry, could you say that again?";
    pushTurn("agent", reply);
    setConv("speaking");
    speak(reply, () => {
      if (liveRef.current && !mutedRef.current) startListening();
      else setConv("idle");
    });
  }

  function startListening() {
    if (!liveRef.current || mutedRef.current) return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setConv("idle"); return; }
    try {
      const rec = new SR();
      recRef.current = rec;
      rec.lang = "en-US";
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      rec.continuous = false;
      rec.onresult = (e: any) => {
        const text = Array.from(e.results).map((r: any) => r[0].transcript).join(" ").trim();
        if (text) submitUserText(text);
      };
      rec.onerror = (e: any) => {
        if (e?.error === "not-allowed" || e?.error === "service-not-allowed") setSttSupported(false);
      };
      rec.onend = () => {
        // Keep listening for the next utterance unless we've moved on (thinking/
        // speaking) or the call is muted/over.
        if (convRef.current === "listening" && liveRef.current && !mutedRef.current && sttSupported) {
          startListening();
        }
      };
      setConv("listening");
      rec.start();
    } catch {
      setConv("idle");
    }
  }

  function stopListening() {
    const r = recRef.current;
    recRef.current = null;
    if (r) {
      try { r.onend = null; r.onresult = null; r.onerror = null; r.abort?.(); } catch { /* noop */ }
    }
  }

  // A prospect (user) turn — from speech recognition or the typed fallback.
  function submitUserText(text: string) {
    const t = text.trim();
    if (!t || !liveRef.current || convRef.current === "thinking") return;
    stopListening();
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    pushTurn("prospect", t);
    setTyped("");
    agentTurn(t);
  }

  async function beginCall() {
    if (!session) return;
    setTranscript([]);
    histRef.current = [];
    setSeconds(0);
    setStatus("dialing");

    // Try a real LiveKit room; either way, ring briefly for realism then go live.
    const connected = await connectRoom();
    setLiveMode(connected ? "live" : "simulated");
    await wait(1700);

    liveRef.current = true;
    setStatus("live");
    agentTurn(null); // AI agent greets first, then starts listening to you.
  }

  function toggleMute() {
    setMuted((m) => {
      const next = !m;
      mutedRef.current = next;
      if (next) {
        stopListening();
        if (typeof window !== "undefined") window.speechSynthesis?.cancel();
        setConv("idle");
      } else if (liveRef.current && convRef.current !== "speaking" && convRef.current !== "thinking") {
        startListening();
      }
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
  const personaName = contact?.full_name ?? "the prospect";
  const personaFirst = (contact?.full_name?.split(" ")[0]) ?? "Prospect";
  const convLabel = convState === "listening" ? "Listening…"
    : convState === "thinking" ? "Thinking…"
    : convState === "speaking" ? "Speaking…" : "";

  return (
    <div className="min-h-[calc(100vh-2.25rem)]">
      {/* Deep-linked (?account=…): show progress/error instead of an empty picker. */}
      {status === "select" && accountId && (
        <div className="max-w-md mx-auto pt-24 grid place-items-center text-center">
          {error ? (
            <div className="card p-6 w-full">
              <div className="kicker mb-2 text-[var(--color-risk)]">Couldn’t start the call</div>
              <p className="text-[var(--color-ink-soft)] mb-4 text-sm">{error}</p>
              <button onClick={() => startSession(accountId)} className="btn btn-accent">Try again</button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 text-[var(--color-ink-soft)]">
              <Spinner /> <span className="kicker">Preparing the call…</span>
            </div>
          )}
        </div>
      )}

      {status === "select" && !accountId && (
        <div className="max-w-2xl">
          <div className="kicker mb-2">AI voice roleplay</div>
          <h1 className="font-display text-4xl mb-2 text-[var(--color-ink)]">Who do you want to call?</h1>
          <p className="text-[var(--color-ink-soft)] mb-6">Pick an account and run the call live — you pitch, and the AI answers in character as the prospect, powered by Claude.</p>
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
              <div className="kicker mb-2 text-[var(--color-accent)]">Your opener</div>
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

              {/* Who's on the line — the AI is role-playing the prospect you called */}
              <div className="inline-flex items-center gap-1.5 mt-2 text-[0.78rem] text-[var(--color-ink-soft)] font-mono">
                <Bot size={13} className="text-[var(--color-accent)]" /> {personaName} · AI
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

              {/* Conversation state */}
              {status === "live" && convLabel && (
                <div className="kicker mt-1 inline-flex items-center gap-1.5 text-[var(--color-ink-soft)]">
                  {convState === "listening" && <Ear size={11} className="text-[var(--color-positive)]" />}
                  {convLabel}
                </div>
              )}

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

              {status === "live" && <Waveform active={convState === "listening" || convState === "speaking"} muted={muted} />}

              <div className="flex items-center justify-center gap-3 mt-8">
                {status === "ready" ? (
                  <span className="inline-flex items-center gap-2">
                    <button onClick={beginCall} className="btn btn-accent text-base px-6 py-3">
                      <Phone size={16} /> Start call
                    </button>
                    <Explain
                      title="Start call"
                      label="What does Start call do?"
                      text="You're placing the call. The prospect — played by the AI, in character — picks up. Pitch them by speaking into your mic (or typing) and they respond live, powered by Claude."
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

          {/* Right — transcript + your-turn controls */}
          <div className="space-y-4 flex flex-col">
            <div className="card flex-1 flex flex-col min-h-[280px]">
              <div className="px-4 py-3 border-b border-[var(--color-line)] flex items-center justify-between">
                <span className="kicker">Live transcript</span>
                <span className="kicker flex items-center gap-1.5 text-[var(--color-accent)]"><Circle size={6} fill="currentColor" className="live-dot" /> Realtime</span>
              </div>
              <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 max-h-[44vh]">
                {transcript.length === 0 && <p className="text-[var(--color-faint)] text-sm">{personaFirst} picks up when the call connects — then pitch them and they respond live…</p>}
                {transcript.map((t, i) => {
                  const isAgent = t.speaker === "agent";
                  return (
                    <div key={i} className={cx("text-[0.86rem]", isAgent ? "text-[var(--color-ink)]" : "text-[var(--color-ink-2)]")}>
                      <span className={cx("kicker mr-2", isAgent && "text-[var(--color-accent)]")}>
                        {isAgent ? personaFirst : "You"}
                      </span>{t.text}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card">
              <div className="px-4 py-3 border-b border-[var(--color-line)] flex items-center gap-2">
                <Sparkles size={14} className="text-[var(--color-accent)]" />
                <span className="kicker text-[var(--color-accent)]">Your turn</span>
              </div>
              <div className="px-4 py-3 space-y-2">
                <p className="text-[0.8rem] text-[var(--color-ink-soft)]">
                  {convState === "speaking" ? `${personaFirst} is speaking…`
                    : convState === "thinking" ? `${personaFirst} is thinking…`
                    : sttSupported
                      ? `Pitch ${personaFirst} — speak into your mic and they reply. Or type below.`
                      : "Speech input isn’t available in this browser — type your reply below."}
                </p>
                <form
                  onSubmit={(e) => { e.preventDefault(); submitUserText(typed); }}
                  className="flex items-center gap-2 rounded-[var(--radius)] border border-[var(--color-line)] px-3 py-2">
                  <input
                    value={typed}
                    onChange={(e) => setTyped(e.target.value)}
                    disabled={status !== "live"}
                    placeholder="Type what you’d say…"
                    className="flex-1 min-w-0 bg-transparent outline-none text-sm placeholder:text-[var(--color-faint)]" />
                  <button type="submit" disabled={!typed.trim() || status !== "live"}
                    className="grid place-items-center h-8 w-8 rounded-full bg-[var(--color-accent)] text-white disabled:opacity-40">
                    <Send size={14} />
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {status === "ended" && result && <PostCall result={result} account={account} onNew={() => location.assign("/dialer")} />}
    </div>
  );
}

function Waveform({ active, muted }: { active: boolean; muted: boolean }) {
  const on = active && !muted;
  return (
    <div className="flex items-end justify-center gap-1 h-12 mt-6">
      {Array.from({ length: 28 }).map((_, i) => (
        <span key={i} className="w-[3px] rounded-full bg-[var(--color-accent)]"
          style={{
            height: on ? `${20 + Math.abs(Math.sin(i * 0.7)) * 70}%` : "4px",
            animation: on ? `pulse-dot ${0.7 + (i % 5) * 0.18}s ease-in-out infinite` : "none",
            opacity: on ? 1 : 0.3,
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
