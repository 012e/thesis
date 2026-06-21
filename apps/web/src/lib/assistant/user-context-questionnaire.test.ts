import { afterEach, describe, expect, it } from "vitest";

import { userContextQuestionnairesAtom } from "@/lib/atoms/user-context-questionnaires";
import store from "@/lib/atoms/store";
import {
  cancelUserContextQuestionnaire,
  completeUserContextQuestionnaire,
  RequestUserContextInputSchema,
  requestUserContext,
} from "./user-context-questionnaire";

afterEach(() => {
  store.set(userContextQuestionnairesAtom, {});
});

describe("RequestUserContextInputSchema", () => {
  it("accepts every supported question type", () => {
    expect(
      RequestUserContextInputSchema.safeParse({
        title: "Project context",
        questions: [
          { id: "confirmed", prompt: "Proceed?", type: "yes_no" },
          {
            id: "priority",
            prompt: "Priority?",
            type: "single_choice",
            options: [
              { value: "speed", label: "Speed" },
              { value: "quality", label: "Quality" },
            ],
          },
          {
            id: "channels",
            prompt: "Channels?",
            type: "multiple_choice",
            options: [
              { value: "email", label: "Email" },
              { value: "push", label: "Push" },
            ],
          },
          {
            id: "notes",
            prompt: "Notes?",
            type: "text",
            placeholder: "Add details",
          },
        ],
      }).success,
    ).toBe(true);
  });

  it("rejects missing choice options, duplicate IDs, and duplicate option values", () => {
    const missingOptions = RequestUserContextInputSchema.safeParse({
      title: "Invalid",
      questions: [
        { id: "choice", prompt: "Choose", type: "single_choice" },
      ],
    });
    const duplicateIds = RequestUserContextInputSchema.safeParse({
      title: "Invalid",
      questions: [
        { id: "same", prompt: "First?", type: "yes_no" },
        { id: "same", prompt: "Second?", type: "text" },
      ],
    });
    const duplicateOptions = RequestUserContextInputSchema.safeParse({
      title: "Invalid",
      questions: [
        {
          id: "choice",
          prompt: "Choose",
          type: "multiple_choice",
          options: [
            { value: "same", label: "First" },
            { value: "same", label: "Second" },
          ],
        },
      ],
    });

    expect(missingOptions.success).toBe(false);
    expect(duplicateIds.success).toBe(false);
    expect(duplicateOptions.success).toBe(false);
  });
});

describe("questionnaire settlement", () => {
  it("returns one complete structured result and cannot settle twice", async () => {
    const resultPromise = requestUserContext("thread-a", {
      title: "Context",
      questions: [
        { id: "proceed", prompt: "Proceed?", type: "yes_no" },
        { id: "notes", prompt: "Notes?", type: "text" },
      ],
    });
    const questionnaire = store.get(userContextQuestionnairesAtom)["thread-a"]!;

    expect(
      completeUserContextQuestionnaire("thread-a", questionnaire.requestId, {
        proceed: false,
        notes: "  Keep this concise.  ",
      }),
    ).toBe(true);
    expect(
      cancelUserContextQuestionnaire("thread-a", questionnaire.requestId),
    ).toBe(false);
    await expect(resultPromise).resolves.toEqual({
      status: "completed",
      answers: {
        proceed: false,
        notes: "Keep this concise.",
      },
    });
  });

  it("cancels without returning partial answers", async () => {
    const resultPromise = requestUserContext("thread-a", {
      title: "Context",
      questions: [{ id: "notes", prompt: "Notes?", type: "text" }],
    });
    const questionnaire = store.get(userContextQuestionnairesAtom)["thread-a"]!;
    store.set(userContextQuestionnairesAtom, (questionnaires) => ({
      ...questionnaires,
      "thread-a": {
        ...questionnaire,
        answers: { notes: "partial" },
      },
    }));

    cancelUserContextQuestionnaire("thread-a", questionnaire.requestId);

    await expect(resultPromise).resolves.toEqual({ status: "cancelled" });
  });

  it("keeps pending state isolated by thread", () => {
    void requestUserContext("thread-a", {
      title: "First",
      questions: [{ id: "first", prompt: "First?", type: "yes_no" }],
    });
    void requestUserContext("thread-b", {
      title: "Second",
      questions: [{ id: "second", prompt: "Second?", type: "text" }],
    });

    const questionnaires = store.get(userContextQuestionnairesAtom);
    expect(questionnaires["thread-a"]?.title).toBe("First");
    expect(questionnaires["thread-b"]?.title).toBe("Second");

    cancelUserContextQuestionnaire(
      "thread-a",
      questionnaires["thread-a"]!.requestId,
    );
    cancelUserContextQuestionnaire(
      "thread-b",
      questionnaires["thread-b"]!.requestId,
    );
  });
});
