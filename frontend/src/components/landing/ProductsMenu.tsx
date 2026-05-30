"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Telescope,
  Radio,
  GitBranch,
  PhoneCall,
  Gauge,
  Network,
  ChevronDown,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";

interface ModuleItem {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
}

const MODULES: ModuleItem[] = [
  {
    id: "prospecting",
    name: "Prospecting",
    description: "Find in-market accounts from a plain-English ICP.",
    icon: Telescope,
  },
  {
    id: "signals",
    name: "Signals",
    description: "See why a company is ready to buy, right now.",
    icon: Radio,
  },
  {
    id: "sequences",
    name: "Sequences",
    description: "Auto-written outreach that runs on its own.",
    icon: GitBranch,
  },
  {
    id: "copilot",
    name: "Call Copilot",
    description: "Live transcription + real-time battlecards on every call.",
    icon: PhoneCall,
  },
  {
    id: "prioritization",
    name: "Prioritization",
    description: "A score that tells you which account matters today.",
    icon: Gauge,
  },
  {
    id: "memory",
    name: "Memory",
    description: "A knowledge graph that gets sharper with every interaction.",
    icon: Network,
  },
];

/**
 * Hover/focus-activated "Products" mega-menu for the landing nav.
 * - Opens on pointer hover and on keyboard focus-within.
 * - Closes on mouse-leave, blur (focus leaving the menu), or Escape.
 * - Items are anchor links that smooth-scroll to the matching section.
 */
export function ProductsMenu() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCloseTimer = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    clearCloseTimer();
    // small delay so the pointer can travel from trigger to panel
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  }, [clearCloseTimer]);

  useEffect(() => () => clearCloseTimer(), [clearCloseTimer]);

  // Close when focus leaves the whole component (accessible blur handling).
  const handleBlur = useCallback((e: React.FocusEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      setOpen(false);
    }
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      setOpen(false);
      containerRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    }
  }, []);

  const handleItemActivate = useCallback(() => {
    // Let the anchor navigate, then collapse the menu.
    setOpen(false);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={() => {
        clearCloseTimer();
        setOpen(true);
      }}
      onMouseLeave={scheduleClose}
      onFocus={() => {
        clearCloseTimer();
        setOpen(true);
      }}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
    >
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-sm text-[var(--color-ink-2)] transition-colors hover:text-[var(--color-ink)]"
      >
        Products
        <ChevronDown
          size={14}
          className={`transition-transform duration-300 ${open ? "rotate-180" : ""}`}
          style={{ transitionTimingFunction: "var(--ease-fluid)" }}
        />
      </button>

      {/* Dropdown panel */}
      <div
        role="menu"
        aria-label="Products"
        className={`absolute left-1/2 top-full z-50 mt-3 w-[min(92vw,40rem)] -translate-x-1/2 origin-top transition-all duration-200 ${
          open
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-1 opacity-0"
        }`}
        style={{ transitionTimingFunction: "var(--ease-fluid)" }}
      >
        <div className="glass-strong overflow-hidden rounded-[var(--radius-lg)] p-2.5 shadow-xl">
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            {MODULES.map((m) => {
              const Icon = m.icon;
              return (
                <a
                  key={m.id}
                  href={`#${m.id}`}
                  role="menuitem"
                  onClick={handleItemActivate}
                  className="group flex items-start gap-3 rounded-[var(--radius-sm)] p-3 transition-colors hover:bg-[rgba(255,255,255,0.45)]"
                >
                  <span
                    className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] transition-transform group-hover:scale-105"
                    style={{ background: "var(--color-accent-soft)" }}
                  >
                    <Icon
                      size={17}
                      className="text-[var(--color-accent)]"
                      strokeWidth={1.9}
                    />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-[var(--color-ink)]">
                      {m.name}
                    </span>
                    <span className="mt-0.5 block text-[0.8rem] leading-snug text-[var(--color-ink-soft)]">
                      {m.description}
                    </span>
                  </span>
                </a>
              );
            })}
          </div>

          {/* Footer row */}
          <div className="mt-1.5 flex items-center justify-between gap-3 border-t border-[var(--color-line)] px-3 pt-3">
            <span className="text-[0.8rem] text-[var(--color-ink-soft)]">
              One platform. Every module included.
            </span>
            <a
              href="/signup"
              role="menuitem"
              onClick={handleItemActivate}
              className="flex items-center gap-1 text-sm font-medium text-[var(--color-accent)] transition-colors hover:opacity-80"
            >
              Get started <ArrowRight size={14} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
