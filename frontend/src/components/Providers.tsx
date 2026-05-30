"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { authEnabled, supabase } from "@/lib/supabase";

type User = { id: string; email: string; name?: string } | null;

type AuthState = {
  user: User;
  loading: boolean;
  authEnabled: boolean;
  signIn: (email: string, name?: string) => void;
  signOut: () => Promise<void>;
};

const AuthCtx = createContext<AuthState>({
  user: null,
  loading: true,
  authEnabled,
  signIn: () => {},
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthCtx);
}

const SESSION_KEY = "revenueos.session";

export function Providers({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authEnabled) {
      const c = supabase();
      if (!c) { setLoading(false); return; }
      c.auth.getUser().then(({ data }) => {
        setUser(data.user ? { id: data.user.id, email: data.user.email ?? "" } : null);
        setLoading(false);
      });
      const { data: sub } = c.auth.onAuthStateChange((_e, session) => {
        setUser(session?.user ? { id: session.user.id, email: session.user.email ?? "" } : null);
      });
      return () => sub.subscription.unsubscribe();
    }
    // Demo mode: restore a local session if present.
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) setUser(JSON.parse(raw));
    } catch {}
    setLoading(false);
  }, []);

  const signIn = (email: string, name?: string) => {
    const u = { id: "demo", email, name };
    setUser(u);
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(u)); } catch {}
  };

  const signOut = async () => {
    if (authEnabled) { const c = supabase(); if (c) await c.auth.signOut(); }
    try { localStorage.removeItem(SESSION_KEY); } catch {}
    setUser(null);
  };

  return (
    <AuthCtx.Provider value={{ user, loading, authEnabled, signIn, signOut }}>
      {children}
    </AuthCtx.Provider>
  );
}
