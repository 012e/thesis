import { atom } from "jotai";
import { atomFamily } from "jotai-family";
import { selectAtom } from "jotai/utils";

export type PlanItemStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "skipped";

export type PlanItem = {
  id: string;
  label: string;
  description?: string;
  status: PlanItemStatus;
  notes?: string;
};

export type PlanApprovalStatus = "pending_approval" | "approved" | "completed";

export type PlanState = {
  title: string;
  items: PlanItem[];
  approvalStatus: PlanApprovalStatus;
};

/**
 * Map of threadId → PlanState (or null when no plan exists for that thread).
 * Written by the ChatWorkspace replay loop; read by PlanProgressBar.
 */
export const planStatesAtom = atom<Record<string, PlanState | null>>({});

/**
 * Per-thread selector for the current plan state.
 * Subscribers only re-render when their specific thread's plan changes.
 */
export const threadPlanAtomFamily = atomFamily((threadId: string) =>
  selectAtom(planStatesAtom, (states) => states[threadId] ?? null),
);
