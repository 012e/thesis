import type { ReactNode } from "react";
import type {
  FlagPriorityType,
  ModerationSourceType,
  ModerationStatusType,
  PostModerationType,
} from "@repo/rest-contracts";

import { formatDate } from "@/components/admin/types";
import { Badge } from "@/components/ui/badge";

export const statusOptions: ModerationStatusType[] = [
  "pending",
  "needs_human_review",
  "approved",
  "rejected",
];

export const sourceOptions: ModerationSourceType[] = [
  "auto_duplicate",
  "auto_harmful",
  "user_report",
  "admin_flag",
];

export const priorityOptions: FlagPriorityType[] = [
  "low",
  "medium",
  "high",
  "critical",
];

const statusBadgeClasses: Record<ModerationStatusType, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  needs_human_review: "bg-orange-100 text-orange-800",
  approved: "bg-input",
  rejected: "bg-red-100 text-red-800",
};

const statusLabels: Record<ModerationStatusType, string> = {
  pending: "Pending",
  needs_human_review: "Needs human review",
  approved: "False positive",
  rejected: "Rejected post",
};

const priorityBadgeClasses: Record<FlagPriorityType, string> = {
  low: "bg-blue-100 text-blue-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800",
};

const sourceBadgeClasses: Record<ModerationSourceType, string> = {
  auto_duplicate: "bg-violet-100 text-violet-800",
  auto_harmful: "bg-rose-100 text-rose-800",
  user_report: "bg-sky-100 text-sky-800",
  admin_flag: "bg-slate-200 text-slate-800",
};

export type ModerationDialogState =
  | { type: "none" }
  | { type: "details"; id: string; moderation?: PostModerationType }
  | {
      type: "review";
      id: string;
      action: "approved" | "rejected";
      moderation?: PostModerationType;
    }
  | { type: "flag"; postId: string };

export function humanize(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function formatModerationStatus(status: ModerationStatusType) {
  return statusLabels[status];
}

export function formatConfidence(value: string | null | undefined) {
  if (!value) return "—";
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return value;
  return numeric.toFixed(2);
}

export function getPostPreview(
  moderation: Pick<PostModerationType, "post" | "postId">,
) {
  const text = moderation.post?.content.text?.trim();
  if (text) {
    return text.length > 120 ? `${text.slice(0, 120)}…` : text;
  }

  if (moderation.post?.content.poll?.question) {
    return `Poll: ${moderation.post.content.poll.question}`;
  }

  if (moderation.post?.content.images?.length) {
    return `Image post (${moderation.post.content.images.length} attachment${moderation.post.content.images.length > 1 ? "s" : ""})`;
  }

  return `Post ${moderation.postId.slice(0, 8)}…`;
}

export function StatusBadge({ status }: { status: ModerationStatusType }) {
  return (
    <Badge variant="outline" className={statusBadgeClasses[status]}>
      {formatModerationStatus(status)}
    </Badge>
  );
}

export function PriorityBadge({ priority }: { priority: FlagPriorityType }) {
  return (
    <Badge variant="outline" className={priorityBadgeClasses[priority]}>
      {humanize(priority)}
    </Badge>
  );
}

export function SourceBadge({ source }: { source: ModerationSourceType }) {
  return (
    <Badge variant="outline" className={sourceBadgeClasses[source]}>
      {humanize(source)}
    </Badge>
  );
}

export function DetailRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="text-sm">{value}</div>
    </div>
  );
}

export { formatDate };
