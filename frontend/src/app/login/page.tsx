"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authEnabled, supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!authEnabled) {
    // No Supabase configured — go straight in (demo mode).
    if (typeof window !== "undefined") router.replace("/dashboard");
    return null;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const c = supabase();
    if (!c) return;
    const { error } = await c.auth.signInWithPassword({ email, password });
    if (error) {
      // try sign-up if no account
      const { error: e2 } = await c.auth.signUp({ email, password });
      if (e2) {
        setMsg(error.message);
        setBusy(false);
        return;
      }
    }
    router.replace("/dashboard");
  }

  return (
    <div className="relative z-10 min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between p-12 border-r border-[var(--color-line)] bg-[var(--color-paper-2)]/40">
        <div>
          <div className="kicker mb-2">GTM Intelligence</div>
          <div className="font-display text-5xl tracking-tight">
            Revenue<span className="text-[var(--color-accent)]">OS</span>
          </div>
        </div>
        <p className="font-display text-3xl leading-tight max-w-md text-[var(--color-ink-2)]">
          Who should I contact today? Why now? What should I say?
          <span className="text-[var(--color-accent)]"> RevenueOS answers all three.</span>
        </p>
        <div className="kicker">Bright Data · Cognee · Trigger.dev · LiveKit · Speechmatics</div>
      </div>

      <div className="grid place-items-center p-8">
        <form onSubmit={submit} className="w-full max-w-sm">
          <div className="kicker mb-2">Sign in</div>
          <h1 className="font-display text-3xl mb-6">Enter the workspace</h1>
          <input className="input mb-3" type="email" placeholder="you@company.com"
            value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className="input mb-4" type="password" placeholder="password"
            value={password} onChange={(e) => setPassword(e.target.value)} required />
          {msg && <div className="text-[var(--color-risk)] text-sm mb-3">{msg}</div>}
          <button className="btn btn-primary w-full justify-center" disabled={busy}>
            {busy ? "…" : "Continue →"}
          </button>
        </form>
      </div>
    </div>
  );
}
