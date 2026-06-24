import { ONBOARDING_TOOL_NAMES } from "@/lib/assistant/onboarding-tools";

/**
 * Tools that render their own rich, full-width UI and must break out of the
 * activity timeline.
 */
const RICH_TOOL_NAMES = new Set<string>([
  "render_line_graph",
  ...Object.values(ONBOARDING_TOOL_NAMES),
]);

/** Whether a tool call should render as a compact step in the activity timeline. */
export function isTimelineTool(toolName: string) {
  return !RICH_TOOL_NAMES.has(toolName);
}
