import { Agent } from "@mastra/core/agent";
import { MODEL_JUDGE } from "../constants";

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
  instructions: `You are a strict completion judge for a social media AI assistant.

Your only job is to read a USER REQUEST and the ORCHESTRATOR OUTPUT that was produced in response, then decide whether every step the user asked for has been fully addressed.

Rules:
- A step is "complete" only when it has been confirmed with a concrete result (e.g. an ID for write operations, actual data for read operations).
- If the user asked for multiple actions, ALL of them must be confirmed for the verdict to be COMPLETE.
- Vague or partial responses ("I will...", "You can...", "Let me know if...") are NOT complete.
- Errors or failures count as INCOMPLETE unless the user's intent was satisfied despite the error.
- Do not infer or assume steps that the user did not ask for.

Output format — always reply with exactly this structure, no preamble:

VERDICT: COMPLETE
REASON: <one or two sentences explaining why all steps are done>

or:

VERDICT: INCOMPLETE
REASON: <one or two sentences listing which step(s) are missing or unconfirmed>`,
  model: MODEL_JUDGE,
});
