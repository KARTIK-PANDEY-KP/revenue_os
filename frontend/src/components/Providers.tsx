"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { authEnabled } from "@/lib/supabase";
import {
  api,
  getStoredToken,
  setStoredToken,
  type AuthUser,
  type LoginBody,
  type SignupBody,
} from "@/lib/api";

type User = { id: string; email: string; name?: string } | null;

type AuthState = {
  user: User;
  loading: boolean;
  authEnabled: boolean;
  signUp: (body: SignupBody) => Promise<void>;
  signIn: (body: LoginBody) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthCtx = createContext<AuthState>({
  user: null,
  loading: true,
  authEnabled,
  signUp: async () => {},
  signIn: async () => {},
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthCtx);
}

const USER_KEY = "revenueos.user";

function toUser(u: AuthUser): User {
  // The backend keeps all data on the demo tenant, so identity is display-only.
  return { id: "app-user", email: u.email, name: u.name || undefined };
}

function persistUser(user: User): void {
  try {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  } catch {
    /* ignore storage failures */
  }
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function restore() {
      const token = getStoredToken();
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const { user: u } = await api.authMe();
        if (active) setUser(toUser(u));
      } catch {
        // Token missing/expired/invalid — clear it.
        setStoredToken(null);
        persistUser(null);
        if (active) setUser(null);
      } finally {
        if (active) setLoading(false);
      }
    }

    restore();
    return () => {
      active = false;
    };
  }, []);

  const signUp = async (body: SignupBody): Promise<void> => {
    const res = await api.authSignup(body);
    setStoredToken(res.token);
    const u = toUser(res.user);
    persistUser(u);
    setUser(u);
  };

  const signIn = async (body: LoginBody): Promise<void> => {
    const res = await api.authLogin(body);
    setStoredToken(res.token);
    const u = toUser(res.user);
    persistUser(u);
    setUser(u);
  };

  const signOut = async (): Promise<void> => {
    setStoredToken(null);
    persistUser(null);
    setUser(null);
  };

  return (
    <AuthCtx.Provider value={{ user, loading, authEnabled, signUp, signIn, signOut }}>
      {children}
    </AuthCtx.Provider>
  );
}
