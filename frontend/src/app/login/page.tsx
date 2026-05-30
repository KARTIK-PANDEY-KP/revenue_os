"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/components/Providers";
import { AuthScreen, Field } from "@/components/AuthScreen";

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
    try {
      await signIn({ email, password });
      router.replace("/dashboard");
    } catch (error: unknown) {
      setErr(errorMessage(error));
      setBusy(false);
    }
  }

  return (
    <AuthScreen
      eyebrow="Welcome back"
      title="Sign in to your workspace"
      brandLine="Your pipeline has been listening while you were away."
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email">
          <input className="input" type="email" placeholder="you@company.com"
            value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </Field>
        <Field label="Password">
          <input className="input" type="password" placeholder="••••••••"
            value={password} onChange={(e) => setPassword(e.target.value)} required />
        </Field>
        {err && <p className="text-[var(--color-risk)] text-sm">{err}</p>}
        <button className="btn btn-accent w-full justify-center text-base py-3" disabled={busy}>
          {busy ? "Signing in…" : <>Continue <ArrowRight size={15} /></>}
        </button>
      </form>
      <p className="text-sm text-[var(--color-ink-soft)] mt-6 text-center">
        New here?{" "}
        <Link href="/signup" className="text-[var(--color-accent)] hover:underline">Create a workspace</Link>
      </p>
    </AuthScreen>
  );
}
