import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { PaginationState } from "@tanstack/react-table";
import type { PostReportType } from "@repo/rest-contracts";

import { PAGE_SIZE } from "@/components/admin/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Table as UITable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listReports } from "@/lib/api/moderation";

import { formatDate, humanize } from "./-shared";

export default function ReportsTab({ enabled }: { enabled: boolean }) {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: PAGE_SIZE,
  });
  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: [
      "moderation",
      "reports",
      pagination.pageIndex,
      pagination.pageSize,
    ],
    queryFn: () =>
      listReports({
        page: pagination.pageIndex,
        pageSize: pagination.pageSize,
      }),
    enabled,
  });

  return (
    <ReportsTable
      items={data?.items ?? []}
      isLoading={isLoading || isFetching}
      error={error as Error | null}
      total={data?.total ?? 0}
      pagination={pagination}
      onPageChange={setPagination}
    />
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
                  <div className="flex justify-center">
                    <Spinner size="md" />
                  </div>
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
