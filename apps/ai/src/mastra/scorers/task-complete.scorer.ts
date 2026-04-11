import { createScorer } from '@mastra/core/evals';

/**
 * Task-complete scorer — validates whether the orchestrator has fully addressed
 * the user's request before ending its response.
 *
 * This is a lightweight, function-only scorer (no LLM judge call) that checks
 * for structural signals of a complete response. It is attached to the
 * orchestrator agent as an async background scorer.
 *
 * Score: 1 = task appears complete, 0 = incomplete or ambiguous.
 */
export const taskCompleteScorer = createScorer({
  id: 'task-complete',
  name: 'Task Completeness',
  description:
    'Checks whether the orchestrator response contains a concrete result or confirmation rather than an unresolved question or partial answer.',
  type: 'agent',
}).generateScore(({ run }) => {
  const output = run.output;
  if (!output || output.length === 0) return 0;

  // Collect all text content from the output messages
  const text = output
    .map((msg: { content: unknown }) => {
      if (typeof msg.content === 'string') return msg.content;
      if (Array.isArray(msg.content)) {
        return msg.content
          .map((part: { type?: string; text?: string }) =>
            part.type === 'text' ? (part.text ?? '') : '',
          )
          .join(' ');
      }
      return '';
    })
    .join(' ')
    .toLowerCase();

  if (text.trim().length === 0) return 0;

  // Signals that the response is still open / incomplete
  const incompleteSignals = [
    'i need more information',
    'could you clarify',
    'please provide',
    'i am unable to',
    "i'm unable to",
    'i cannot complete',
    "i can't complete",
    'what would you like',
    'let me know what',
  ];

  const hasIncompleteSignal = incompleteSignals.some((signal) =>
    text.includes(signal),
  );
  if (hasIncompleteSignal) return 0;

  // Signals that a concrete action was taken or an answer was given
  const completeSignals = [
    'successfully',
    'created',
    'updated',
    'deleted',
    'posted',
    'followed',
    'unfollowed',
    'reacted',
    'commented',
    'here are',
    'here is',
    'the post',
    'the comment',
    'the profile',
  ];

  const hasCompleteSignal = completeSignals.some((signal) =>
    text.includes(signal),
  );
  return hasCompleteSignal ? 1 : 0.5; // 0.5 = uncertain, score but don't block
});
