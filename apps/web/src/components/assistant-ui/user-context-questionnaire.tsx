import { useMemo } from "react";
import {
  useAssistantInstructions,
  useAssistantTool,
} from "@assistant-ui/react";
import {
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconCircleCheck,
  IconListDetails,
  IconX,
} from "@tabler/icons-react";
import { useAtomValue, useSetAtom } from "jotai";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useChatState } from "@/hooks/use-chat-state";
import {
  cancelUserContextQuestionnaire,
  completeUserContextQuestionnaire,
  isQuestionAnswered,
  RequestUserContextToolInputSchema,
  requestUserContext,
  type UserContextAnswer,
  type UserContextQuestion,
  type RequestUserContextToolInput,
} from "@/lib/assistant/user-context-questionnaire";
import {
  userContextQuestionnairesAtom,
  type UserContextQuestionnaireState,
} from "@/lib/atoms/user-context-questionnaires";
import { cn } from "@/lib/utils";

export function UserContextAssistantTool() {
  const { threadId } = useChatState();

  useAssistantInstructions(
    "Use ask_questions only when progress genuinely requires user-provided preferences, private intent, unavailable information, or a focused clarification that cannot be obtained with another available tool or agent. Group related required questions into one request. Do not use it for information you can research or infer safely.",
  );

  const requestUserContextTool = useMemo(
    () => ({
      toolName: "ask_questions",
      description:
        "Request required user-only context with a tabbed questionnaire. Every question needs a unique id and one of these types: yes_no, single_choice, multiple_choice, or text. Include at least two options for choice questions and omit options for yes_no or text questions.",
      parameters: RequestUserContextToolInputSchema,
      execute: (
        input: RequestUserContextToolInput,
        context: { abortSignal?: AbortSignal; toolCallId: string },
      ) =>
        requestUserContext(
          threadId,
          input,
          context.abortSignal,
          context.toolCallId,
        ),
    }),
    [threadId],
  );

  useAssistantTool(requestUserContextTool);

  return null;
}

export function UserContextQuestionnaire({ threadId }: { threadId: string }) {
  const questionnaire = useAtomValue(userContextQuestionnairesAtom)[threadId];

  if (!questionnaire) return null;

  return (
    <QuestionnaireWizard
      key={questionnaire.requestId}
      threadId={threadId}
      questionnaire={questionnaire}
    />
  );
}

export function UserContextQuestionnaireByRequestId({
  requestId,
}: {
  requestId: string;
}) {
  const questionnaires = useAtomValue(userContextQuestionnairesAtom);
  const entry = Object.entries(questionnaires).find(
    ([, questionnaire]) => questionnaire?.requestId === requestId,
  );

  if (!entry?.[1]) return null;

  return (
    <QuestionnaireWizard
      key={entry[1].requestId}
      threadId={entry[0]}
      questionnaire={entry[1]}
    />
  );
}

