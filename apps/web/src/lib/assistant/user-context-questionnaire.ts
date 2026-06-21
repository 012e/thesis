import { z } from "zod";

import { userContextQuestionnairesAtom } from "@/lib/atoms/user-context-questionnaires";
import store from "@/lib/atoms/store";

const ChoiceOptionSchema = z.object({
  value: z.string().min(1, "Option values cannot be empty."),
  label: z.string().min(1, "Option labels cannot be empty."),
});

const BaseQuestionSchema = z.object({
  id: z.string().min(1, "Question IDs cannot be empty."),
  prompt: z.string().min(1, "Question prompts cannot be empty."),
  description: z.string().min(1).optional(),
  placeholder: z.string().optional(),
});

const YesNoQuestionSchema = BaseQuestionSchema.extend({
  type: z.literal("yes_no"),
  options: z.never().optional(),
});

const SingleChoiceQuestionSchema = BaseQuestionSchema.extend({
  type: z.literal("single_choice"),
  options: z
    .array(ChoiceOptionSchema)
    .min(2, "Single-choice questions require at least two options."),
});

const MultipleChoiceQuestionSchema = BaseQuestionSchema.extend({
  type: z.literal("multiple_choice"),
  options: z
    .array(ChoiceOptionSchema)
    .min(2, "Multiple-choice questions require at least two options."),
});

const TextQuestionSchema = BaseQuestionSchema.extend({
  type: z.literal("text"),
  options: z.never().optional(),
});

export const UserContextQuestionSchema = z.discriminatedUnion("type", [
  YesNoQuestionSchema,
  SingleChoiceQuestionSchema,
  MultipleChoiceQuestionSchema,
  TextQuestionSchema,
]);

export const RequestUserContextInputSchema = z
  .object({
    title: z.string().min(1, "A questionnaire title is required."),
    questions: z
      .array(UserContextQuestionSchema)
      .min(1, "At least one question is required."),
  })
  .superRefine(({ questions }, context) => {
    const questionIds = new Set<string>();

    questions.forEach((question, questionIndex) => {
      if (questionIds.has(question.id)) {
        context.addIssue({
          code: "custom",
          message: `Duplicate question ID: ${question.id}`,
          path: ["questions", questionIndex, "id"],
        });
      }
      questionIds.add(question.id);

      if ("options" in question && question.options) {
        const optionValues = new Set<string>();
        question.options.forEach((option, optionIndex) => {
          if (optionValues.has(option.value)) {
            context.addIssue({
              code: "custom",
              message: `Duplicate option value: ${option.value}`,
              path: [
                "questions",
                questionIndex,
                "options",
                optionIndex,
                "value",
              ],
            });
          }
          optionValues.add(option.value);
        });
      }
    });
  });

export const UserContextAnswerSchema = z.union([
  z.boolean(),
  z.string(),
  z.array(z.string()),
]);

export const UserContextCompletedResultSchema = z.object({
  status: z.literal("completed"),
  answers: z.record(z.string(), UserContextAnswerSchema),
});

export const UserContextCancelledResultSchema = z.object({
  status: z.literal("cancelled"),
});

export const UserContextResultSchema = z.discriminatedUnion("status", [
  UserContextCompletedResultSchema,
  UserContextCancelledResultSchema,
]);

export type RequestUserContextInput = z.infer<
  typeof RequestUserContextInputSchema
>;
export type UserContextQuestion = z.infer<typeof UserContextQuestionSchema>;
export type UserContextAnswer = z.infer<typeof UserContextAnswerSchema>;
export type UserContextResult = z.infer<typeof UserContextResultSchema>;

type PendingQuestionnaire = {
  threadId: string;
  resolve: (result: UserContextResult) => void;
  settled: boolean;
  removeAbortListener?: () => void;
};

const pendingQuestionnaires = new Map<string, PendingQuestionnaire>();

