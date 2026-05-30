/**
 * RevenueOS API client.
 *
 * Talks to the FastAPI backend. In the browser we hit the Next.js rewrite proxy
 * (/backend/*) to stay same-origin; on the server we hit the backend directly.
 * A Supabase access token is attached when present; otherwise the backend's
 * demo context applies (so the app is fully usable without logging in).
 */
import { getAccessToken } from "./supabase";

const DEMO_TEAM = "00000000-0000-0000-0000-0000000000aa";
const TOKEN_KEY = "revenueos.token";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore storage failures (private mode, etc.) */
  }
}

function base(): string {
  if (typeof window !== "undefined") return "/backend";
  return process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";
}

async function request<T = any>(
  path: string,
  opts: { method?: string; body?: unknown } = {},
): Promise<T> {
  // Prefer our app-auth token; fall back to a Supabase session token if present.
  const token =
    getStoredToken() ?? (typeof window !== "undefined" ? await getAccessToken() : null);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Team-Id": DEMO_TEAM,
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${base()}${path}`, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${path} — ${text.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

export interface AuthUser {
  email: string;
  name: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface SignupBody {
  email: string;
  password: string;
  name?: string;
  company?: string;
}

export interface LoginBody {
  email: string;
  password: string;
}

export const api = {
  get: <T = any>(p: string) => request<T>(p),
  post: <T = any>(p: string, body?: unknown) => request<T>(p, { method: "POST", body }),
  patch: <T = any>(p: string, body?: unknown) => request<T>(p, { method: "PATCH", body }),
  put: <T = any>(p: string, body?: unknown) => request<T>(p, { method: "PUT", body }),

  // auth --------------------------------------------------------------------
  authSignup: (body: SignupBody) => request<AuthResponse>("/api/auth/signup", { method: "POST", body }),
  authLogin: (body: LoginBody) => request<AuthResponse>("/api/auth/login", { method: "POST", body }),
  authMe: () => request<{ user: AuthUser }>("/api/auth/me"),

  // typed endpoints ---------------------------------------------------------
  dashboard: () => request("/api/dashboard"),
  accounts: (qs = "") => request(`/api/accounts${qs}`),
  account: (id: string) => request(`/api/accounts/${id}`),
  research: (company: string) => request("/api/accounts/research", { method: "POST", body: { company } }),
  timeline: (id: string) => request(`/api/accounts/${id}/timeline`),
  whyNow: (id: string) => request(`/api/accounts/${id}/why-now`),
  signals: (qs = "") => request(`/api/signals${qs}`),
  prospect: (query: string, limit = 4) =>
    request("/api/prospecting/search", { method: "POST", body: { query, limit } }),
  sequences: () => request("/api/sequences"),
  sequence: (id: string) => request(`/api/sequences/${id}`),
  generateSequence: (body: any) => request("/api/sequences/generate", { method: "POST", body }),
  launchSequence: (id: string) => request(`/api/sequences/${id}/launch`, { method: "POST" }),
  drafts: () => request("/api/outreach/drafts"),
  draft: (body: any) => request("/api/outreach/draft", { method: "POST", body }),
  calls: (qs = "") => request(`/api/calls${qs}`),
  call: (id: string) => request(`/api/calls/${id}`),
  createCall: (body: any) => request("/api/calls", { method: "POST", body }),
  endCall: (id: string, body: any) => request(`/api/calls/${id}/end`, { method: "POST", body }),
  coachingCalls: () => request("/api/coaching/calls"),
  leaderboard: () => request("/api/coaching/leaderboard"),
  roleplay: (body: any) => request("/api/coaching/roleplay", { method: "POST", body }),
  workflows: () => request("/api/workflows"),
  runDailyMonitor: () => request("/api/workflows/daily-monitor", { method: "POST" }),
  tasks: () => request("/api/workflows/tasks"),
  integrations: () => request("/api/settings/integrations"),
  team: () => request("/api/settings/team"),
};

export const BACKEND_TEAM = DEMO_TEAM;
