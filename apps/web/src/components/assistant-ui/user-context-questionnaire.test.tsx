import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "jotai";

import { userContextQuestionnairesAtom } from "@/lib/atoms/user-context-questionnaires";
import store from "@/lib/atoms/store";
import {
  cancelUserContextQuestionnaire,
  requestUserContext,
} from "@/lib/assistant/user-context-questionnaire";
import { UserContextQuestionnaire } from "./user-context-questionnaire";

afterEach(() => {
  cleanup();

  const questionnaires = store.get(userContextQuestionnairesAtom);
  Object.entries(questionnaires).forEach(([threadId, questionnaire]) => {
    if (questionnaire) {
      cancelUserContextQuestionnaire(threadId, questionnaire.requestId);
    }
  });
  store.set(userContextQuestionnairesAtom, {});
});

function renderQuestionnaire(threadId: string) {
  return render(
    <Provider store={store}>
      <UserContextQuestionnaire threadId={threadId} />
    </Provider>,
  );
}

describe("UserContextQuestionnaire", () => {
  it("supports navigation, answer retention, all controls, and final submission", async () => {
    const user = userEvent.setup();
    const resultPromise = requestUserContext("thread-a", {
      title: "Launch context",
      questions: [
        {
          id: "approved",
          prompt: "Is this approved?",
          type: "yes_no",
          options: [],
        },
        {
          id: "priority",
          prompt: "Choose a priority",
          type: "single_choice",
          options: ["Speed", "Quality"],
        },
        {
          id: "channels",
          prompt: "Choose channels",
          type: "multiple_choice",
          options: ["Email", "Push"],
        },
        {
          id: "notes",
          prompt: "Add notes",
          type: "text",
          placeholder: "Required details",
          options: [],
        },
      ],
    });

    renderQuestionnaire("thread-a");

    const tabList = screen.getByRole("tablist", {
      name: "Question progress",
    });
    expect(tabList.className).toContain("overflow-x-auto");
    expect(screen.getByRole("button", { name: "Next" }).hasAttribute("disabled")).toBe(
      true,
    );

    await user.click(screen.getByRole("button", { name: "No" }));
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: "Quality" }));
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: "Email" }));
    await user.click(screen.getByRole("button", { name: "Push" }));
    await user.click(screen.getByRole("button", { name: "Next" }));

    const submit = screen.getByRole("button", { name: "Submit" });
    expect(submit.hasAttribute("disabled")).toBe(true);
    await user.type(screen.getByLabelText("Add notes"), "Ship on Friday");
    expect(submit.hasAttribute("disabled")).toBe(false);

    await user.click(screen.getByRole("tab", { name: "2" }));
    expect(
      screen.getByRole("button", { name: "Quality" }).getAttribute("aria-pressed"),
    ).toBe("true");
    await user.click(screen.getByRole("tab", { name: "4" }));
    await user.click(screen.getByRole("button", { name: "Submit" }));

    await expect(resultPromise).resolves.toEqual({
      status: "completed",
      answers: {
        approved: false,
        priority: "Quality",
        channels: ["Email", "Push"],
        notes: "Ship on Friday",
      },
    });
  });

  it("shows only the active thread questionnaire and cancellation returns no answers", async () => {
    const user = userEvent.setup();
    const firstResult = requestUserContext("thread-a", {
      title: "First thread",
      questions: [
        { id: "first", prompt: "First answer", type: "text", options: [] },
      ],
    });
    const secondResult = requestUserContext("thread-b", {
      title: "Second thread",
      questions: [
        { id: "second", prompt: "Second answer", type: "text", options: [] },
      ],
    });

    const view = renderQuestionnaire("thread-a");
    await user.type(screen.getByLabelText("First answer"), "partial");
    expect(screen.getByText("First thread")).toBeTruthy();
    expect(screen.queryByText("Second thread")).toBeNull();

    view.rerender(
      <Provider store={store}>
        <UserContextQuestionnaire threadId="thread-b" />
      </Provider>,
    );
    expect(screen.getByText("Second thread")).toBeTruthy();
    expect(screen.queryByText("First thread")).toBeNull();

    view.rerender(
      <Provider store={store}>
        <UserContextQuestionnaire threadId="thread-a" />
      </Provider>,
    );
    expect(screen.getByLabelText<HTMLTextAreaElement>("First answer").value).toBe(
      "partial",
    );
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    await expect(firstResult).resolves.toEqual({ status: "cancelled" });
    const second = store.get(userContextQuestionnairesAtom)["thread-b"]!;
    cancelUserContextQuestionnaire("thread-b", second.requestId);
    await expect(secondResult).resolves.toEqual({ status: "cancelled" });
  });
});
