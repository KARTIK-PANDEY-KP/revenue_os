"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Eye } from "lucide-react";
import { cx } from "@/lib/format";

interface ExplainProps {
  /** Plain-language explanation shown in the tooltip. */
  text: string;
  /** Optional small title above the explanation. */
  title?: string;
  /** Accessible label for the trigger button (defaults to a sensible value). */
  label?: string;
  /** Preferred placement of the popover relative to the trigger. */
  side?: "top" | "bottom";
  className?: string;
}

/**
 * A tiny circular ghost-glass "explain" button. Reveals a glass popover with a
 * plain-language explanation on hover, keyboard focus, or tap. Sits inline,
 * right after an action button, so a first-time user understands what a button
 * does before clicking it.
 */
export function Explain({ text, title, label, side = "top", className }: ExplainProps) {
  const [open, setOpen] = useState(false);
  const [align, setAlign] = useState<"center" | "left" | "right">("center");
  const tipId = useId();
  const wrapRef = useRef<HTMLSpanElement | null>(null);

  // On open, keep the popover inside the viewport: right-align near the right
  // edge, left-align near the left edge, otherwise center on the trigger.
  useEffect(() => {
    if (!open || !wrapRef.current) return;
    const r = wrapRef.current.getBoundingClientRect();
    const half = 130; // ~half the popover width + margin
    const center = r.left + r.width / 2;
    if (center + half > window.innerWidth - 8) setAlign("right");
    else if (center - half < 8) setAlign("left");
    else setAlign("center");
  }, [open]);

  // Close on Escape, and on outside tap (touch toggling).
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onPointerDown(e: PointerEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  return (
    <span
      ref={wrapRef}
      className={cx("relative inline-flex align-middle", className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label={label ?? "What does this do?"}
        aria-expanded={open}
        aria-describedby={open ? tipId : undefined}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={(e) => {
          // Tap toggles; prevent the click from triggering a wrapping link/button.
          e.preventDefault();
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className={cx(
          "grid place-items-center h-[22px] w-[22px] rounded-full shrink-0 transition-colors",
          "border border-[var(--glass-border)] bg-[rgba(255,255,255,0.45)] backdrop-blur-[10px]",
          "text-[var(--color-faint)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)]",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40",
        )}
      >
        <Eye size={14} strokeWidth={2} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.span
            id={tipId}
            role="tooltip"
            initial={{ opacity: 0, y: side === "top" ? 4 : -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: side === "top" ? 4 : -4, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className={cx(
              "absolute z-50 w-60 max-w-[min(15rem,calc(100vw-1.5rem))] rounded-[var(--radius-sm)] p-3",
              "pointer-events-none text-left whitespace-normal",
              side === "top" ? "bottom-full mb-2" : "top-full mt-2",
              align === "center" && "left-1/2 -translate-x-1/2",
              align === "right" && "right-0",
              align === "left" && "left-0",
            )}
            style={{
              // Genuine translucent Liquid Glass: light fill + heavy blur/saturate
              // so the page refracts through instead of a flat opaque card.
              background: "rgba(255,255,255,0.42)",
              WebkitBackdropFilter: "blur(24px) saturate(185%)",
              backdropFilter: "blur(24px) saturate(185%)",
              border: "1px solid rgba(255,255,255,0.55)",
              boxShadow:
                "0 14px 36px rgba(40,35,28,0.16), inset 0 1px 0 rgba(255,255,255,0.7)",
            }}
          >
            {title && (
              <span className="kicker mb-1 block text-[var(--color-accent)]">{title}</span>
            )}
            <span className="block text-[0.8rem] leading-snug text-[var(--color-ink-2)]">
              {text}
            </span>
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

export default Explain;
