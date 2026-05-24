import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  type PaginationState,
  type Table,
  useReactTable,
} from "@tanstack/react-table";
import type {
  FlagPriorityType,
  ModerationSourceType,
  ModerationStatusType,
  PostModerationType,
} from "@repo/rest-contracts";
import {
  IconCheck,
  IconDotsVertical,
  IconEye,
  IconFlag,
  IconRefresh,
  IconX,
} from "@tabler/icons-react";

import { PAGE_SIZE } from "@/components/admin/types";
import { Button } from "@/components/ui/button";
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
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table as UITable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listModerations } from "@/lib/api/moderation";

import {
  PriorityBadge,
  SourceBadge,
  StatusBadge,
  formatConfidence,
  formatDate,
  formatModerationStatus,
  getPostPreview,
  humanize,
  priorityOptions,
  sourceOptions,
  statusOptions,
  type ModerationDialogState,
} from "./-shared";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

const columnHelper = createColumnHelper<PostModerationType>();

export default function ModerationQueueTab({
  enabled,
  setDialog,
}: {
  enabled: boolean;
  setDialog: (dialog: ModerationDialogState) => void;
}) {
  const [filters, setFilters] = useState<{
    status?: ModerationStatusType;
    source?: ModerationSourceType;
    priority?: FlagPriorityType;
  }>({});
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: PAGE_SIZE,
  });

  const offset = pagination.pageIndex * PAGE_SIZE;
  const { data, isLoading, isFetching, error, refetch } = useQuery({
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
    enabled,
  });

  function updateFilter<Key extends keyof typeof filters>(
    key: Key,
    value?: (typeof filters)[Key],
  ) {
    setFilters((current) => ({ ...current, [key]: value }));
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
            {formatConfidence(getValue())}%
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
                  setDialog({
                    type: "details",
                    id: row.original.id,
                    moderation: row.original,
                  })
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
                    moderation: row.original,
                  })
                }
              >
                <IconCheck className="size-3.5" />
                False positive
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  setDialog({
                    type: "review",
                    id: row.original.id,
                    action: "rejected",
                    moderation: row.original,
                  })
                }
                className="text-destructive focus:text-destructive"
              >
                <IconX className="size-3.5" />
                Reject post
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
    [setDialog],
  );

  const table = useReactTable({
    data: data?.items ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    rowCount: data?.total ?? 0,
    getRowId: (row) => row.id,
    state: { pagination },
    onPaginationChange: setPagination,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          onClick={() => void refetch()}
          disabled={isLoading || isFetching}
        >
          <IconRefresh className={cn("size-4", isFetching && "animate-spin")} />
        </Button>
        <Select
          value={filters.status ?? "all"}
          onValueChange={(value) =>
            updateFilter(
              "status",
              value === "all" ? undefined : (value as ModerationStatusType),
            )
          }
        >
          <SelectTrigger className="w-55">
            <SelectValue placeholder="All statuses">
              {filters.status
                ? formatModerationStatus(filters.status)
                : "All statuses"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">All statuses</SelectItem>
              {statusOptions.map((status) => (
                <SelectItem key={status} value={status}>
                  {formatModerationStatus(status)}
                </SelectItem>
              ))}
            </SelectGroup>
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
          <SelectTrigger className="w-55">
            <SelectValue placeholder="All sources">
              {filters.source ? humanize(filters.source) : "All sources"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">All sources</SelectItem>
              {sourceOptions.map((source) => (
                <SelectItem key={source} value={source}>
                  {humanize(source)}
                </SelectItem>
              ))}
            </SelectGroup>
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
          <SelectTrigger className="w-55">
            <SelectValue placeholder="All priorities">
              {filters.priority ? humanize(filters.priority) : "All priorities"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">All priorities</SelectItem>
              {priorityOptions.map((priority) => (
                <SelectItem key={priority} value={priority}>
                  {humanize(priority)}
                </SelectItem>
              ))}
            </SelectGroup>
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
        total={data?.total ?? 0}
        offset={offset}
      />
    </div>
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
