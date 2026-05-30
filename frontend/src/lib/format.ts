import clsx from "clsx";

export const cx = clsx;

export function scoreTier(score?: number | null): "hot" | "warm" | "cool" {
  const s = score ?? 0;
  if (s >= 85) return "hot";
  if (s >= 70) return "warm";
  return "cool";
}

export const tierColor: Record<string, string> = {
  hot: "var(--color-tier-hot)",
  warm: "var(--color-tier-warm)",
  cool: "var(--color-tier-cool)",
};

export function signalGlyph(type?: string): string {
  const map: Record<string, string> = {
    hiring: "↑", funding: "$", pricing: "≈", product: "✦", executive: "◆",
    expansion: "→", competitor: "⊗", partnership: "∞", techstack: "⚙",
    complaint: "!", event: "◎", news: "•", headcount: "▲", layoff: "▼",
    revenue_proxy: "≋", investor: "◈", breach: "⚠", compliance: "§",
    trust_center: "✓", risk: "⚠",
  };
  return map[type ?? "news"] ?? "•";
}

export function timeAgo(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function initials(name?: string): string {
  if (!name) return "?";
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

export function titleCase(s?: string): string {
  if (!s) return "";
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
