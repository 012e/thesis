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
];
