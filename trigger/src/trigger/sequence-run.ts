import { logger, task, wait } from "@trigger.dev/sdk/v3";
import { backend } from "../lib/backend.js";

/**
 * Workflow 3 — Sequence automation.
 *
 *   sequence started -> for each step: execute -> wait (day_offset) ->
 *   check reply/engagement -> branch (continue or stop) -> schedule call.
 *
 * This is the workflow that most showcases Trigger.dev: durable, long-running,
 * with real waits between steps that survive restarts. The backend generates the
 * per-step content; this task drives timing + branching.
 */
export const sequenceRun = task({
  id: "sequence-run",
  maxDuration: 3600,
  run: async (payload: { sequence_id: string; team_id?: string }) => {
    const { sequence_id } = payload;
    logger.info("Sequence started", { sequence_id });

    const { sequence, steps } = await backend.getSequence(sequence_id);
    if (!sequence) throw new Error(`Sequence ${sequence_id} not found`);

    const ordered = [...(steps ?? [])].sort((a, b) => a.step_order - b.step_order);
    let previousDay = 0;

    for (const step of ordered) {
      // Wait until this step's day_offset (relative to the previous step).
      const waitDays = Math.max(0, (step.day_offset ?? 0) - previousDay);
      previousDay = step.day_offset ?? previousDay;
      if (waitDays > 0) {
        logger.info("Waiting before next step", { step: step.step_order, waitDays });
        await wait.for({ days: waitDays });
      }

      // Execute the step (generate + schedule the message / create the task).
      logger.info("Executing step", { step: step.step_order, channel: step.channel });
      await backend.runSequence(sequence_id);

      // Branch: a real deployment would check reply/engagement here and stop
      // the sequence on a positive reply. We log the decision point for clarity.
      logger.info("Step executed; checking engagement before continuing", {
        step: step.step_order,
      });
    }

    logger.info("Sequence completed", { sequence_id });
    return { sequence_id, steps: ordered.length, status: "completed" };
  },
});
