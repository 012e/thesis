/**
 * Skills preinstalled for every user the first time they access their skill
 * library. Kept intentionally small and generally useful.
 */
export interface DefaultAgentSkill {
  name: string;
  description: string;
  content: string;
}

export const DEFAULT_AGENT_SKILLS: DefaultAgentSkill[] = [
  {
    name: "Summarize Thread",
    description: "Condense a long discussion into a short, faithful summary.",
    content:
      "Read the entire thread and produce a concise summary that preserves the " +
      "main question, the key points raised, and the conclusion or open issues. " +
      "Use neutral language, keep it under 150 words, and end with any action items.",
  },
  {
    name: "Draft a Reply",
    description: "Write a thoughtful, on-topic reply to a post or comment.",
    content:
      "Given a post and optional context, draft a reply that directly addresses " +
      "the author, adds value, and matches the tone of the conversation. Be " +
      "specific, avoid filler, and keep it friendly and constructive.",
  },
  {
    name: "Explain Like I'm Five",
    description: "Re-explain a technical topic in plain, simple language.",
    content:
      "Take the provided technical content and rewrite it so a curious beginner " +
      "can understand it. Use everyday analogies, short sentences, and avoid " +
      "jargon. Define any term you must keep.",
  },
  {
    name: "Find Related Posts",
    description: "Suggest tags and search queries to discover related content.",
    content:
      "From the given topic, extract the core concepts and propose a handful of " +
      "search queries and relevant tags that would surface closely related posts " +
      "on the platform.",
  },
  {
    name: "Create a New Post",
    description:
      "End-to-end flow for composing and publishing a new post from a topic.",
    content:
      "When the user wants a new post but has not supplied the final text, treat " +
      "it as a multi-step workflow, not a one-shot write. First clarify the goal " +
      "and the post kind (a 'discussion' for opinions/announcements, a 'question' " +
      "for help-seeking). If the topic needs current or factual grounding, " +
      "research it first and keep the sources. Draft the prose in the appropriate " +
      "style, show the draft for review, and only publish after the user approves. " +
      "Confirm with the new post's ID and a link.",
  },
  {
    name: "Publish Provided Post",
    description:
      "Publish final post text exactly as supplied by the user.",
    content:
      "When the user supplies final post text and asks to publish it, treat the " +
      "task as a direct post-creation action. Do not rewrite, summarize, or " +
      "expand the text unless the user explicitly asks for edits first. Choose " +
      "kind 'question' only for help-seeking or Stack Overflow-style technical " +
      "questions; otherwise use kind 'discussion'. Confirm the created post ID " +
      "and provide a link after publishing.",
  },
  {
    name: "Research a Post Topic",
    description:
      "Gather and cross-check facts with citations before drafting a post.",
    content:
      "Before writing a post that makes factual or current-event claims, do real " +
      "research instead of guessing. Run multiple searches across independent " +
      "sources, read the most authoritative ones, and also check the platform's " +
      "own posts for existing discussion. Corroborate important claims with at " +
      "least two sources, note publication dates, and prefer recent information " +
      "for fast-moving topics. Hand the drafting step a short brief: the key facts, " +
      "each tied to a source URL or post, plus anything you could not verify.",
  },
  {
    name: "Ask a Technical Question",
    description:
      "Compose a clear, reproducible Stack Overflow-style question post.",
    content:
      "Turn the user's problem into a focused, answerable question post. Lead with " +
      "a one-line statement of the problem, then include only the context needed to " +
      "reproduce it: what they tried, the exact error or observed result, the " +
      "expected result, and the specific question. Preserve code and error text " +
      "exactly in fenced blocks. Do not invent versions, environments, or fixes. " +
      "Set the post kind to 'question'.",
  },
  {
    name: "Execute Code",
    description:
      "Run a code snippet in the playground and report the result.",
    content:
      "When the user wants to run, test, or debug a snippet, use the code " +
      "playground rather than describing the output from memory. Make sure the " +
      "playground language matches the snippet, put the code in the file, run it, " +
      "and report the actual output or error. If it fails, explain the cause and " +
      "propose a concrete fix before re-running. Only edit the file the user is " +
      "working on; do not invent results you did not observe.",
  },
  {
    name: "Debug Code",
    description:
      "Use the playground to reproduce, diagnose, and fix broken code.",
    content:
      "When the user asks why code fails or asks for a fix, reproduce the issue " +
      "in the playground when possible. Preserve the user's code, run it, read " +
      "the actual error or output, and identify the smallest concrete cause. " +
      "Apply a focused fix, run the code again, and report both the fix and the " +
      "verified result. Do not claim a fix worked unless the rerun succeeds or " +
      "the remaining failure is clearly explained.",
  },
  {
    name: "Apply Saved Skill",
    description:
      "Find and apply the user's reusable instructions before planning or acting.",
    content:
      "Before planning or executing a task that resembles a reusable workflow, " +
      "search the user's saved agent skills by meaning. If a relevant skill is " +
      "found, follow its instructions for the matching step and mention the " +
      "skill name in the plan or handoff. If no relevant skill exists, continue " +
      "without forcing one.",
  },
];
