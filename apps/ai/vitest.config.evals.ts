import { defineConfig } from "vitest/config";
import { resolve } from "path";

/**
 * Vitest configuration for scorer eval tests.
 *
 * These tests make real LLM API calls and are intentionally excluded from CI.
 * Run locally with: pnpm test:evals
 *
 * Requires OPENAI_API_KEY to be set in the environment (see .env.example).
 */
export default defineConfig({
  test: {
    include: ["src/evals/**/*.eval.ts"],
    root: resolve(__dirname, "./"),
    // Evals can be slow — allow 2 minutes per test
    testTimeout: 120_000,
    // Run sequentially to avoid hammering the LLM API
    fileParallelism: false,
    maxWorkers: 1,
  },
});
