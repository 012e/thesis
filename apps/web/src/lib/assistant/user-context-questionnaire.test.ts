import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";

import { userContextQuestionnairesAtom } from "@/lib/atoms/user-context-questionnaires";
import store from "@/lib/atoms/store";
import {
  cancelUserContextQuestionnaire,
  completeUserContextQuestionnaire,
  RequestUserContextInputSchema,
  RequestUserContextToolInputSchema,
  requestUserContext,
} from "./user-context-questionnaire";

afterEach(() => {
  store.set(userContextQuestionnairesAtom, {});
});

describe("RequestUserContextInputSchema", () => {
  it("exposes a provider-compatible tool schema without union exclusions", () => {
    const jsonSchema = z.toJSONSchema(RequestUserContextToolInputSchema);
    const schema = JSON.stringify(jsonSchema);

    expect(schema).not.toContain('"oneOf"');
    expect(schema).not.toContain('"not"');
    expect(schema).toContain(
      '"required":["id","prompt","type","options"]',
    );
    expect(schema).toContain(
      '"options":{"type":"array","items":{"type":"string"',
    );
  });

  it("rejects tool questions that omit the options array", () => {
    expect(
      RequestUserContextToolInputSchema.safeParse({
        title: "Missing options",
        questions: [
          {
            id: "audience",
            prompt: "Who is the post for?",
            type: "single_choice",
          },
        ],
      }).success,
    ).toBe(false);
  });

  it("rejects object options in the model-facing schema", () => {
    expect(
      RequestUserContextToolInputSchema.safeParse({
        title: "Age question",
        questions: [
          {
            id: "age",
            prompt: "What is your age range?",
            type: "multiple_choice",
            options: [{}],
          },
        ],
      }).success,
    ).toBe(false);
  });

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
  it("normalizes null and empty fields emitted for optional tool parameters", async () => {
    const resultPromise = requestUserContext("thread-a", {
      title: "Quick questions",
      questions: [
        {
          id: "q1",
          prompt: "What would you like help with?",
          description: "Used to decide the next step.",
          placeholder: "Type your request here",
          type: "text",
          options: [],
        },
        {
          id: "q2",
          prompt: "Advice or action?",
          description: null,
          placeholder: null,
          type: "single_choice",
          options: ["Just advice", "Take action"],
        },
      ],
    });

    const questionnaire = store.get(userContextQuestionnairesAtom)["thread-a"]!;
    expect(questionnaire.questions).toEqual([
      {
        id: "q1",
        prompt: "What would you like help with?",
        description: "Used to decide the next step.",
        placeholder: "Type your request here",
        type: "text",
      },
      {
        id: "q2",
        prompt: "Advice or action?",
        type: "single_choice",
        options: [
          { value: "Just advice", label: "Just advice" },
          { value: "Take action", label: "Take action" },
        ],
      },
    ]);

    cancelUserContextQuestionnaire("thread-a", questionnaire.requestId);
    await expect(resultPromise).resolves.toEqual({ status: "cancelled" });
  });

  it("accepts string options and normalizes them for choice questions", async () => {
    const resultPromise = requestUserContext("thread-a", {
      title: "Java error post details",
      questions: [
        {
          id: "java_code",
          prompt:
            "Paste the Java code or the smallest relevant excerpt that shows the problem.",
          type: "text",
          options: [],
        },
        {
          id: "error_message",
          prompt: "What exact error message or stack trace are you seeing?",
          type: "text",
          options: [],
        },
        {
          id: "expected_behavior",
          prompt: "What should the code do when it works correctly?",
          type: "text",
          options: [],
        },
        {
          id: "post_style",
          prompt: "What kind of post do you want to create?",
          type: "single_choice",
          options: [
            "Stack Overflow-style technical question",
            "General discussion post",
          ],
        },
      ],
    });

    const questionnaire = store.get(userContextQuestionnairesAtom)["thread-a"]!;
    expect(questionnaire.questions[3]).toEqual({
      id: "post_style",
      prompt: "What kind of post do you want to create?",
      type: "single_choice",
      options: [
        {
          value: "Stack Overflow-style technical question",
          label: "Stack Overflow-style technical question",
        },
        {
          value: "General discussion post",
          label: "General discussion post",
        },
      ],
    });

    cancelUserContextQuestionnaire("thread-a", questionnaire.requestId);
    await expect(resultPromise).resolves.toEqual({ status: "cancelled" });
  });

  it("rejects null options for choice questions", () => {
    expect(() =>
      requestUserContext("thread-a", {
        title: "Invalid choice",
        questions: [
          {
            id: "post_style",
            prompt: "What kind of post do you want to create?",
            type: "single_choice",
          },
        ],
      }),
    ).toThrow();
  });

  it("ignores empty options for non-choice questions", async () => {
    const resultPromise = requestUserContext("thread-a", {
      title: "Quick question",
      questions: [
        {
          id: "q1",
          prompt: "What would you like help with?",
          placeholder: "",
          type: "text",
          options: [],
        },
      ],
    });

    const questionnaire = store.get(userContextQuestionnairesAtom)["thread-a"]!;
    expect(questionnaire.questions[0]).toEqual({
      id: "q1",
      prompt: "What would you like help with?",
      placeholder: "",
      type: "text",
    });

    cancelUserContextQuestionnaire("thread-a", questionnaire.requestId);
    await expect(resultPromise).resolves.toEqual({ status: "cancelled" });
  });

  it("uses the tool call ID as the questionnaire request ID", async () => {
    const resultPromise = requestUserContext(
      "thread-a",
      {
        title: "Context",
        questions: [
          {
            id: "proceed",
            prompt: "Proceed?",
            type: "yes_no",
            options: [],
          },
        ],
      },
      undefined,
      "tool-call-1",
    );

    const questionnaire = store.get(userContextQuestionnairesAtom)["thread-a"]!;
    expect(questionnaire.requestId).toBe("tool-call-1");

    cancelUserContextQuestionnaire("thread-a", questionnaire.requestId);
    await expect(resultPromise).resolves.toEqual({ status: "cancelled" });
  });

  it("returns one complete structured result and cannot settle twice", async () => {
    const resultPromise = requestUserContext("thread-a", {
      title: "Context",
      questions: [
        { id: "proceed", prompt: "Proceed?", type: "yes_no", options: [] },
        { id: "notes", prompt: "Notes?", type: "text", options: [] },
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
      questions: [
        { id: "notes", prompt: "Notes?", type: "text", options: [] },
      ],
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
      questions: [
        { id: "first", prompt: "First?", type: "yes_no", options: [] },
      ],
    });
    void requestUserContext("thread-b", {
      title: "Second",
      questions: [
        { id: "second", prompt: "Second?", type: "text", options: [] },
      ],
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
