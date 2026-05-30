import { logger, schedules, task } from "@trigger.dev/sdk";
import { backend } from "../lib/backend.js";

/**
 * Workflow 1 — Daily account monitoring.
 *
 *   every morning -> fetch watched accounts -> Bright Data research jobs
 *   -> extract new signals -> update Cognee -> re-score -> notify dashboard
 *
 * The backend performs the actual research/scoring/memory work; this scheduled
 * task drives the cadence and fans out per-signal handling.
 */
export const dailyMonitor = schedules.task({
  id: "daily-monitor",
  // 8am UTC every day. Override per-environment in the Trigger.dev dashboard.
  cron: "0 8 * * *",
  maxDuration: 600,
  run: async (payload) => {
    logger.info("Daily monitor starting", { scheduledAt: payload.timestamp });

    const result = await backend.runDailyMonitor();
    logger.info("Monitoring complete", {
      accounts: result.accounts_monitored,
      newSignals: result.new_signals,
    });

    return result;
  },
});

/** Manual/triggered variant (e.g. "Run now" button) reusing the same backend call. */
export const dailyMonitorNow = task({
  id: "daily-monitor-now",
  run: async () => backend.runDailyMonitor(),
});
