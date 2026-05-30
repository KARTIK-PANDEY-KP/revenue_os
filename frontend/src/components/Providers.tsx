"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { authEnabled, supabase } from "@/lib/supabase";

type User = { id: string; email: string } | null;

type AuthState = {
  user: User;
  loading: boolean;
  authEnabled: boolean;
  signOut: () => Promise<void>;
};

const AuthCtx = createContext<AuthState>({
  user: null,
  loading: true,
  authEnabled,
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthCtx);
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(
    authEnabled ? null : { id: "demo", email: "demo@revenueos.app" },
  );
  const [loading, setLoading] = useState(authEnabled);

  useEffect(() => {
    if (!authEnabled) return;
    const c = supabase();
    if (!c) return;
    c.auth.getUser().then(({ data }) => {
      setUser(data.user ? { id: data.user.id, email: data.user.email ?? "" } : null);
      setLoading(false);
    });
    const { data: sub } = c.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ? { id: session.user.id, email: session.user.email ?? "" } : null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    const c = supabase();
    if (c) await c.auth.signOut();
    setUser(null);
  };

  return (
    <AuthCtx.Provider value={{ user, loading, authEnabled, signOut }}>{children}</AuthCtx.Provider>
  );
}
