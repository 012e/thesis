import { atom } from "jotai";

import type {
  UserContextAnswer,
  UserContextQuestion,
} from "@/lib/assistant/user-context-questionnaire";

export type UserContextQuestionnaireState = {
  requestId: string;
  title: string;
  questions: UserContextQuestion[];
  activeQuestionIndex: number;
  answers: Record<string, UserContextAnswer>;
};

export const userContextQuestionnairesAtom = atom<
  Record<string, UserContextQuestionnaireState | undefined>
>({});
