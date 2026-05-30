"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutGrid, Building2, Telescope, Radio, GitBranch, PhoneCall,
  History, GraduationCap, Settings as Cog, Circle,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/components/Providers";
import { cx } from "@/lib/format";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid, n: "01" },
  { href: "/accounts", label: "Accounts", icon: Building2, n: "02" },
  { href: "/prospecting", label: "Prospects", icon: Telescope, n: "03" },
  { href: "/signals", label: "Signals", icon: Radio, n: "04" },
  { href: "/sequences", label: "Sequences", icon: GitBranch, n: "05" },
  { href: "/dialer", label: "Dialer", icon: PhoneCall, n: "06" },
  { href: "/calls", label: "Calls", icon: History, n: "07" },
  { href: "/coaching", label: "Coaching", icon: GraduationCap, n: "08" },
  { href: "/settings", label: "Settings", icon: Cog, n: "09" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();

  async function handleSignOut() {
    await signOut();
    router.push("/");
  }

  return (
    <div className="relative z-10 min-h-screen lg:grid lg:grid-cols-[244px_1fr]">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col border-r border-[var(--color-line)] bg-[var(--color-paper-2)]/40 sticky top-0 h-screen">
        <div className="px-6 pt-7 pb-5 border-b border-[var(--color-line)]">
          <Link href="/dashboard" className="block">
            <div className="font-display text-[26px] leading-none tracking-tight">
              Revenue<span className="text-[var(--color-accent)]">OS</span>
            </div>
            <div className="kicker mt-1">Outbound, on autopilot</div>
          </Link>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cx(
                  "group relative flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius)] transition-colors",
                  active ? "bg-[var(--color-card)]" : "hover:bg-[var(--color-card)]/60",
                )}
              >
                <span
                  className={cx(
                    "absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-full transition-all",
                    active ? "bg-[var(--color-accent)] opacity-100" : "opacity-0",
                  )}
                />
                <span className="font-mono text-[10px] text-[var(--color-faint)] w-4">{item.n}</span>
                <Icon
                  size={16}
                  strokeWidth={active ? 2.2 : 1.7}
                  className={active ? "text-[var(--color-accent)]" : "text-[var(--color-ink-soft)]"}
                />
                <span
                  className={cx(
                    "text-[0.92rem] tracking-tight",
                    active ? "text-[var(--color-ink)] font-medium" : "text-[var(--color-ink-2)]",
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="px-5 py-4 border-t border-[var(--color-line)]">
          <div className="text-sm font-medium truncate">{user?.name ?? "Your workspace"}</div>
          <div className="font-mono text-[11px] text-[var(--color-ink-soft)] truncate">
            {user?.email ?? "demo@revenueos.app"}
          </div>
          <button onClick={handleSignOut} className="kicker mt-1.5 hover:text-[var(--color-accent)]">
            Sign out →
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex flex-col min-h-screen min-w-0 overflow-x-hidden">
        <Masthead />
        <main className="flex-1 px-5 sm:px-8 lg:px-10 py-7 min-w-0">{children}</main>
      </div>
    </div>
  );
}

/* Top "masthead" — date + a live ticker of the hottest signals. */
function Masthead() {
  const [ticker, setTicker] = useState<string[]>([]);
  useEffect(() => {
    api
      .signals("?sort=detected_at")
      .then((d) =>
        setTicker(
          (d.signals ?? [])
            .slice(0, 8)
            .map((s: any) => `${s.account_name ?? "—"} · ${s.title}`),
        ),
      )
      .catch(() => {});
  }, []);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });

  return (
    <div className="border-b border-[var(--color-line)] bg-[var(--color-paper)]/80 backdrop-blur sticky top-0 z-20">
      <div className="flex items-center h-9 overflow-hidden">
        <div className="px-4 h-full flex items-center border-r border-[var(--color-line)] shrink-0">
          <span className="kicker">{today}</span>
        </div>
        <div className="px-3 h-full flex items-center border-r border-[var(--color-line)] shrink-0">
          <span className="flex items-center gap-1.5 kicker text-[var(--color-accent)]">
            <Circle size={6} fill="currentColor" className="live-dot" /> Live signals
          </span>
        </div>
        <div className="relative flex-1 overflow-hidden">
          {ticker.length > 0 && (
            <div className="flex whitespace-nowrap" style={{ animation: "marquee 40s linear infinite" }}>
              {[...ticker, ...ticker].map((t, i) => (
                <span key={i} className="font-mono text-[11px] text-[var(--color-ink-soft)] px-6">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function IntegrationStatus() {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    api.integrations().then((d) => setItems(d.integrations ?? [])).catch(() => {});
  }, []);
  if (!items.length) return null;
  return (
    <div className="px-5 py-3 border-t border-[var(--color-line)]">
      <div className="kicker mb-2">Sponsor stack</div>
      <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
        {items
          .filter((i) => i.key !== "supabase")
          .map((i) => (
            <div key={i.key} className="flex items-center gap-1.5" title={`${i.label}: ${i.mode}`}>
              <span
                className="h-1.5 w-1.5 rounded-full shrink-0"
                style={{ background: i.live ? "var(--color-positive)" : "var(--color-line-2)" }}
              />
              <span className="font-mono text-[10px] text-[var(--color-ink-soft)] truncate">
                {i.label.split(" ")[0]}
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}
