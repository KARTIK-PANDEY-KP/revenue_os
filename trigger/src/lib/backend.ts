/**
 * Thin client the Trigger.dev tasks use to call back into the RevenueOS FastAPI
 * backend. Keeping the domain logic in the backend means workflows stay simple
 * and the same code path runs whether orchestration is inline (mock) or via
 * Trigger.dev (live).
 */
const BASE = process.env.BACKEND_URL ?? "http://localhost:8000";
const TEAM = process.env.REVENUEOS_TEAM_ID ?? "00000000-0000-0000-0000-0000000000aa";

async function call<T = any>(path: string, body?: unknown, method = "POST"): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Team-Id": TEAM,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Backend ${method} ${path} failed: ${res.status} ${text}`);
  }
  return (await res.json()) as T;
}

export const backend = {
  runDailyMonitor: () => call("/api/workflows/daily-monitor", {}),
  signalDetected: (signalId: string) => call("/api/workflows/signal-detected", { signal_id: signalId }),
  runSequence: (sequenceId: string) => call("/api/workflows/sequence-run", { sequence_id: sequenceId }),
  callCompleted: (callId: string) => call("/api/workflows/call-completed", { call_id: callId }),
  getSequence: (sequenceId: string) => call(`/api/sequences/${sequenceId}`, undefined, "GET"),
};