export function requestUserContext(
  threadId: string,
  input: RequestUserContextInput,
  abortSignal?: AbortSignal,
): Promise<UserContextResult> {
  const parsedInput = RequestUserContextInputSchema.parse(input);
  const existing = store.get(userContextQuestionnairesAtom)[threadId];

  if (existing) {
    throw new Error("This thread already has an active questionnaire.");
  }

  const requestId = crypto.randomUUID();

  return new Promise<UserContextResult>((resolve, reject) => {
    const pending: PendingQuestionnaire = {
      threadId,
      resolve,
      settled: false,
    };

    if (abortSignal) {
      const handleAbort = () => {
        const current = pendingQuestionnaires.get(requestId);
        if (!current || current.settled) return;

        current.settled = true;
        pendingQuestionnaires.delete(requestId);
        clearQuestionnaire(threadId, requestId);
        reject(new DOMException("The questionnaire was aborted.", "AbortError"));
      };

      if (abortSignal.aborted) {
        reject(new DOMException("The questionnaire was aborted.", "AbortError"));
        return;
      }

      abortSignal.addEventListener("abort", handleAbort, { once: true });
      pending.removeAbortListener = () =>
        abortSignal.removeEventListener("abort", handleAbort);
    }

    pendingQuestionnaires.set(requestId, pending);
    store.set(userContextQuestionnairesAtom, (questionnaires) => ({
      ...questionnaires,
      [threadId]: {
        requestId,
        title: parsedInput.title,
        questions: parsedInput.questions,
        activeQuestionIndex: 0,
        answers: {},
      },
    }));
  });
}

export function completeUserContextQuestionnaire(
  threadId: string,
  requestId: string,
  answers: Record<string, UserContextAnswer>,
): boolean {
  const questionnaire = store.get(userContextQuestionnairesAtom)[threadId];
  if (!questionnaire || questionnaire.requestId !== requestId) return false;

  const normalizedAnswers: Record<string, UserContextAnswer> = {};
  for (const question of questionnaire.questions) {
    const answer = answers[question.id];
    if (!isQuestionAnswered(question, answer)) return false;

    normalizedAnswers[question.id] =
      question.type === "text" && typeof answer === "string"
        ? answer.trim()
        : answer;
  }

  return settleQuestionnaire(threadId, requestId, {
    status: "completed",
    answers: normalizedAnswers,
  });
}

export function cancelUserContextQuestionnaire(
  threadId: string,
  requestId: string,
): boolean {
  return settleQuestionnaire(threadId, requestId, { status: "cancelled" });
}

export function isQuestionAnswered(
  question: UserContextQuestion,
  answer: UserContextAnswer | undefined,
): boolean {
  switch (question.type) {
    case "yes_no":
      return typeof answer === "boolean";
    case "single_choice":
      return (
        typeof answer === "string" &&
        question.options.some((option) => option.value === answer)
      );
    case "multiple_choice":
      return (
        Array.isArray(answer) &&
        answer.length > 0 &&
        answer.every((value) =>
          question.options.some((option) => option.value === value),
        )
      );
    case "text":
      return typeof answer === "string" && answer.trim().length > 0;
  }
}

function settleQuestionnaire(
  threadId: string,
  requestId: string,
  result: UserContextResult,
): boolean {
  const pending = pendingQuestionnaires.get(requestId);
  if (!pending || pending.threadId !== threadId || pending.settled) return false;

  pending.settled = true;
  pendingQuestionnaires.delete(requestId);
  pending.removeAbortListener?.();
  clearQuestionnaire(threadId, requestId);
  pending.resolve(UserContextResultSchema.parse(result));
  return true;
}

function clearQuestionnaire(threadId: string, requestId: string): void {
  store.set(userContextQuestionnairesAtom, (questionnaires) => {
    if (questionnaires[threadId]?.requestId !== requestId) {
      return questionnaires;
    }

    const next = { ...questionnaires };
    delete next[threadId];
    return next;
  });
}
