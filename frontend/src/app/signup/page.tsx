"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/components/Providers";
import { authEnabled, supabase } from "@/lib/supabase";

export default function SignupPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", company: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function set(k: string) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    if (authEnabled) {
      const c = supabase();
      const { error } = await c!.auth.signUp({
        email: form.email, password: form.password,
        options: { data: { full_name: form.name } },
      });
      if (error) { setErr(error.message); setBusy(false); return; }
    }
    signIn(form.email, form.name);
    router.replace("/dashboard");
  }

  return (
    <div className="relative z-10 min-h-screen grid lg:grid-cols-2">
      {/* Brand panel */}
      <div className="hidden lg:flex flex-col justify-between p-12 border-r border-[var(--color-line)] bg-[var(--color-paper-2)]/40">
        <Link href="/" className="font-display text-3xl tracking-tight">
          Revenue<span className="text-[var(--color-accent)]">OS</span>
        </Link>
        <div>
          <p className="font-display text-4xl leading-tight max-w-md">
            Your next ten customers are on the open web right now.
          </p>
          <p className="mt-4 text-[var(--color-ink-soft)] max-w-md">
            RevenueOS finds them, tells you why they're ready, and writes the message that lands.
          </p>
        </div>
        <div className="space-y-2 max-w-sm">
          {["Live account research in seconds", "Real-time buying signals", "A copilot on every call"].map((t) => (
            <div key={t} className="flex items-center gap-2 text-sm text-[var(--color-ink-2)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" /> {t}
            </div>
          ))}
        </div>
      </div>

      {/* Form */}
      <div className="grid place-items-center p-8">
        <form onSubmit={submit} className="w-full max-w-sm">
          <div className="lg:hidden font-display text-3xl mb-8">
            Revenue<span className="text-[var(--color-accent)]">OS</span>
          </div>
          <div className="kicker mb-2">Create your workspace</div>
          <h1 className="font-display text-3xl mb-7">Start in 30 seconds</h1>
          <label className="kicker">Full name</label>
          <input className="input mt-1 mb-3" placeholder="Alex Rivera" value={form.name} onChange={set("name")} required />
          <label className="kicker">Work email</label>
          <input className="input mt-1 mb-3" type="email" placeholder="alex@company.com" value={form.email} onChange={set("email")} required />
          <label className="kicker">Company</label>
          <input className="input mt-1 mb-3" placeholder="Acme Inc." value={form.company} onChange={set("company")} required />
          <label className="kicker">Password</label>
          <input className="input mt-1 mb-5" type="password" placeholder="••••••••" value={form.password} onChange={set("password")} required minLength={6} />
          {err && <div className="text-[var(--color-risk)] text-sm mb-3">{err}</div>}
          <button className="btn btn-accent w-full justify-center text-base py-3" disabled={busy}>
            {busy ? "Creating…" : <>Create workspace <ArrowRight size={15} /></>}
          </button>
          <p className="text-sm text-[var(--color-ink-soft)] mt-5 text-center">
            Already have an account? <Link href="/login" className="text-[var(--color-accent)] hover:underline">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
