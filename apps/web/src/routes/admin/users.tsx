import { useState, useMemo } from "react";
import { useNavigate, createFileRoute } from "@tanstack/react-router";
import {
  useReactTable,
  getCoreRowModel,
  createColumnHelper,
  type PaginationState,
} from "@tanstack/react-table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  IconShield,
  IconSearch,
  IconDotsVertical,
  IconBan,
  IconUserCheck,
  IconUserX,
  IconTrash,
  IconKey,
  IconEye,
} from "@tabler/icons-react";

import { authClient } from "@/lib/auth";
import { useSession } from "@/hooks/use-session";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";

import {
  type AdminUser,
  type DialogState,
  PAGE_SIZE,
  formatDate,
  getInitials,
  isUserAdmin,
} from "@/components/admin/types";
import { ImpersonationBanner } from "@/components/admin/impersonation-banner";
import { BanDialog } from "@/components/admin/ban-dialog";
import { SetRoleDialog } from "@/components/admin/set-role-dialog";
import { SessionsDialog } from "@/components/admin/sessions-dialog";
import { DeleteDialog } from "@/components/admin/delete-dialog";
import { ImpersonateDialog } from "@/components/admin/impersonate-dialog";
import { UsersTable } from "@/components/admin/users-table";

export const Route = createFileRoute("/admin/users")({
  component: AdminUsersPage,
});

const columnHelper = createColumnHelper<AdminUser>();

