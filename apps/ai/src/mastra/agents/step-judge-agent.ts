import { Agent } from "@mastra/core/agent";
import { MODEL_CONFIG } from "../constants";
import { PROMPTS } from "../../prompts";

/**
 * Step-judge agent — an LLM judge that evaluates whether the orchestrator has
 * fully completed all steps implied by the user's original request.
 *
 * Unlike the background scorers that were previously attached to the
 * orchestrator's `scorers` property (which run asynchronously for telemetry),
 * this agent is meant to be called **explicitly** after the orchestrator
 * produces a response. The caller passes the original user request and the
 * orchestrator's output as a structured prompt; the judge replies with a
 * verdict and an explanation.
 *
 * ## Expected prompt format
 *
 * ```
 * USER REQUEST:
 * <original user message>
 *
 * ORCHESTRATOR OUTPUT:
 * <full text produced by the orchestrator>
 * ```
 *
 * ## Response format
 *
 * The agent always replies with one of two verdicts followed by a reason:
 *
 * ```
 * VERDICT: COMPLETE
 * REASON: All steps the user requested have been addressed. The post was
 * created (ID: abc123) and the user was followed successfully.
 * ```
 *
 * or:
 *
 * ```
 * VERDICT: INCOMPLETE
 * REASON: The user asked to both create a post and follow another user, but
 * only the post creation was confirmed. The follow step is missing.
 * ```
 *
 * ## Usage example
 *
 * ```typescript
 * const judgment = await stepJudgeAgent.generate(
 *   `USER REQUEST:\n${userMessage}\n\nORCHESTRATOR OUTPUT:\n${orchestratorResponse}`,
 * );
 * const isComplete = judgment.text.startsWith('VERDICT: COMPLETE');
 * ```
 */
export const stepJudgeAgent = new Agent({
  id: "step-judge",
  name: "Step Judge",
  description:
    "Evaluates whether the orchestrator has fully completed all steps implied by the user request. Returns COMPLETE or INCOMPLETE with a detailed reason.",
  instructions: PROMPTS.stepJudge,
  model: MODEL_CONFIG.STEP_JUDGE_AGENT.model,
});
