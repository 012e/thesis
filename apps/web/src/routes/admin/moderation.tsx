import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Navigate, createFileRoute } from "@tanstack/react-router";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  type PaginationState,
  type Table,
  useReactTable,
} from "@tanstack/react-table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  FlagPriorityType,
  ModerationSourceType,
  ModerationStatusType,
  PostModerationType,
  PostReportType,
} from "@repo/rest-contracts";
import {
  IconCheck,
  IconDotsVertical,
  IconEye,
  IconFlag,
  IconShieldCheck,
  IconX,
} from "@tabler/icons-react";
import { useToast as toast } from "@/hooks/use-toast";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { useSession } from "@/hooks/use-session";
import {
  getModeration,
  listModerations,
  listReports,
  reviewModeration,
} from "@/lib/api/moderation";
import { FlagDialog } from "@/components/admin/flag-dialog";
import { formatDate, PAGE_SIZE } from "@/components/admin/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  Table as UITable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { PostMarkdown } from "@/components/ui/post-markdown";

export const Route = createFileRoute("/admin/moderation")({
  component: AdminModerationPage,
});

const columnHelper = createColumnHelper<PostModerationType>();

const statusOptions: ModerationStatusType[] = [
  "pending",
  "needs_human_review",
  "approved",
  "rejected",
];
const sourceOptions: ModerationSourceType[] = [
  "auto_duplicate",
  "auto_harmful",
  "user_report",
  "admin_flag",
];
const priorityOptions: FlagPriorityType[] = [
  "low",
  "medium",
  "high",
  "critical",
];

const statusBadgeClasses: Record<ModerationStatusType, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  needs_human_review: "bg-orange-100 text-orange-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
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

type ModerationDialogState =
  | { type: "none" }
  | { type: "details"; id: string }
  | { type: "review"; id: string; action: "approved" | "rejected" }
  | { type: "flag"; postId: string };

function humanize(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatConfidence(value: string | null | undefined) {
  if (!value) return "—";
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return value;
  if (numeric >= 0 && numeric <= 1) {
    return `${Math.round(numeric * 100)}%`;
  }
  return numeric.toFixed(2);
}

function getPostPreview(
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

function StatusBadge({ status }: { status: ModerationStatusType }) {
  return (
    <Badge variant="outline" className={statusBadgeClasses[status]}>
      {humanize(status)}
    </Badge>
  );
}

function PriorityBadge({ priority }: { priority: FlagPriorityType }) {
  return (
    <Badge variant="outline" className={priorityBadgeClasses[priority]}>
      {humanize(priority)}
    </Badge>
  );
}

function SourceBadge({ source }: { source: ModerationSourceType }) {
  return (
    <Badge variant="outline" className={sourceBadgeClasses[source]}>
      {humanize(source)}
    </Badge>
  );
}

function ModerationTable({
  table,
  isLoading,
  error,
  total,
  offset,
}: {
  table: Table<PostModerationType>;
  isLoading: boolean;
  error: Error | null;
  total: number;
  offset: number;
}) {
  const colSpan = table.getAllColumns().length;

  if (error) {
    return (
      <div className="rounded-none border border-destructive/30 bg-destructive/5 p-4 text-xs text-destructive">
        Failed to load moderation queue: {error.message}
      </div>
    );
  }

  return (
    <>
      <div className="rounded-none border">
        <UITable>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={header.column.columnDef.meta?.headerClassName}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell
                  colSpan={colSpan}
                  className="py-8 text-center text-muted-foreground"
                >
                  Loading moderation queue...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && table.getRowModel().rows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={colSpan}
                  className="py-8 text-center text-muted-foreground"
                >
                  No moderation records found
                </TableCell>
              </TableRow>
            )}
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={cell.column.columnDef.meta?.className}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </UITable>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {total === 0
            ? null
            : `Showing ${offset + 1}–${Math.min(offset + PAGE_SIZE, total)} of ${total} records`}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage() || isLoading}
          >
            Previous
          </Button>
          <span>
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {Math.max(1, table.getPageCount())}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage() || isLoading}
          >
            Next
          </Button>
        </div>
      </div>
    </>
  );
}

