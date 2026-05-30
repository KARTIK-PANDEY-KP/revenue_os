import { logger, task } from "@trigger.dev/sdk";
import { backend } from "../lib/backend.js";

/**
 * Workflow 2 — New signal detected.
 *
 *   signal created -> classify -> generate recommended action
 *   -> if high confidence, create outreach draft
 *   -> if very high priority, create call task
 *
 * Triggered by the backend when a fresh signal is found (during research or
 * monitoring). The backend encodes the confidence/priority branching.
 */
export const signalDetected = task({
  id: "signal-detected",
  run: async (payload: { signal_id: string }) => {
    logger.info("Handling new signal", { signalId: payload.signal_id });
    const result = await backend.signalDetected(payload.signal_id);
    logger.info("Signal handled", { created: result.created });
    return result;
  },
});
