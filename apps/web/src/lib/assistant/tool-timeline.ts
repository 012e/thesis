import { ONBOARDING_TOOL_NAMES } from "@/lib/assistant/onboarding-tools";

/**
 * Tools that render their own rich, full-width UI (charts, post cards,
 * interactive questionnaires). These must NOT be collapsed into a compact
 * timeline step — they break out and render standalone.
 */
const RICH_TOOL_NAMES = new Set<string>([
  "render_line_graph",
  "render_post",
  "render_comment",
  ...Object.values(ONBOARDING_TOOL_NAMES),
]);

/** Whether a tool call should render as a compact step in the activity timeline. */
export function isTimelineTool(toolName: string) {
  return !RICH_TOOL_NAMES.has(toolName);
}
