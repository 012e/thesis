import { type Table, flexRender } from "@tanstack/react-table";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";

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

import { type AdminUser, PAGE_SIZE } from "./types";

interface UsersTableProps {
  table: Table<AdminUser>;
  isLoading: boolean;
  error: Error | null;
  total: number;
  offset: number;
}

export function UsersTable({
  table,
  isLoading,
  error,
  total,
  offset,
}: UsersTableProps) {
  const colSpan = table.getAllColumns().length;
  if (error) {
    return (
      <div className="rounded-none border border-destructive/30 bg-destructive/5 p-4 text-xs text-destructive">
        Failed to load users: {error.message}
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
                  <div className="flex justify-center">
                    <Spinner size="md" />
                  </div>
                </TableCell>
              </TableRow>
            )}
            {!isLoading && table.getRowModel().rows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={colSpan}
                  className="py-8 text-center text-muted-foreground"
                >
                  No users found
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
            ? "No users"
            : `Showing ${offset + 1}–${Math.min(offset + PAGE_SIZE, total)} of ${total} users`}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage() || isLoading}
            aria-label="Previous page"
          >
            <IconChevronLeft className="size-3.5" />
          </Button>
          <span className="px-2">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount()}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage() || isLoading}
            aria-label="Next page"
          >
            <IconChevronRight className="size-3.5" />
          </Button>
        </div>
      </div>
    </>
  );
}
