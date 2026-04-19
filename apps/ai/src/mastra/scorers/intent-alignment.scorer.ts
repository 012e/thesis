import { createScorer } from "@mastra/core/evals";

/**
 * Intent-alignment scorer — checks whether the orchestrator's response is
 * aligned with what the user actually asked for.
 *
 * A function-only scorer (no LLM judge) that uses keyword heuristics to detect
 * obvious mismatches between the user's intent and the agent's action. It runs
 * asynchronously in the background without blocking the stream.
 *
 * Score: 1 = response aligns with user intent, 0 = clear mismatch detected.
 */
export const intentAlignmentScorer = createScorer({
  id: "intent-alignment",
  name: "Intent Alignment",
  description:
    "Validates that the orchestrator performed the action the user asked for and did not confuse read vs write operations, or act on the wrong entity.",
  type: "agent",
}).generateScore(({ run }) => {
  const input = run.input;
  const output = run.output;

  if (!input || !output || output.length === 0) return 0;

  // Extract the last user message text
  const inputMessages: Array<{ role?: string; content: unknown }> =
    input.inputMessages ?? [];
  const lastUserMessage = [...inputMessages]
    .reverse()
    .find((m) => m.role === "user");

  if (!lastUserMessage) return 1; // No user message to compare against — skip

  const userText =
    typeof lastUserMessage.content === "string"
      ? lastUserMessage.content.toLowerCase()
      : "";

  // Extract all response text
  const responseText = output
    .map((msg: { content: unknown }) => {
      if (typeof msg.content === "string") return msg.content;
      if (Array.isArray(msg.content)) {
        return msg.content
          .map((part: { type?: string; text?: string }) =>
            part.type === "text" ? (part.text ?? "") : "",
          )
          .join(" ");
      }
      return "";
    })
    .join(" ")
    .toLowerCase();

  // --- Mismatch detection rules ---

  // User asked to read/list but response says something was created/deleted
  const userWantsRead =
    /\b(show|list|get|find|what|fetch|read|display|see|look up)\b/.test(
      userText,
    );
  const responseDidWrite = /\b(created|deleted|updated|posted)\b/.test(
    responseText,
  );
  if (userWantsRead && responseDidWrite) return 0;

  // User asked to create/write but response only describes without confirming
  const userWantsWrite = /\b(create|post|publish|write|add|make)\b/.test(
    userText,
  );
  const responseOnlyDescribed =
    /\b(you can|you could|to create|in order to)\b/.test(responseText) &&
    !responseDidWrite;
  if (userWantsWrite && responseOnlyDescribed) return 0;

  // User asked to delete but nothing was confirmed deleted
  const userWantsDelete = /\b(delete|remove|erase)\b/.test(userText);
  const responseConfirmedDelete = /\b(deleted|removed)\b/.test(responseText);
  if (userWantsDelete && !responseConfirmedDelete) return 0;

  return 1;
});
