import { logger, task } from "@trigger.dev/sdk";
import { backend } from "../lib/backend.js";

/**
 * Workflow 4 — Call completed.
 *
 *   call ended -> transcribe -> summarize -> score call -> update Cognee
 *   -> generate follow-up email -> create next task.
 *
 * Triggered when a dialer call ends. The backend already has the Speechmatics
 * transcript; this task drives summary + scorecard + follow-up generation with
 * retries so a transient LLM hiccup doesn't lose the post-call work.
 */
export const callCompleted = task({
  id: "call-completed",
  retry: { maxAttempts: 3 },
  run: async (payload: { call_id: string }) => {
    logger.info("Processing completed call", { callId: payload.call_id });
    const result = await backend.callCompleted(payload.call_id);
    logger.info("Call processed", {
      hasScorecard: Boolean(result.scorecard),
      followup: result.followup_message_id,
    });
    return result;
  },
});
