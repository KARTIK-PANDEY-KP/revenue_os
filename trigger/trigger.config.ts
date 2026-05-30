import { defineConfig } from "@trigger.dev/sdk";

/**
 * RevenueOS workflow engine.
 *
 * The project ref comes from your Trigger.dev dashboard (set TRIGGER_PROJECT_REF
 * in the environment; the value below is read at config load). Tasks live in
 * ./src/trigger and call back into the FastAPI backend to do the heavy lifting.
 */
export default defineConfig({
  project: process.env.TRIGGER_PROJECT_REF ?? "proj_wedjfsjeupvwzsphqsfd",
  runtime: "node",
  logLevel: "info",
  maxDuration: 600,
  retries: {
    enabledInDev: false,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 30000,
      factor: 2,
      randomize: true,
    },
  },
  dirs: ["./src/trigger"],
});
