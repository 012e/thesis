import { z } from "zod";

/**
 * Shared types and a pending-promise registry for the onboarding assistant
 * tools. Each onboarding tool is a *client* tool: the agent calls it with its
 * suggestions, the UI renders a tailored interactive card, and the user's
 * answer is returned to the agent as the tool result.
 *
 * The model-facing input schemas are intentionally flat (no discriminated
 * unions / `oneOf` / `not`) because some tool-calling providers reject the JSON
 * Schema generated from stricter Zod constructs before our client executor can
 * run.
 */

// ── Tool names ────────────────────────────────────────────────────────────────

export const ONBOARDING_TOOL_NAMES = {
  chooseExperience: "choose_experience",
  pickContentTypes: "pick_content_types",
  suggestTags: "suggest_tags",
  suggestBio: "suggest_bio",
  pickProfileMedia: "pick_profile_media",
  finishOnboarding: "finish_onboarding",
} as const;

// ── Input schemas (model-facing) ────────────────────────────────────────────

const ChoiceOptionSchema = z.object({
  value: z.string().min(1).describe("Stable machine value for this option"),
  label: z.string().min(1).describe("Short label shown to the user"),
  description: z
    .string()
    .min(1)
    .nullish()
    .describe("Optional one-line explanation shown under the label"),
});

export const ChooseExperienceInputSchema = z.object({
  message: z
    .string()
    .min(1)
    .describe("Short friendly framing shown above the options"),
  options: z
    .array(ChoiceOptionSchema)
    .min(2)
    .describe("The experience levels the user can pick from (single choice)"),
});

export const PickContentTypesInputSchema = z.object({
  message: z
    .string()
    .min(1)
    .describe("Short friendly framing shown above the options"),
  options: z
    .array(ChoiceOptionSchema)
    .min(2)
    .describe("The content types the user can pick from (multiple choice)"),
});

export const SuggestTagsInputSchema = z.object({
  message: z
    .string()
    .min(1)
    .describe("Short friendly framing shown above the suggested tags"),
  suggestions: z
    .array(
      z.object({
        tag: z
          .string()
          .min(1)
          .describe("A lowercase, hyphenated topic tag, e.g. 'system-design'"),
        reason: z
          .string()
          .min(1)
          .nullish()
          .describe("Optional short phrase explaining why it fits the user"),
      }),
    )
    .min(1)
    .describe("8–12 personalised tag suggestions the user can toggle"),
});

export const SuggestBioInputSchema = z.object({
  message: z
    .string()
    .min(1)
    .describe("Short friendly framing inviting the user to tweak the draft"),
  draft: z
    .string()
    .min(1)
    .describe("A first-person bio draft (2–3 sentences) the user can edit"),
});

export const PickProfileMediaInputSchema = z.object({
  message: z
    .string()
    .min(1)
    .describe(
      "Short friendly framing inviting the user to add a profile picture and cover image",
    ),
});

export const FinishOnboardingInputSchema = z.object({
  message: z
    .string()
    .min(1)
    .describe(
      "Short celebratory message shown while the user is redirected to the home feed",
    ),
});

export type ChoiceOption = z.infer<typeof ChoiceOptionSchema>;
export type ChooseExperienceInput = z.infer<typeof ChooseExperienceInputSchema>;
export type PickContentTypesInput = z.infer<typeof PickContentTypesInputSchema>;
export type SuggestTagsInput = z.infer<typeof SuggestTagsInputSchema>;
export type SuggestBioInput = z.infer<typeof SuggestBioInputSchema>;
export type PickProfileMediaInput = z.infer<
  typeof PickProfileMediaInputSchema
>;
export type FinishOnboardingInput = z.infer<typeof FinishOnboardingInputSchema>;

// ── Result shapes (returned to the agent) ───────────────────────────────────

export type OnboardingResult =
  | { status: "submitted"; value: string }
  | { status: "submitted"; values: string[] }
  | { status: "submitted"; tags: string[] }
  | { status: "submitted"; bio: string }
  | {
      status: "submitted";
      avatarUrl: string | null;
      coverPhotoUrl: string | null;
    }
  | { status: "skipped" }
  | { status: "completed" };

// ── Pending-promise registry ────────────────────────────────────────────────

type PendingEntry = {
  resolve: (result: OnboardingResult) => void;
  reject: (reason: unknown) => void;
  settled: boolean;
};

const pending = new Map<string, PendingEntry>();

/**
 * Returns a promise that resolves once the user submits (or skips) the card for
 * the given tool call. Used as the `execute` body of each onboarding client
 * tool so the agent suspends until the user responds.
 */
export function awaitOnboardingResponse(
  toolCallId: string,
  abortSignal?: AbortSignal,
): Promise<OnboardingResult> {
  return new Promise<OnboardingResult>((resolve, reject) => {
    if (abortSignal?.aborted) {
      reject(new DOMException("The onboarding step was aborted.", "AbortError"));
      return;
    }

    const entry: PendingEntry = { resolve, reject, settled: false };
    pending.set(toolCallId, entry);

    abortSignal?.addEventListener(
      "abort",
      () => {
        if (entry.settled) return;
        entry.settled = true;
        pending.delete(toolCallId);
        reject(
          new DOMException("The onboarding step was aborted.", "AbortError"),
        );
      },
      { once: true },
    );
  });
}

/**
 * Resolves a pending onboarding tool call with the user's answer. Returns false
 * if there is no live pending call for the id (e.g. after a reload).
 */
export function resolveOnboardingResponse(
  toolCallId: string,
  result: OnboardingResult,
): boolean {
  const entry = pending.get(toolCallId);
  if (!entry || entry.settled) return false;

  entry.settled = true;
  pending.delete(toolCallId);
  entry.resolve(result);
  return true;
}