function ReportsTable({
  items,
  isLoading,
  error,
  total,
  pagination,
  onPageChange,
}: {
  items: PostReportType[];
  isLoading: boolean;
  error: Error | null;
  total: number;
  pagination: PaginationState;
  onPageChange: (next: PaginationState) => void;
}) {
  const offset = pagination.pageIndex * pagination.pageSize;
  const pageCount = Math.max(1, Math.ceil(total / pagination.pageSize));

  if (error) {
    return (
      <div className="rounded-none border border-destructive/30 bg-destructive/5 p-4 text-xs text-destructive">
        Failed to load reports: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-none border">
        <UITable>
          <TableHeader>
            <TableRow>
              <TableHead>Reporter</TableHead>
              <TableHead>Reported Post</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Heuristic</TableHead>
              <TableHead>Moderation ID</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-8 text-center text-muted-foreground"
                >
                  Loading reports...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && items.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-8 text-center text-muted-foreground"
                >
                  No reports found
                </TableCell>
              </TableRow>
            )}
            {items.map((report) => (
              <TableRow key={report.id}>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {report.reporter?.name ??
                        report.reporter?.username ??
                        "Unknown"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {report.reporter?.email ?? report.reporterId}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="font-mono text-xs text-muted-foreground">
                    {report.postId}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{humanize(report.reason)}</Badge>
                </TableCell>
                <TableCell className="max-w-xs text-xs text-muted-foreground">
                  <span className="line-clamp-2">
                    {report.description ?? "—"}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={
                      report.passedHeuristic
                        ? "bg-green-100 text-green-800"
                        : "bg-slate-100 text-slate-700"
                    }
                  >
                    {report.passedHeuristic ? "Passed" : "Held"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="font-mono text-xs text-muted-foreground">
                    {report.moderationId ?? "—"}
                  </span>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {formatDate(report.createdAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </UITable>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {total === 0
            ? "No reports"
            : `Showing ${offset + 1}–${Math.min(offset + pagination.pageSize, total)} of ${total} reports`}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              onPageChange({
                ...pagination,
                pageIndex: Math.max(0, pagination.pageIndex - 1),
              })
            }
            disabled={pagination.pageIndex === 0 || isLoading}
          >
            Previous
          </Button>
          <span>
            Page {pagination.pageIndex + 1} of {pageCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              onPageChange({
                ...pagination,
                pageIndex: Math.min(pageCount - 1, pagination.pageIndex + 1),
              })
            }
            disabled={pagination.pageIndex + 1 >= pageCount || isLoading}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="text-sm">{value}</div>
    </div>
  );
}

function ModerationDetailDialog({
  moderation,
  isLoading,
  error,
  open,
  onOpenChange,
  onApprove,
  onReject,
  onFlag,
}: {
  moderation: PostModerationType | undefined;
  isLoading: boolean;
  error: Error | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove: () => void;
  onReject: () => void;
  onFlag: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Moderation details</DialogTitle>
          <DialogDescription>
            Review the full moderation record, supporting context, and current
            decision.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex min-h-48 items-center justify-center">
            <Spinner size="md" />
          </div>
        ) : error ? (
          <div className="rounded-none border border-destructive/30 bg-destructive/5 p-4 text-xs text-destructive">
            Failed to load moderation details: {error.message}
          </div>
        ) : moderation ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <DetailRow
                label="Status"
                value={<StatusBadge status={moderation.status} />}
              />
              <DetailRow
                label="Priority"
                value={<PriorityBadge priority={moderation.priority} />}
              />
              <DetailRow
                label="Source"
                value={<SourceBadge source={moderation.source} />}
              />
              <DetailRow
                label="LLM confidence"
                value={formatConfidence(moderation.llmConfidence)}
              />
              <DetailRow
                label="Created"
                value={formatDate(moderation.createdAt)}
              />
              <DetailRow
                label="Reviewed"
                value={
                  moderation.reviewedAt
                    ? formatDate(moderation.reviewedAt)
                    : "—"
                }
              />
            </div>

            <div className="space-y-2 rounded-none border p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Post content
              </p>
              {moderation.post?.content.text ? (
                <div className="prose prose-sm max-w-none text-sm dark:prose-invert">
                  <PostMarkdown content={moderation.post.content.text} />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {getPostPreview(moderation)}
                </p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <DetailRow
                label="LLM summary"
                value={
                  moderation.llmSummary ?? (
                    <span className="text-muted-foreground">
                      No summary available
                    </span>
                  )
                }
              />
              <DetailRow
                label="Review note"
                value={
                  moderation.reviewNote ?? (
                    <span className="text-muted-foreground">
                      No review note
                    </span>
                  )
                }
              />
              <DetailRow
                label="Similar post ID"
                value={
                  <span className="font-mono text-xs text-muted-foreground">
                    {moderation.similarPostId ?? "—"}
                  </span>
                }
              />
              <DetailRow
                label="Similarity score"
                value={formatConfidence(moderation.similarityScore)}
              />
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No moderation record selected.
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {moderation && (
            <>
              <Button variant="outline" onClick={onFlag}>
                <IconFlag className="size-3.5" />
                Flag post
              </Button>
              <Button variant="outline" onClick={onApprove}>
                <IconCheck className="size-3.5" />
                Approve
              </Button>
              <Button variant="destructive" onClick={onReject}>
                <IconX className="size-3.5" />
                Reject
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReviewDialog({
  moderation,
  action,
  open,
  isPending,
  onOpenChange,
  onSubmit,
}: {
  moderation: PostModerationType | undefined;
  action: "approved" | "rejected";
  open: boolean;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (note?: string) => void;
}) {
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) return;
    setNote("");
  }, [open, moderation?.id, action]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {action === "approved" ? "Approve moderation" : "Reject moderation"}
          </DialogTitle>
          <DialogDescription>
            {action === "approved"
              ? "Mark this moderation record as approved."
              : "Reject this moderation record and keep the content blocked."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {moderation && (
            <div className="rounded-none border bg-muted/40 p-3 text-xs text-muted-foreground">
              <div className="mb-2 flex flex-wrap gap-2">
                <StatusBadge status={moderation.status} />
                <PriorityBadge priority={moderation.priority} />
                <SourceBadge source={moderation.source} />
              </div>
              <p>{getPostPreview(moderation)}</p>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="review-note" className="text-xs font-medium">
              Note (optional)
            </label>
            <Textarea
              id="review-note"
              rows={4}
              maxLength={2000}
              placeholder="Add a note for the moderation audit trail"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            variant={action === "approved" ? "default" : "destructive"}
            onClick={() => onSubmit(note.trim() || undefined)}
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Spinner size="sm" />
                Saving...
              </>
            ) : action === "approved" ? (
              <>
                <IconCheck className="size-3.5" />
                Approve
              </>
            ) : (
              <>
                <IconX className="size-3.5" />
                Reject
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AdminModerationPage() {
  const { isPending: sessionPending } = useSession();
  const isAdmin = useIsAdmin();
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState<{
    status?: ModerationStatusType;
    source?: ModerationSourceType;
    priority?: FlagPriorityType;
  }>({});
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: PAGE_SIZE,
  });
  const [reportsPagination, setReportsPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: PAGE_SIZE,
  });
  const [dialog, setDialog] = useState<ModerationDialogState>({ type: "none" });

  const offset = pagination.pageIndex * PAGE_SIZE;

  const {
    data: moderationData,
    isLoading,
    isFetching,
    error,
  } = useQuery({
    queryKey: [
      "moderation",
      "list",
      filters,
      pagination.pageIndex,
      pagination.pageSize,
    ],
    queryFn: () =>
      listModerations({
        ...filters,
        page: pagination.pageIndex,
        pageSize: pagination.pageSize,
      }),
    enabled: !sessionPending && isAdmin,
  });

  const {
    data: reportsData,
    isLoading: isReportsLoading,
    isFetching: isReportsFetching,
    error: reportsError,
  } = useQuery({
    queryKey: [
      "moderation",
      "reports",
      reportsPagination.pageIndex,
      reportsPagination.pageSize,
    ],
    queryFn: () =>
      listReports({
        page: reportsPagination.pageIndex,
        pageSize: reportsPagination.pageSize,
      }),
    enabled: !sessionPending && isAdmin,
  });

  const selectedModerationId =
    dialog.type === "details" || dialog.type === "review"
      ? dialog.id
      : undefined;
  const selectedModerationFromList = moderationData?.items.find(
    (item) => item.id === selectedModerationId,
  );

  const {
    data: moderationDetail,
    isLoading: isDetailLoading,
    error: detailError,
  } = useQuery({
    queryKey: ["moderation", "detail", selectedModerationId],
    queryFn: () => getModeration(selectedModerationId as string),
    enabled: !sessionPending && isAdmin && !!selectedModerationId,
  });

  const selectedModeration = moderationDetail ?? selectedModerationFromList;

  const reviewMutation = useMutation({
    mutationFn: ({
      id,
      status,
      reviewNote,
    }: {
      id: string;
      status: "approved" | "rejected";
      reviewNote?: string;
    }) => reviewModeration(id, { status, reviewNote }),
    onSuccess: (_, variables) => {
      toast.success(
        variables.status === "approved"
          ? "Moderation approved"
          : "Moderation rejected",
      );
      void queryClient.invalidateQueries({ queryKey: ["moderation"] });
      setDialog({ type: "none" });
    },
    onError: (err: Error) => {
      toast.error("Failed to review moderation", { description: err.message });
    },
  });

  function updateFilter<Key extends keyof typeof filters>(
    key: Key,
    value?: (typeof filters)[Key],
  ) {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
    setPagination((current) => ({ ...current, pageIndex: 0 }));
  }

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: "content",
        header: () => "Post",
        meta: { headerClassName: "w-[320px]" },
        cell: ({ row }) => (
          <div className="max-w-sm space-y-1">
            <p className="line-clamp-2 text-sm font-medium">
              {getPostPreview(row.original)}
            </p>
            <p className="font-mono text-[11px] text-muted-foreground">
              {row.original.postId}
            </p>
          </div>
        ),
      }),
      columnHelper.accessor("source", {
        header: () => "Source",
        cell: ({ getValue }) => <SourceBadge source={getValue()} />,
      }),
      columnHelper.accessor("status", {
        header: () => "Status",
        cell: ({ getValue }) => <StatusBadge status={getValue()} />,
      }),
      columnHelper.accessor("priority", {
        header: () => "Priority",
        cell: ({ getValue }) => <PriorityBadge priority={getValue()} />,
      }),
      columnHelper.accessor("llmConfidence", {
        header: () => "LLM Confidence",
        cell: ({ getValue }) => (
          <span className="text-xs text-muted-foreground">
            {formatConfidence(getValue())}
          </span>
        ),
      }),
      columnHelper.accessor("createdAt", {
        header: () => "Created",
        cell: ({ getValue }) => (
          <span className="text-xs text-muted-foreground">
            {formatDate(getValue())}
          </span>
        ),
      }),
      columnHelper.display({
        id: "actions",
        meta: { headerClassName: "w-[48px]" },
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger
              className="inline-flex size-7 items-center justify-center rounded-none hover:bg-accent transition-colors outline-none"
              aria-label="Moderation actions"
            >
              <IconDotsVertical className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-auto min-w-44">
              <DropdownMenuItem
                onClick={() =>
                  setDialog({ type: "details", id: row.original.id })
                }
              >
                <IconEye className="size-3.5" />
                View details
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  setDialog({
                    type: "review",
                    id: row.original.id,
                    action: "approved",
                  })
                }
              >
                <IconCheck className="size-3.5" />
                Approve
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  setDialog({
                    type: "review",
                    id: row.original.id,
                    action: "rejected",
                  })
                }
                className="text-destructive focus:text-destructive"
              >
                <IconX className="size-3.5" />
                Reject
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() =>
                  setDialog({ type: "flag", postId: row.original.postId })
                }
              >
                <IconFlag className="size-3.5" />
                Flag post
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      }),
    ],
    [],
  );

  const table = useReactTable({
    data: moderationData?.items ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    rowCount: moderationData?.total ?? 0,
    getRowId: (row) => row.id,
    state: { pagination },
    onPaginationChange: setPagination,
  });

  if (sessionPending) {
    return (
      <div className="flex min-h-100 items-center justify-center">
        <Spinner size="md" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" />;
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center gap-3">
        <IconShieldCheck className="size-6 text-muted-foreground" />
        <div>
          <h1 className="text-lg font-semibold">Moderation</h1>
          <p className="text-xs text-muted-foreground">
            Review flagged content, LLM decisions, and incoming user reports.
          </p>
        </div>
      </div>

      <Tabs defaultValue="queue" className="gap-4">
        <TabsList
          variant="line"
          className="flex h-auto max-w-full flex-wrap justify-start gap-1"
        >
          <TabsTrigger value="queue" className="px-2.5 py-1.5">
            Moderation Queue
          </TabsTrigger>
          <TabsTrigger value="reports" className="px-2.5 py-1.5">
            Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Select
              value={filters.status ?? "all"}
              onValueChange={(value) =>
                updateFilter(
                  "status",
                  value === "all" ? undefined : (value as ModerationStatusType),
                )
              }
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {statusOptions.map((status) => (
                  <SelectItem key={status} value={status}>
                    {humanize(status)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.source ?? "all"}
              onValueChange={(value) =>
                updateFilter(
                  "source",
                  value === "all" ? undefined : (value as ModerationSourceType),
                )
              }
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="All sources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sources</SelectItem>
                {sourceOptions.map((source) => (
                  <SelectItem key={source} value={source}>
                    {humanize(source)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.priority ?? "all"}
              onValueChange={(value) =>
                updateFilter(
                  "priority",
                  value === "all" ? undefined : (value as FlagPriorityType),
                )
              }
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="All priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All priorities</SelectItem>
                {priorityOptions.map((priority) => (
                  <SelectItem key={priority} value={priority}>
                    {humanize(priority)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={() => {
                setFilters({});
                setPagination((current) => ({ ...current, pageIndex: 0 }));
              }}
            >
              Clear filters
            </Button>
          </div>

          <ModerationTable
            table={table}
            isLoading={isLoading || isFetching}
            error={error as Error | null}
            total={moderationData?.total ?? 0}
            offset={offset}
          />
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <ReportsTable
            items={reportsData?.items ?? []}
            isLoading={isReportsLoading || isReportsFetching}
            error={reportsError as Error | null}
            total={reportsData?.total ?? 0}
            pagination={reportsPagination}
            onPageChange={setReportsPagination}
          />
        </TabsContent>
      </Tabs>

      <ModerationDetailDialog
        moderation={selectedModeration}
        isLoading={isDetailLoading}
        error={detailError as Error | null}
        open={dialog.type === "details"}
        onOpenChange={(open) => !open && setDialog({ type: "none" })}
        onApprove={() =>
          selectedModeration &&
          setDialog({
            type: "review",
            id: selectedModeration.id,
            action: "approved",
          })
        }
        onReject={() =>
          selectedModeration &&
          setDialog({
            type: "review",
            id: selectedModeration.id,
            action: "rejected",
          })
        }
        onFlag={() =>
          selectedModeration &&
          setDialog({ type: "flag", postId: selectedModeration.postId })
        }
      />

      <ReviewDialog
        moderation={selectedModeration}
        action={dialog.type === "review" ? dialog.action : "approved"}
        open={dialog.type === "review"}
        isPending={reviewMutation.isPending}
        onOpenChange={(open) => !open && setDialog({ type: "none" })}
        onSubmit={(reviewNote) => {
          if (dialog.type !== "review") return;
          reviewMutation.mutate({
            id: dialog.id,
            status: dialog.action,
            reviewNote,
          });
        }}
      />

      {dialog.type === "flag" && (
        <FlagDialog
          postId={dialog.postId}
          open
          onOpenChange={(open) => !open && setDialog({ type: "none" })}
          onSuccess={() => {
            setDialog({ type: "none" });
          }}
        />
      )}
    </div>
  );
}
