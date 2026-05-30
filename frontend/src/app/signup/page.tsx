"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Zap, Radio, ShieldCheck } from "lucide-react";
import { useAuth } from "@/components/Providers";
import { AuthScreen, Field } from "@/components/AuthScreen";

const PERKS = [
  { icon: Zap, text: "Live in 30 seconds — no setup, no list-buying" },
  { icon: Radio, text: "Buying signals surfaced the moment they happen" },
  { icon: ShieldCheck, text: "Free to start · no credit card required" },
];

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    const m = error.message.match(/—\s*(.+)$/);
    if (m) {
      try {
        const parsed = JSON.parse(m[1]);
        if (parsed?.detail) return String(parsed.detail);
      } catch {
        return m[1];
      }
    }
    return error.message;
  }
  return "Something went wrong. Please try again.";
}

export default function SignupPage() {
  const router = useRouter();
  const { signUp } = useAuth();
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
    try {
      await signUp({ email: form.email, password: form.password, name: form.name, company: form.company });
      router.replace("/dashboard");
    } catch (error: unknown) {
      setErr(errorMessage(error));
      setBusy(false);
    }
  }

  return (
    <AuthScreen
      eyebrow="Create your workspace"
      title="Start listening in 30 seconds"
      brandLine="Your next customer is already telling the internet they're ready to buy."
      points={PERKS}
    >
      <form onSubmit={submit} className="space-y-3.5">
        <Field label="Full name">
          <input className="input" placeholder="Alex Rivera" value={form.name} onChange={set("name")} required autoFocus />
        </Field>
        <Field label="Work email">
          <input className="input" type="email" placeholder="alex@company.com" value={form.email} onChange={set("email")} required />
        </Field>
        <Field label="Company">
          <input className="input" placeholder="Acme Inc." value={form.company} onChange={set("company")} required />
        </Field>
        <Field label="Password">
          <input className="input" type="password" placeholder="••••••••" value={form.password} onChange={set("password")} required minLength={6} />
        </Field>
        {err && <p className="text-[var(--color-risk)] text-sm">{err}</p>}
        <button className="btn btn-accent w-full justify-center text-base py-3" disabled={busy}>
          {busy ? "Creating…" : <>Create workspace <ArrowRight size={15} /></>}
        </button>
      </form>
      <p className="text-sm text-[var(--color-ink-soft)] mt-5 text-center">
        Already have an account?{" "}
        <Link href="/login" className="text-[var(--color-accent)] hover:underline">Sign in</Link>
      </p>
    </AuthScreen>
  );
}