export function QuestionnaireWizard({
  threadId,
  questionnaire,
}: {
  threadId: string;
  questionnaire: UserContextQuestionnaireState;
}) {
  const setQuestionnaires = useSetAtom(userContextQuestionnairesAtom);
  const question =
    questionnaire.questions[questionnaire.activeQuestionIndex]!;
  const answeredCount = questionnaire.questions.filter((candidate) =>
    isQuestionAnswered(candidate, questionnaire.answers[candidate.id]),
  ).length;
  const allAnswered = answeredCount === questionnaire.questions.length;
  const currentAnswered = isQuestionAnswered(
    question,
    questionnaire.answers[question.id],
  );
  const isLastQuestion =
    questionnaire.activeQuestionIndex === questionnaire.questions.length - 1;

  const updateQuestionnaire = (
    update: (current: UserContextQuestionnaireState) => UserContextQuestionnaireState,
  ) => {
    setQuestionnaires((questionnaires) => {
      const current = questionnaires[threadId];
      if (!current || current.requestId !== questionnaire.requestId) {
        return questionnaires;
      }
      return { ...questionnaires, [threadId]: update(current) };
    });
  };

  const setAnswer = (answer: UserContextAnswer) => {
    updateQuestionnaire((current) => ({
      ...current,
      answers: { ...current.answers, [question.id]: answer },
    }));
  };

  const setActiveQuestion = (activeQuestionIndex: number) => {
    updateQuestionnaire((current) => ({
      ...current,
      activeQuestionIndex,
    }));
  };

  return (
    <section
      aria-label={questionnaire.title}
      className="w-full max-w-2xl border border-border bg-background shadow-sm"
    >
      <div className="flex items-start justify-between gap-4 border-b px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <IconListDetails className="size-4 shrink-0 text-primary" />
            <h2 className="truncate text-sm font-semibold">
              {questionnaire.title}
            </h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {answeredCount} of {questionnaire.questions.length} answered
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() =>
            cancelUserContextQuestionnaire(
              threadId,
              questionnaire.requestId,
            )
          }
        >
          <IconX className="size-4" />
          Cancel
        </Button>
      </div>

      <div
        role="tablist"
        aria-label="Question progress"
        className="flex max-w-full gap-1 overflow-x-auto border-b px-3 py-2"
      >
        {questionnaire.questions.map((candidate, index) => {
          const isActive = index === questionnaire.activeQuestionIndex;
          const isAnswered = isQuestionAnswered(
            candidate,
            questionnaire.answers[candidate.id],
          );

          return (
            <button
              key={candidate.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`question-panel-${questionnaire.requestId}`}
              onClick={() => setActiveQuestion(index)}
              className={cn(
                "flex min-w-9 shrink-0 items-center justify-center gap-1 border px-2 py-1.5 text-xs font-medium transition-colors",
                isActive
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {isAnswered ? (
                <IconCircleCheck className="size-3.5" />
              ) : null}
              <span>{index + 1}</span>
            </button>
          );
        })}
      </div>

      <div
        id={`question-panel-${questionnaire.requestId}`}
        role="tabpanel"
        className="space-y-4 px-4 py-4"
      >
        <div>
          <p className="text-sm font-medium">{question.prompt}</p>
          {question.description ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {question.description}
            </p>
          ) : null}
        </div>

        <QuestionControl
          question={question}
          answer={questionnaire.answers[question.id]}
          onChange={setAnswer}
        />
      </div>

      <div className="flex items-center justify-between gap-3 border-t px-4 py-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={questionnaire.activeQuestionIndex === 0}
          onClick={() =>
            setActiveQuestion(questionnaire.activeQuestionIndex - 1)
          }
        >
          <IconChevronLeft className="size-4" />
          Back
        </Button>

        {isLastQuestion ? (
          <Button
            type="button"
            size="sm"
            disabled={!allAnswered}
            onClick={() =>
              completeUserContextQuestionnaire(
                threadId,
                questionnaire.requestId,
                questionnaire.answers,
              )
            }
          >
            <IconCheck className="size-4" />
            Submit
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            disabled={!currentAnswered}
            onClick={() =>
              setActiveQuestion(questionnaire.activeQuestionIndex + 1)
            }
          >
            Next
            <IconChevronRight className="size-4" />
          </Button>
        )}
      </div>
    </section>
  );
}

function QuestionControl({
  question,
  answer,
  onChange,
}: {
  question: UserContextQuestion;
  answer: UserContextAnswer | undefined;
  onChange: (answer: UserContextAnswer) => void;
}) {
  switch (question.type) {
    case "yes_no":
      return (
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: true, label: "Yes" },
            { value: false, label: "No" },
          ].map((option) => (
            <ChoiceButton
              key={option.label}
              selected={answer === option.value}
              onClick={() => onChange(option.value)}
            >
              {option.label}
            </ChoiceButton>
          ))}
        </div>
      );
    case "single_choice":
      return (
        <div className="grid gap-2">
          {question.options.map((option) => (
            <ChoiceButton
              key={option.value}
              selected={answer === option.value}
              onClick={() => onChange(option.value)}
            >
              {option.label}
            </ChoiceButton>
          ))}
        </div>
      );
    case "multiple_choice": {
      const selectedValues = Array.isArray(answer) ? answer : [];
      return (
        <div className="grid gap-2">
          {question.options.map((option) => {
            const selected = selectedValues.includes(option.value);
            return (
              <ChoiceButton
                key={option.value}
                selected={selected}
                onClick={() =>
                  onChange(
                    selected
                      ? selectedValues.filter((value) => value !== option.value)
                      : [...selectedValues, option.value],
                  )
                }
              >
                {option.label}
              </ChoiceButton>
            );
          })}
        </div>
      );
    }
    case "text":
      return (
        <Textarea
          aria-label={question.prompt}
          value={typeof answer === "string" ? answer : ""}
          placeholder={question.placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      );
  }
}

function ChoiceButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "flex min-h-10 items-center gap-2 border px-3 py-2 text-left text-sm transition-colors",
        selected
          ? "border-primary bg-primary/10 text-foreground"
          : "border-border hover:bg-accent",
      )}
    >
      <span
        className={cn(
          "flex size-4 shrink-0 items-center justify-center border",
          selected
            ? "border-primary bg-primary text-primary-foreground"
            : "border-muted-foreground/50",
        )}
      >
        {selected ? <IconCheck className="size-3" /> : null}
      </span>
      {children}
    </button>
  );
}
