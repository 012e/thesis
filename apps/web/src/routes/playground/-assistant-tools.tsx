import { useMemo, useRef } from "react";
import {
  useAssistantInstructions,
  useAssistantTool,
} from "@assistant-ui/react";
import { z } from "zod";
import { useAtomValue, useSetAtom } from "jotai";
import { executeCode } from "@/lib/api/playground";
import type { ExecutionResult } from "@repo/rest-contracts";
import { isOutputMinimizedAtom } from "./-types";
import {
  codeAtom,
  languageAtom,
  resultAtom,
  setCodeAtom,
  setLanguageAtom,
  setResultAtom,
} from "./-playground-state";

const PlaygroundLanguageSchema = z.enum(["javascript", "typescript"]);

const GetPlaygroundCodeInput = z.object({
  includeOutput: z.boolean().optional(),
});

const SetPlaygroundCodeInput = z.object({
  code: z.string().max(102400),
  language: PlaygroundLanguageSchema.optional(),
});

const SetPlaygroundLanguageInput = z.object({
  language: PlaygroundLanguageSchema,
});

const RunPlaygroundCodeInput = z.object({
  timeout: z.number().int().positive().max(60000).optional(),
});

export function PlaygroundAssistantTools() {
  const code = useAtomValue(codeAtom);
  const language = useAtomValue(languageAtom);
  const result = useAtomValue(resultAtom);
  const setCode = useSetAtom(setCodeAtom);
  const setLanguage = useSetAtom(setLanguageAtom);
  const setResult = useSetAtom(setResultAtom);
  const setIsOutputMinimized = useSetAtom(isOutputMinimizedAtom);
  const stateRef = useRef({ code, language, result });
  stateRef.current = { code, language, result };

  useAssistantInstructions(
    `The user is on the code playground. You have page-scoped tools that can read the current editor, replace the editor contents, change the playground language, and run the code. Use those tools for playground code edits and execution. Do not say code was changed or run unless the corresponding tool call succeeds. Current language: ${language}. Current code length: ${code.length} characters.`,
  );

  const getCodeTool = useMemo(
    () => ({
      toolName: "get_playground_code",
      description:
        "Read the current playground editor contents, selected language, and optionally the latest execution output.",
      parameters: GetPlaygroundCodeInput,
      execute: ({ includeOutput }: z.infer<typeof GetPlaygroundCodeInput>) => {
        const current = stateRef.current;
        return {
          language: current.language,
          code: current.code,
          output: includeOutput ? current.result : undefined,
        };
      },
    }),
    [],
  );

  const setCodeTool = useMemo(
    () => ({
      toolName: "set_playground_code",
      description:
        "Replace the current playground editor contents. Optionally also switch the editor language.",
      parameters: SetPlaygroundCodeInput,
      execute: ({
        code: nextCode,
        language: nextLanguage,
      }: z.infer<typeof SetPlaygroundCodeInput>) => {
        setCode(nextCode);
        if (nextLanguage) setLanguage(nextLanguage);

        return {
          status: "updated",
          language: nextLanguage ?? stateRef.current.language,
          codeLength: nextCode.length,
        };
      },
    }),
    [setCode, setLanguage],
  );

  const setLanguageTool = useMemo(
    () => ({
      toolName: "set_playground_language",
      description:
        "Switch the playground language without changing the current editor contents.",
      parameters: SetPlaygroundLanguageInput,
      execute: ({
        language: nextLanguage,
      }: z.infer<typeof SetPlaygroundLanguageInput>) => {
        setLanguage(nextLanguage);
        return { status: "updated", language: nextLanguage };
      },
    }),
    [setLanguage],
  );

  const runCodeTool = useMemo(
    () => ({
      toolName: "run_playground_code",
      description:
        "Run the current playground editor code and update the visible output panel.",
      parameters: RunPlaygroundCodeInput,
      execute: async ({ timeout }: z.infer<typeof RunPlaygroundCodeInput>) => {
        const current = stateRef.current;
        let executionResult: ExecutionResult;

        try {
          executionResult = await executeCode({
            code: current.code,
            language: current.language,
            timeout,
          });
        } catch (error) {
          executionResult = {
            stdout: "",
            stderr: error instanceof Error ? error.message : String(error),
            exitCode: -1,
            executionTime: 0,
          };
        }

        setIsOutputMinimized(false);
        setResult(executionResult);
        return executionResult;
      },
    }),
    [setIsOutputMinimized, setResult],
  );

  useAssistantTool(getCodeTool);
  useAssistantTool(setCodeTool);
  useAssistantTool(setLanguageTool);
  useAssistantTool(runCodeTool);

  return null;
}