function AdminUsersPage() {
  const navigate = useNavigate();
  const { data: session, isPending: sessionPending } = useSession();
  const isAdmin = useIsAdmin();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: PAGE_SIZE,
  });
  const [dialog, setDialog] = useState<DialogState>({ type: "none" });

  // Redirect non-admins
  if (!sessionPending && !isAdmin) {
    navigate({ to: "/" });
    return null;
  }

  const offset = pagination.pageIndex * PAGE_SIZE;

  const {
    data: listData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["admin", "users", debouncedSearch, pagination.pageIndex],
    queryFn: async () => {
      const result = await authClient.admin.listUsers({
        query: {
          limit: PAGE_SIZE,
          offset,
          ...(debouncedSearch
            ? {
                searchValue: debouncedSearch,
                searchField: "email",
                searchOperator: "contains" as const,
              }
            : {}),
          sortBy: "createdAt",
          sortDirection: "desc" as const,
        },
      });
      if (result.error) throw new Error(result.error.message);
      return result.data as { users: AdminUser[]; total: number };
    },
    enabled: !sessionPending && isAdmin,
  });

  const queryClient = useQueryClient();

  const unbanMutation = useMutation({
    mutationFn: async (userId: string) => {
      const result = await authClient.admin.unbanUser({ userId });
      if (result.error) throw new Error(result.error.message);
    },
    onSuccess: (_, userId) => {
      const user = listData?.users.find((u) => u.id === userId);
      toast.success(`${user?.name ?? "User"} has been unbanned`);
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (err: Error) => {
      toast.error("Failed to unban user", { description: err.message });
    },
  });

  function handleSearchChange(value: string) {
    setSearch(value);
    setPagination((p) => ({ ...p, pageIndex: 0 }));
    const t = setTimeout(() => setDebouncedSearch(value), 400);
    return () => clearTimeout(t);
  }

  function closeDialog() {
    setDialog({ type: "none" });
  }

  function closeAndRefresh() {
    closeDialog();
    queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
  }

  const users = listData?.users ?? [];
  const total = listData?.total ?? 0;

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: "user",
        header: "User",
        meta: { headerClassName: "w-[220px]" },
        cell: ({ row }) => {
          const u = row.original;
          return (
            <div className="flex items-center gap-2">
              <Avatar size="sm">
                {u.image && <AvatarImage src={u.image} alt={u.name} />}
                <AvatarFallback>{getInitials(u.name)}</AvatarFallback>
              </Avatar>
              <span className="truncate text-xs font-medium">{u.name}</span>
            </div>
          );
        },
      }),
      columnHelper.accessor("email", {
        header: "Email",
        cell: ({ getValue }) => (
          <span className="text-xs text-muted-foreground">{getValue()}</span>
        ),
      }),
      columnHelper.accessor("username", {
        header: "Username",
        meta: {
          className: "hidden md:table-cell",
          headerClassName: "hidden md:table-cell",
        },
        cell: ({ getValue }) => (
          <span className="text-xs text-muted-foreground">
            {getValue() ? `@${getValue()}` : "—"}
          </span>
        ),
      }),
      columnHelper.accessor("role", {
        header: "Role",
        cell: ({ row }) => (
          <Badge variant={isUserAdmin(row.original) ? "default" : "outline"}>
            {isUserAdmin(row.original) ? "admin" : "user"}
          </Badge>
        ),
      }),
      columnHelper.accessor("banned", {
        header: "Status",
        cell: ({ getValue }) =>
          getValue() ? (
            <Badge variant="destructive">Banned</Badge>
          ) : (
            <Badge variant="secondary">Active</Badge>
          ),
      }),
      columnHelper.accessor("createdAt", {
        header: "Joined",
        meta: {
          className: "hidden lg:table-cell",
          headerClassName: "hidden lg:table-cell",
        },
        cell: ({ getValue }) => (
          <span className="text-xs text-muted-foreground">
            {formatDate(getValue())}
          </span>
        ),
      }),
      columnHelper.display({
        id: "actions",
        meta: { headerClassName: "w-[40px]" },
        cell: ({ row }) => {
          const u = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger
                className="inline-flex size-7 items-center justify-center rounded hover:bg-accent transition-colors outline-none"
                aria-label={`Actions for ${u.name}`}
              >
                <IconDotsVertical className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>{u.name}</DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onSelect={() => setDialog({ type: "set-role", user: u })}
                >
                  <IconKey className="size-3.5" />
                  Set Role
                </DropdownMenuItem>

                <DropdownMenuItem
                  onSelect={() => setDialog({ type: "sessions", user: u })}
                >
                  <IconEye className="size-3.5" />
                  View Sessions
                </DropdownMenuItem>

                <DropdownMenuItem
                  onSelect={() => setDialog({ type: "impersonate", user: u })}
                >
                  <IconUserCheck className="size-3.5" />
                  Impersonate
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {u.banned ? (
                  <DropdownMenuItem onSelect={() => unbanMutation.mutate(u.id)}>
                    <IconUserX className="size-3.5" />
                    Unban User
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onSelect={() => setDialog({ type: "ban", user: u })}
                  >
                    <IconBan className="size-3.5" />
                    Ban User
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onSelect={() => setDialog({ type: "delete", user: u })}
                  className="text-destructive focus:text-destructive"
                >
                  <IconTrash className="size-3.5" />
                  Delete User
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setDialog, unbanMutation.mutate],
  );

  const table = useReactTable({
    data: users,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    rowCount: total,
    state: { pagination },
    onPaginationChange: setPagination,
  });

  const sessionRaw = session as
    | { session?: { impersonatedBy?: string | null }; user?: { name?: string } }
    | undefined;
  const impersonatedBy = sessionRaw?.session?.impersonatedBy;

  if (sessionPending) {
    return (
      <div className="flex min-h-100 items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {impersonatedBy && <ImpersonationBanner adminName={impersonatedBy} />}

      <div className="flex flex-col gap-4 p-6">
        <div className="flex items-center gap-3">
          <IconShield className="size-6 text-muted-foreground" />
          <div>
            <h1 className="text-lg font-semibold">User Management</h1>
            <p className="text-xs text-muted-foreground">
              Manage users, roles, bans, and sessions
            </p>
          </div>
        </div>

        <div className="relative max-w-sm">
          <IconSearch className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by email..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-8"
          />
        </div>

        <UsersTable
          table={table}
          isLoading={isLoading}
          error={error as Error | null}
          total={total}
          offset={offset}
        />
      </div>

      {dialog.type === "ban" && (
        <BanDialog
          user={dialog.user}
          onClose={closeDialog}
          onSuccess={closeAndRefresh}
        />
      )}
      {dialog.type === "set-role" && (
        <SetRoleDialog
          user={dialog.user}
          onClose={closeDialog}
          onSuccess={closeAndRefresh}
        />
      )}
      {dialog.type === "sessions" && (
        <SessionsDialog user={dialog.user} onClose={closeDialog} />
      )}
      {dialog.type === "delete" && (
        <DeleteDialog
          user={dialog.user}
          onClose={closeDialog}
          onSuccess={closeAndRefresh}
        />
      )}
      {dialog.type === "impersonate" && (
        <ImpersonateDialog
          user={dialog.user}
          onClose={closeDialog}
          onSuccess={() => {
            closeDialog();
            navigate({ to: "/" });
          }}
        />
      )}
    </div>
  );
}
