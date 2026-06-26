import dedent from "dedent";

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
    content: dedent`
      Use this when the user wants a compact summary of a discussion thread without changing the meaning.

      Steps:
      1. Read the full thread before writing anything, including the original post, replies, disagreements, decisions, and unresolved questions.
      2. Identify the central question or topic in one sentence.
      3. Extract only the important points: decisions, evidence, tradeoffs, blockers, and repeated concerns.
      4. Preserve attribution when it matters, such as who proposed a decision or who owns a follow-up.
      5. Omit filler, jokes, duplicated arguments, and side conversations unless they affect the outcome.
      6. Write in neutral language under 150 words unless the user asks for a longer summary.
      7. End with action items or open issues if any exist; otherwise state the conclusion clearly.

      Output:
      Return a concise paragraph or short bullets with no invented facts.
    `,
  },
  {
    name: "Draft a Reply",
    description: "Write a thoughtful, on-topic reply to a post or comment.",
    content: dedent`
      Use this when the user wants a reply draft but has not supplied final text to publish unchanged.

      Steps:
      1. Read the target post or comment and any surrounding context that affects tone or meaning.
      2. Determine the reply intent: answer, agreement, disagreement, clarification, appreciation, or follow-up question.
      3. Match the conversation's tone while staying constructive and specific.
      4. Add one concrete contribution: a useful detail, example, question, tradeoff, or next step.
      5. Avoid generic praise, performative agreement, personal attacks, and claims that are not supported by the context.
      6. Keep the reply focused on the author and the thread, not on unrelated topics.
      7. If the reply depends on an uncertain fact, phrase it cautiously or ask a clarifying question.

      Output:
      Return only the drafted reply unless the user asks for alternatives or explanation.
    `,
  },
  {
    name: "Explain Like I'm Five",
    description: "Re-explain a technical topic in plain, simple language.",
    content: dedent`
      Use this when the user wants a technical idea explained in beginner-friendly language.

      Steps:
      1. Identify the core idea the user needs to understand, not every implementation detail.
      2. Translate specialized terms into everyday language before using them.
      3. Use a simple analogy only if it clarifies the idea; keep it accurate enough that it does not mislead.
      4. Break the explanation into small steps with short sentences.
      5. Define any technical term that must remain because it is central to the topic.
      6. Avoid condescension, baby talk, and over-simplifications that change the meaning.
      7. Finish with a one-sentence recap that names the practical takeaway.

      Output:
      Return a plain-language explanation a curious beginner can follow.
    `,
  },
  {
    name: "Find Related Posts",
    description: "Suggest tags and search queries to discover related content.",
    content: dedent`
      Use this when the user wants to discover related content on the platform.

      Steps:
      1. Read the topic and separate the main concept, subtopics, named entities, technologies, and likely synonyms.
      2. Convert the topic into several search intents, such as exact phrase, broader concept, troubleshooting angle, and beginner-friendly phrasing.
      3. Suggest tags that are specific enough to filter useful posts but broad enough to have results.
      4. Include alternate terms and abbreviations when they are common in the domain.
      5. Avoid tags that are only decorative, overly broad, or unrelated to the user's actual goal.
      6. If platform search tools are available, run the strongest queries and prefer results from recent or high-signal posts.
      7. Group the final suggestions by purpose so the user can choose quickly.

      Output:
      Return search queries, suggested tags, and a short note on what each query is meant to find.
    `,
  },
  {
    name: "Create a New Post",
    description:
      "End-to-end flow for composing and publishing a new post from a topic.",
    content: dedent`
      Use this when the user wants to create a post from an idea, topic, rough notes, or research brief.

      Steps:
      1. Clarify the goal, audience, desired tone, and whether the post is a 'discussion' or a help-seeking 'question'.
      2. If the post makes factual, technical, or current claims, research before drafting and keep source URLs or platform post references.
      3. Decide the structure: hook or problem statement, necessary context, main points, and a closing question or call to action.
      4. Draft the post in the appropriate style: conversational for discussion, reproducible and focused for a question.
      5. Preserve the user's specific opinions, constraints, code, error messages, and desired wording when supplied.
      6. Suggest relevant tags if the platform supports them.
      7. Show the draft to the user for review before publishing.
      8. Apply requested edits and ask for approval again if the meaning changes.
      9. Publish only after explicit approval or when the user clearly instructs you to post the final draft.
      10. Confirm the created post ID and provide a link when available.

      Output:
      Return the draft first. After publishing, return the post ID, link, and any tags used.
    `,
  },
  {
    name: "Publish Provided Post",
    description: "Publish final post text exactly as supplied by the user.",
    content: dedent`
      Use this when the user gives final post text and asks you to publish it.

      Steps:
      1. Treat the supplied text as final and do not rewrite, summarize, expand, or correct it unless the user explicitly asks for edits.
      2. Determine the post kind from the content: use 'question' only for help-seeking or Stack Overflow-style technical questions; otherwise use 'discussion'.
      3. Preserve formatting, code blocks, links, punctuation, and line breaks as closely as the post API allows.
      4. If required fields are missing and cannot be inferred safely, ask only for the missing field.
      5. Publish the post using the exact final content.
      6. Confirm the created post ID and provide a link when available.

      Output:
      Return a short publication confirmation with the post ID and link.
    `,
  },
  {
    name: "Research a Post Topic",
    description:
      "Gather and cross-check facts with citations before drafting a post.",
    content: dedent`
      Use this before drafting a post that depends on facts, current events, technical claims, market data, product details, or citations.

      Steps:
      1. Restate the research question and identify the claims the eventual post needs to make.
      2. Search independent sources instead of relying on memory.
      3. Prefer authoritative sources: official documentation, primary research, standards bodies, company announcements, public datasets, or reputable reporting.
      4. Check the platform's own posts and tags for existing discussion, duplicates, or useful internal context.
      5. Corroborate important claims with at least two sources when possible.
      6. Record publication dates and use recent sources for fast-moving topics.
      7. Separate verified facts from interpretation, opinion, and uncertain claims.
      8. Do not include a claim in the draft brief if you cannot verify it; list it under open questions instead.
      9. Prepare a concise brief for the drafting step.

      Output:
      Return key facts with source URLs or platform post references, notable disagreements, dates, and unresolved questions.
    `,
  },
  {
    name: "Ask a Technical Question",
    description:
      "Compose a clear, reproducible Stack Overflow-style question post.",
    content: dedent`
      Use this when the user wants to turn a technical problem into a focused question post.

      Steps:
      1. Identify the exact problem and write it as a one-line title or opening sentence.
      2. Include only the context needed to reproduce or understand the issue: environment, relevant versions, inputs, commands, code, and configuration.
      3. Preserve code, logs, stack traces, and error messages exactly in fenced code blocks.
      4. State what the user expected to happen and what actually happened.
      5. Summarize what the user already tried and what changed after each attempt.
      6. End with one specific question that an expert can answer.
      7. Do not invent versions, environments, errors, attempted fixes, or conclusions.
      8. Set the post kind to 'question'.

      Output:
      Return a clear question draft with title, body, and suggested tags if relevant.
    `,
  },
  {
    name: "Execute Code",
    description:
      "Run a code snippet in the playground and report the result.",
    content: dedent`
      Use this when the user asks to run, test, inspect, or verify a code snippet.

      Steps:
      1. Determine the correct playground language and runtime from the snippet or the user's request.
      2. Put the code in the appropriate playground file without changing behavior unless the user requested edits.
      3. Run the code in the playground instead of predicting the result from memory.
      4. Capture the actual output, exit status, warnings, and errors.
      5. If the code fails, identify the concrete failure point and explain it briefly.
      6. Propose the smallest useful fix, apply it only when the user asked for fixing or when rerunning is part of the task, then run again.
      7. Do not invent output or claim execution succeeded unless it actually did.

      Output:
      Return the command or playground action used, the actual output or error, and any verified fix.
    `,
  },
  {
    name: "Debug Code",
    description:
      "Use the playground to reproduce, diagnose, and fix broken code.",
    content: dedent`
      Use this when the user asks why code fails, asks for a fix, or provides an error to diagnose.

      Steps:
      1. Reproduce the issue in the playground when possible, using the user's original code first.
      2. Preserve the user's code, inputs, and error text before making changes.
      3. Run the code and inspect the actual error, output, stack trace, or failing behavior.
      4. Identify the smallest concrete cause that explains the observed failure.
      5. Apply a focused fix that addresses that cause without unrelated rewrites.
      6. Run the code again after the fix.
      7. If the rerun succeeds, report the verified result. If it still fails, explain the remaining blocker and the next concrete step.
      8. Do not claim a fix worked unless the rerun succeeds or the remaining failure is clearly bounded.

      Output:
      Return the root cause, the changed code or fix summary, and the verified rerun result.
    `,
  },
  {
    name: "Apply Saved Skill",
    description:
      "Find and apply the user's reusable instructions before planning or acting.",
    content: dedent`
      Use this before planning or executing work that may match the user's reusable instructions.

      Steps:
      1. Search the user's saved agent skills by meaning, not just exact keywords.
      2. Review the top matches and decide whether any skill materially applies to the current request.
      3. If a relevant skill exists, follow its instructions for the matching part of the workflow.
      4. Mention the applied skill name in the plan, handoff, or execution summary so the user can see why it was used.
      5. If multiple skills apply, use the smallest useful set and resolve conflicts by prioritizing the skill most specific to the task.
      6. If no relevant skill exists, continue normally without forcing a skill into the workflow.
      7. If the user asks to save new reusable instructions, create or update an agent skill instead of only acknowledging the request.

      Output:
      Return the relevant skill name when one is applied, or proceed silently when no skill matches.
    `,
  },
];
