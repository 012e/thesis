import { useCallback, useEffect } from "react";
import type { ReactNode } from "react";
import { useMutation } from "@tanstack/react-query";
import { atom, useAtomValue, useSetAtom } from "jotai";
import { selectAtom } from "jotai/utils";
import { executeCode } from "@/lib/api/playground";
import type { ExecutionResult } from "@repo/rest-contracts";
import { DEFAULT_CODE } from "./-language-config";
import { isOutputMinimizedAtom } from "./-types";
import type { Language } from "./-types";

type PlaygroundState = {
  codeByLanguage: Record<Language, string>;
  language: Language;
  result: ExecutionResult | null;
  isChatCollapsed: boolean;
};

export type PlaygroundEditFlash = {
  id: number;
  startOffset: number;
  endOffset: number;
};

const initialPlaygroundState: PlaygroundState = {
  codeByLanguage: { ...DEFAULT_CODE },
  language: "javascript",
  result: null,
  isChatCollapsed: false,
};

const playgroundStateAtom = atom<PlaygroundState>(initialPlaygroundState);
const beforeChatCollapseAtom = atom<{ callback: () => void } | null>(null);

export const editFlashAtom = atom<PlaygroundEditFlash | null>(null);

export const codeAtom = selectAtom(
  playgroundStateAtom,
  (state) => state.codeByLanguage[state.language],
);
export const codeByLanguageAtom = selectAtom(
  playgroundStateAtom,
  (state) => state.codeByLanguage,
);
export const languageAtom = selectAtom(
  playgroundStateAtom,
  (state) => state.language,
);
export const resultAtom = selectAtom(
  playgroundStateAtom,
  (state) => state.result,
);
export const isChatCollapsedAtom = selectAtom(
  playgroundStateAtom,
  (state) => state.isChatCollapsed,
);

export const resetPlaygroundStateAtom = atom(null, (_get, set) => {
  set(playgroundStateAtom, initialPlaygroundState);
});

export const setCodeAtom = atom(null, (_get, set, code: string) => {
  set(playgroundStateAtom, (current) => ({
    ...current,
    codeByLanguage: {
      ...current.codeByLanguage,
      [current.language]: code,
    },
  }));
});

export const setCodeForLanguageAtom = atom(
  null,
  (
    _get,
    set,
    { language, code }: { language: Language; code: string },
  ) => {
    set(playgroundStateAtom, (current) => ({
      ...current,
      codeByLanguage: {
        ...current.codeByLanguage,
        [language]: code,
      },
    }));
  },
);

export const setLanguageAtom = atom(null, (_get, set, language: Language) => {
  set(playgroundStateAtom, (current) => ({ ...current, language }));
});

export const setResultAtom = atom(
  null,
  (_get, set, result: ExecutionResult | null) => {
    set(playgroundStateAtom, (current) => ({ ...current, result }));
  },
);

export const changeLanguageAtom = atom(
  null,
  (_get, set, language: Language) => {
    set(playgroundStateAtom, (current) => ({
      ...current,
      language,
    }));
  },
);

export const setBeforeChatCollapseAtom = atom(
  null,
  (_get, set, callback: (() => void) | null) => {
    set(beforeChatCollapseAtom, callback ? { callback } : null);
  },
);

export const toggleChatCollapsedAtom = atom(null, (get, set) => {
  const current = get(playgroundStateAtom);

  if (!current.isChatCollapsed) {
    get(beforeChatCollapseAtom)?.callback();
  }

  set(playgroundStateAtom, {
    ...current,
    isChatCollapsed: !current.isChatCollapsed,
  });
});

export const toggleOutputMinimizedAtom = atom(null, (get, set) => {
  set(isOutputMinimizedAtom, !get(isOutputMinimizedAtom));
});

export function PlaygroundStateProvider({ children }: { children: ReactNode }) {
  const resetPlaygroundState = useSetAtom(resetPlaygroundStateAtom);

  useEffect(() => {
    resetPlaygroundState();
  }, [resetPlaygroundState]);

  return children;
}

export function useRunPlaygroundCode() {
  const code = useAtomValue(codeAtom);
  const language = useAtomValue(languageAtom);
  const setResult = useSetAtom(setResultAtom);

  const { mutate: runCode, isPending } = useMutation({
    mutationFn: executeCode,
    onSuccess: (data) => {
      setResult(data);
    },
    onError: (err: Error) => {
      setResult({
        stdout: "",
        stderr: err.message,
        exitCode: -1,
        executionTime: 0,
      });
    },
  });

  const run = useCallback(() => {
    if (!code.trim()) return;
    runCode({ code, language });
  }, [code, language, runCode]);

  return { isPending, run };
}
