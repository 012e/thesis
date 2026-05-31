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
import type { Language } from "./-types";

const PlaygroundLanguageSchema = z.enum(["javascript", "typescript"]);
const VirtualFilePathSchema = z.enum([
  "/playground/index.js",
  "/playground/index.ts",
]);

const VIRTUAL_FILE_BY_LANGUAGE: Record<Language, z.infer<typeof VirtualFilePathSchema>> = {
  javascript: "/playground/index.js",
  typescript: "/playground/index.ts",
};

const LANGUAGE_BY_VIRTUAL_FILE: Record<
  z.infer<typeof VirtualFilePathSchema>,
  Language
> = {
  "/playground/index.js": "javascript",
  "/playground/index.ts": "typescript",
};

const ReadFileInput = z.object({
  path: VirtualFilePathSchema.optional(),
  includeOutput: z.boolean().optional(),
});

const EditFileInput = z.object({
  path: VirtualFilePathSchema,
  old_string: z.string().min(1).max(102400),
  new_string: z.string().max(102400),
  expected_version: z.number().int().nonnegative(),
});

const WriteFileInput = z.object({
  path: VirtualFilePathSchema,
  content: z.string().max(102400),
  expected_version: z.number().int().nonnegative(),
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
  const stateRef = useRef({
    code,
    language,
    result,
    version: 0,
  });

  if (
    stateRef.current.code !== code ||
    stateRef.current.language !== language
  ) {
    stateRef.current = {
      code,
      language,
      result,
      version: stateRef.current.version + 1,
    };
  } else {
    stateRef.current = {
      ...stateRef.current,
      result,
    };
  }

  useAssistantInstructions(
    `The user is on the code playground. The editor is exposed to you as one virtual file, currently ${VIRTUAL_FILE_BY_LANGUAGE[language]}. Use read_file before editing. Prefer edit_file with an exact old_string/new_string replacement. Use write_file only for intentional full-file rewrites. Both edit_file and write_file require the expected_version returned by read_file; if a write is stale, read_file again and reapply the change against the latest content. Use run_playground_code to execute the current file. Do not say code was changed or run unless the corresponding tool call returns success. Current language: ${language}. Current code length: ${code.length} characters.`,
  );

  const readFileTool = useMemo(
    () => ({
      toolName: "read_file",
      description:
        "Read the current playground editor as a virtual file. Returns content and version; use that version for edit_file or write_file.",
      parameters: ReadFileInput,
      execute: ({ path, includeOutput }: z.infer<typeof ReadFileInput>) => {
        const current = stateRef.current;
        const currentPath = VIRTUAL_FILE_BY_LANGUAGE[current.language];

        if (path && path !== currentPath) {
          return {
            status: "not_found",
            path,
            currentPath,
            message: "Only the current playground file can be read.",
          };
        }

        return {
          status: "success",
          path: currentPath,
          language: current.language,
          version: current.version,
          content: current.code,
          output: includeOutput ? current.result : undefined,
        };
      },
    }),
    [],
  );

  const editFileTool = useMemo(
    () => ({
      toolName: "edit_file",
      description:
        "Apply an exact replacement to the current playground virtual file. Requires the expected_version from read_file and rejects stale, missing, or ambiguous replacements.",
      parameters: EditFileInput,
      execute: ({
        path,
        old_string: oldString,
        new_string: newString,
        expected_version: expectedVersion,
      }: z.infer<typeof EditFileInput>) => {
        const current = stateRef.current;
        const currentPath = VIRTUAL_FILE_BY_LANGUAGE[current.language];

        if (path !== currentPath) {
          return {
            status: "not_found",
            path,
            currentPath,
            currentVersion: current.version,
            message: "Only the current playground file can be edited.",
          };
        }

        if (expectedVersion !== current.version) {
          return {
            status: "stale",
            path,
            currentVersion: current.version,
            expectedVersion,
            message: "The playground changed after your read. Read the file again before editing.",
          };
        }

        const firstIndex = current.code.indexOf(oldString);
        if (firstIndex === -1) {
          return {
            status: "not_found",
            path,
            currentVersion: current.version,
            message: "old_string was not found in the current file.",
          };
        }

        if (current.code.indexOf(oldString, firstIndex + oldString.length) !== -1) {
          return {
            status: "ambiguous",
            path,
            currentVersion: current.version,
            message: "old_string appears more than once. Read the file and use a more specific replacement.",
          };
        }

        const nextCode =
          current.code.slice(0, firstIndex) +
          newString +
          current.code.slice(firstIndex + oldString.length);
        const nextVersion = current.version + 1;
        stateRef.current = {
          ...current,
          code: nextCode,
          version: nextVersion,
        };
        setCode(nextCode);

        return {
          status: "success",
          path,
          language: current.language,
          previousVersion: current.version,
          nextVersion,
          contentLength: nextCode.length,
        };
      },
    }),
    [setCode],
  );

  const writeFileTool = useMemo(
    () => ({
      toolName: "write_file",
      description:
        "Replace the whole playground virtual file after read_file. Requires expected_version so user edits are not overwritten.",
      parameters: WriteFileInput,
      execute: ({
        path,
        content,
        expected_version: expectedVersion,
        language: requestedLanguage,
      }: z.infer<typeof WriteFileInput>) => {
        const current = stateRef.current;
        const pathLanguage = LANGUAGE_BY_VIRTUAL_FILE[path];
        const nextLanguage = requestedLanguage ?? pathLanguage;

        if (VIRTUAL_FILE_BY_LANGUAGE[nextLanguage] !== path) {
          return {
            status: "invalid_request",
            path,
            language: nextLanguage,
            currentVersion: current.version,
            message: "The requested language must match the virtual file path extension.",
          };
        }

        if (expectedVersion !== current.version) {
          return {
            status: "stale",
            path,
            currentVersion: current.version,
            expectedVersion,
            message: "The playground changed after your read. Read the file again before writing.",
          };
        }

        const nextVersion = current.version + 1;
        stateRef.current = {
          ...current,
          code: content,
          language: nextLanguage,
          version: nextVersion,
        };
        setCode(content);
        if (nextLanguage !== current.language) setLanguage(nextLanguage);

        return {
          status: "success",
          path,
          language: nextLanguage,
          previousVersion: current.version,
          nextVersion,
          contentLength: content.length,
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
        const current = stateRef.current;
        stateRef.current = {
          ...current,
          language: nextLanguage,
          version:
            nextLanguage === current.language
              ? current.version
              : current.version + 1,
        };
        setLanguage(nextLanguage);
        return {
          status: "updated",
          language: nextLanguage,
          version: stateRef.current.version,
        };
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

  useAssistantTool(readFileTool);
  useAssistantTool(editFileTool);
  useAssistantTool(writeFileTool);
  useAssistantTool(setLanguageTool);
  useAssistantTool(runCodeTool);

  return null;
}
