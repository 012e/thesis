import { createTool } from "@mastra/core/tools";
import { z } from "zod";

/**
 * Creates a structured plan for a multi-step task. The plan is forwarded to
 * the client for display in the plan progress bar. The AI should stop after
 * calling this tool and wait for the user to approve or reject the plan before
 * proceeding with any execution steps.
 */
export const createPlanTool = createTool({
  id: "create_plan",
  description: `Creates a step-by-step plan for a complex, multi-step task and presents it to the user for approval before execution begins.

Use this tool when the user asked for a visible plan, the task needs user review, or the task could have significant side effects that benefit from explicit approval. Do not use it merely because an internal execution sequence has multiple steps.

After calling this tool:
- End your response with a short message asking the user to approve or reject the plan.
- Do NOT start executing steps until the user explicitly approves.
- If the user rejects the plan with feedback, acknowledge their feedback and call create_plan again with a revised plan.`,
  inputSchema: z.object({
    title: z
      .string()
      .describe(
        "A concise title for the plan, e.g. 'Implement comments feature end-to-end'",
      ),
    items: z
      .array(
        z.object({
          id: z
            .string()
            .describe(
              "Unique identifier for this step, e.g. 'step-1', 'step-2'",
            ),
          label: z
            .string()
            .describe(
              "Short action label shown in the checklist, e.g. 'Create database migration'",
            ),
          description: z
            .string()
            .optional()
            .describe("Optional longer description of what this step involves"),
        }),
      )
      .min(2)
      .describe("The ordered list of steps in the plan"),
  }),
  execute: async () => {
    return { status: "forwarded_to_client" };
  },
});

/**
 * Updates the status of a single step in the currently active plan. Call this
 * as you work through each step so the user can track progress in real time.
 *
 * Typical usage per step:
 * 1. Call update_plan_item with status "in_progress" when starting the step.
 * 2. Call update_plan_item with status "completed" when the step is done.
 * 3. Call update_plan_item with status "skipped" if the step turns out to be
 *    unnecessary.
 */
export const updatePlanItemTool = createTool({
  id: "update_plan_item",
  description: `Updates the status of a step in the current plan. Use this to track progress so the user can see which steps are done, in progress, or skipped in real time.

Call with "in_progress" when starting a step, "completed" when done, and "skipped" if the step is not needed.`,
  inputSchema: z.object({
    id: z.string().describe("The id of the plan item to update, e.g. 'step-1'"),
    status: z
      .enum(["pending", "in_progress", "completed", "skipped"])
      .describe("The new status for this step"),
    notes: z
      .string()
      .optional()
      .describe(
        "Optional short note to display alongside the step, e.g. 'Created migration 0009_comments.sql'",
      ),
  }),
  execute: async () => {
    return { status: "forwarded_to_client" };
  },
});
