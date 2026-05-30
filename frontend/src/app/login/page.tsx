"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/components/Providers";
import { authEnabled, supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    if (authEnabled) {
      const c = supabase();
      const { error } = await c!.auth.signInWithPassword({ email, password });
      if (error) { setErr(error.message); setBusy(false); return; }
    }
    signIn(email);
    router.replace("/dashboard");
  }

  return (
    <div className="relative z-10 min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between p-12 border-r border-[var(--color-line)] bg-[var(--color-paper-2)]/40">
        <Link href="/" className="font-display text-3xl tracking-tight">
          Revenue<span className="text-[var(--color-accent)]">OS</span>
        </Link>
        <p className="font-display text-4xl leading-tight max-w-md">
          Welcome back. Your pipeline’s been busy.
        </p>
        <div className="kicker">Who to call · why now · what to say</div>
      </div>

      <div className="grid place-items-center p-8">
        <form onSubmit={submit} className="w-full max-w-sm">
          <div className="lg:hidden font-display text-3xl mb-8">
            Revenue<span className="text-[var(--color-accent)]">OS</span>
          </div>
          <div className="kicker mb-2">Sign in</div>
          <h1 className="font-display text-3xl mb-7">Enter your workspace</h1>
          <label className="kicker">Email</label>
          <input className="input mt-1 mb-3" type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <label className="kicker">Password</label>
          <input className="input mt-1 mb-5" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {err && <div className="text-[var(--color-risk)] text-sm mb-3">{err}</div>}
          <button className="btn btn-primary w-full justify-center text-base py-3" disabled={busy}>
            {busy ? "…" : <>Continue <ArrowRight size={15} /></>}
          </button>
          <p className="text-sm text-[var(--color-ink-soft)] mt-5 text-center">
            New here? <Link href="/signup" className="text-[var(--color-accent)] hover:underline">Create a workspace</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
