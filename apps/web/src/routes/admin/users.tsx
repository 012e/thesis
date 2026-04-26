import { useState, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { createFileRoute } from "@tanstack/react-router";
import {
  useReactTable,
  getCoreRowModel,
  createColumnHelper,
  flexRender,
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
  IconChevronLeft,
  IconChevronRight,
  IconAlertTriangle,
  IconX,
} from "@tabler/icons-react";

import { authClient } from "@/lib/auth";
import { useSession } from "@/hooks/use-session";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/admin/users")({
  component: AdminUsersPage,
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AdminUser = {
  id: string;
  name: string;
  email: string;
  username?: string | null;
  image?: string | null;
  role?: string | null;
  banned?: boolean | null;
  banReason?: string | null;
  banExpires?: Date | string | null;
  createdAt: Date | string;
};

// Extend TanStack Table column meta to carry responsive class names
declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> {
    className?: string;
    headerClassName?: string;
  }
}

const columnHelper = createColumnHelper<AdminUser>();

type UserSession = {
  id: string;
  token: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: Date | string;
  expiresAt: Date | string;
};

type DialogState =
  | { type: "none" }
  | { type: "ban"; user: AdminUser }
  | { type: "set-role"; user: AdminUser }
  | { type: "sessions"; user: AdminUser }
  | { type: "delete"; user: AdminUser }
  | { type: "impersonate"; user: AdminUser };

const PAGE_SIZE = 10;

const BAN_EXPIRY_OPTIONS = [
  { label: "1 hour", value: String(60 * 60) },
  { label: "1 day", value: String(60 * 60 * 24) },
  { label: "7 days", value: String(60 * 60 * 24 * 7) },
  { label: "30 days", value: String(60 * 60 * 24 * 30) },
  { label: "Permanent", value: "permanent" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function isUserAdmin(user: AdminUser): boolean {
  return (
    user.role
      ?.split(",")
      .map((r) => r.trim())
      .includes("admin") ?? false
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ImpersonationBanner({ adminName }: { adminName: string }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [stopping, setStopping] = useState(false);

  async function handleStop() {
    setStopping(true);
    try {
      await (
        authClient.admin as Record<string, CallableFunction>
      ).stopImpersonating?.();
      await queryClient.invalidateQueries({ queryKey: ["session"] });
      toast.success("Stopped impersonating");
      navigate({ to: "/" });
    } catch {
      toast.error("Failed to stop impersonation");
    } finally {
      setStopping(false);
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 border-b bg-yellow-50 px-4 py-2 text-yellow-900 dark:bg-yellow-900/20 dark:text-yellow-200">
      <div className="flex items-center gap-2 text-xs">
        <IconAlertTriangle className="size-4 shrink-0" />
        <span>
          You are currently impersonating a user. Original admin:{" "}
          <strong>{adminName}</strong>
        </span>
      </div>
      <Button
        size="xs"
        variant="outline"
        onClick={handleStop}
        disabled={stopping}
        className="border-yellow-400 text-yellow-900 hover:bg-yellow-100 dark:text-yellow-200"
      >
        <IconX className="size-3" />
        Stop Impersonating
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ban Dialog
// ---------------------------------------------------------------------------

function BanDialog({
  user,
  onClose,
  onSuccess,
}: {
  user: AdminUser;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [reason, setReason] = useState("");
  const [expiry, setExpiry] = useState("permanent");
  const queryClient = useQueryClient();

  const banMutation = useMutation({
    mutationFn: async () => {
      const banExpiresIn = expiry === "permanent" ? undefined : Number(expiry);
      const result = await authClient.admin.banUser({
        userId: user.id,
        banReason: reason.trim() || undefined,
        banExpiresIn,
      });
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: () => {
      toast.success(`${user.name} has been banned`);
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      onSuccess();
    },
    onError: (err: Error) => {
      toast.error("Failed to ban user", { description: err.message });
    },
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ban User</DialogTitle>
          <DialogDescription>
            Ban <strong>{user.name}</strong> ({user.email}). They will be signed
            out immediately and unable to sign in.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ban-reason">Reason (optional)</Label>
            <Textarea
              id="ban-reason"
              placeholder="e.g. Spamming, harassment..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ban-expiry">Duration</Label>
            <Select
              value={expiry}
              onValueChange={(v) => v !== null && setExpiry(v)}
            >
              <SelectTrigger id="ban-expiry" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BAN_EXPIRY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => banMutation.mutate()}
            disabled={banMutation.isPending}
          >
            <IconBan className="size-3.5" />
            {banMutation.isPending ? "Banning..." : "Ban User"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Set Role Dialog
// ---------------------------------------------------------------------------

function SetRoleDialog({
  user,
  onClose,
  onSuccess,
}: {
  user: AdminUser;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const currentRole: "user" | "admin" = isUserAdmin(user) ? "admin" : "user";
  const [selectedRole, setSelectedRole] = useState<"user" | "admin">(
    currentRole,
  );
  const queryClient = useQueryClient();

  const roleMutation = useMutation({
    mutationFn: async () => {
      const result = await authClient.admin.setRole({
        userId: user.id,
        role: selectedRole,
      });
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: () => {
      toast.success(`Role updated to "${selectedRole}" for ${user.name}`);
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      onSuccess();
    },
    onError: (err: Error) => {
      toast.error("Failed to update role", { description: err.message });
    },
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set Role</DialogTitle>
          <DialogDescription>
            Change the role for <strong>{user.name}</strong> ({user.email}).
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="role-select">Role</Label>
          <Select
            value={selectedRole}
            onValueChange={(v) =>
              v !== null && setSelectedRole(v as "user" | "admin")
            }
          >
            <SelectTrigger id="role-select" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="user">User</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => roleMutation.mutate()}
            disabled={roleMutation.isPending || selectedRole === currentRole}
          >
            <IconKey className="size-3.5" />
            {roleMutation.isPending ? "Updating..." : "Update Role"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Sessions Dialog
// ---------------------------------------------------------------------------

function SessionsDialog({
  user,
  onClose,
}: {
  user: AdminUser;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();

  const { data: sessions, isLoading } = useQuery<UserSession[]>({
    queryKey: ["admin", "sessions", user.id],
    queryFn: async () => {
      const result = await authClient.admin.listUserSessions({
        userId: user.id,
      });
      if (result.error) throw new Error(result.error.message);
      return (result.data?.sessions ?? []) as UserSession[];
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (token: string) => {
      const result = await authClient.admin.revokeUserSession({
        sessionToken: token,
      });
      if (result.error) throw new Error(result.error.message);
    },
    onSuccess: () => {
      toast.success("Session revoked");
      queryClient.invalidateQueries({
        queryKey: ["admin", "sessions", user.id],
      });
    },
    onError: (err: Error) => {
      toast.error("Failed to revoke session", { description: err.message });
    },
  });

  const revokeAllMutation = useMutation({
    mutationFn: async () => {
      const result = await authClient.admin.revokeUserSessions({
        userId: user.id,
      });
      if (result.error) throw new Error(result.error.message);
    },
    onSuccess: () => {
      toast.success("All sessions revoked");
      queryClient.invalidateQueries({
        queryKey: ["admin", "sessions", user.id],
      });
    },
    onError: (err: Error) => {
      toast.error("Failed to revoke sessions", { description: err.message });
    },
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Active Sessions</DialogTitle>
          <DialogDescription>
            Sessions for <strong>{user.name}</strong> ({user.email}).
          </DialogDescription>
        </DialogHeader>

        <div className="flex max-h-80 flex-col gap-2 overflow-y-auto">
          {isLoading && (
            <p className="py-4 text-center text-muted-foreground">
              Loading sessions...
            </p>
          )}
          {!isLoading && (!sessions || sessions.length === 0) && (
            <p className="py-4 text-center text-muted-foreground">
              No active sessions
            </p>
          )}
          {sessions?.map((session) => (
            <div
              key={session.id}
              className="flex items-start justify-between gap-2 rounded-none border p-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium">
                  {session.userAgent ?? "Unknown device"}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  IP: {session.ipAddress ?? "—"} · Created:{" "}
                  {formatDate(session.createdAt)} · Expires:{" "}
                  {formatDate(session.expiresAt)}
                </p>
              </div>
              <Button
                size="xs"
                variant="destructive"
                onClick={() => revokeMutation.mutate(session.token)}
                disabled={revokeMutation.isPending}
              >
                Revoke
              </Button>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => revokeAllMutation.mutate()}
            disabled={
              revokeAllMutation.isPending || !sessions || sessions.length === 0
            }
          >
            {revokeAllMutation.isPending
              ? "Revoking..."
              : "Revoke All Sessions"}
          </Button>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Delete Dialog
// ---------------------------------------------------------------------------

function DeleteDialog({
  user,
  onClose,
  onSuccess,
}: {
  user: AdminUser;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const result = await authClient.admin.removeUser({
        userId: user.id,
      });
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: () => {
      toast.success(`${user.name} has been deleted`);
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      onSuccess();
    },
    onError: (err: Error) => {
      toast.error("Failed to delete user", { description: err.message });
    },
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete User</DialogTitle>
          <DialogDescription>
            Permanently delete <strong>{user.name}</strong> ({user.email})? This
            action cannot be undone and will remove all their data.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
          >
            <IconTrash className="size-3.5" />
            {deleteMutation.isPending ? "Deleting..." : "Delete Permanently"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Impersonate Dialog
// ---------------------------------------------------------------------------

function ImpersonateDialog({
  user,
  onClose,
  onSuccess,
}: {
  user: AdminUser;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const impersonateMutation = useMutation({
    mutationFn: async () => {
      const result = await authClient.admin.impersonateUser({
        userId: user.id,
      });
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: () => {
      toast.success(`Now impersonating ${user.name}`);
      onSuccess();
    },
    onError: (err: Error) => {
      toast.error("Failed to impersonate user", { description: err.message });
    },
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Impersonate User</DialogTitle>
          <DialogDescription>
            You will temporarily act as <strong>{user.name}</strong> (
            {user.email}). Your admin session will be restored when you stop
            impersonating or after 1 hour.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => impersonateMutation.mutate()}
            disabled={impersonateMutation.isPending}
          >
            <IconUserCheck className="size-3.5" />
            {impersonateMutation.isPending
              ? "Starting..."
              : "Start Impersonating"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

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
      return result.data as {
        users: AdminUser[];
        total: number;
      };
    },
    enabled: !sessionPending && isAdmin,
  });

  const unbanMutation = useMutation({
    mutationFn: async (userId: string) => {
      const result = await authClient.admin.unbanUser({ userId });
      if (result.error) throw new Error(result.error.message);
    },
    onSuccess: (_, userId) => {
      const user = listData?.users.find((u) => u.id === userId);
      toast.success(`${user?.name ?? "User"} has been unbanned`);
    },
    onError: (err: Error) => {
      toast.error("Failed to unban user", { description: err.message });
    },
  });

  const queryClient = useQueryClient();

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

  // ---------------------------------------------------------------------------
  // Column definitions (close over setDialog + unbanMutation)
  // ---------------------------------------------------------------------------

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
                <DropdownMenuLabel>{u.name}</DropdownMenuLabel>
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
    // setDialog and unbanMutation.mutate are stable references
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

  // Detect impersonation: the session's impersonatedBy field is set
  const sessionRaw = session as
    | { session?: { impersonatedBy?: string | null }; user?: { name?: string } }
    | undefined;
  const impersonatedBy = sessionRaw?.session?.impersonatedBy;

  if (sessionPending) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Impersonation Banner */}
      {impersonatedBy && <ImpersonationBanner adminName={impersonatedBy} />}

      <div className="flex flex-col gap-4 p-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <IconShield className="size-6 text-muted-foreground" />
          <div>
            <h1 className="text-lg font-semibold">User Management</h1>
            <p className="text-xs text-muted-foreground">
              Manage users, roles, bans, and sessions
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <IconSearch className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by email..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-8"
          />
        </div>

        {/* Table */}
        {error ? (
          <div className="rounded-none border border-destructive/30 bg-destructive/5 p-4 text-xs text-destructive">
            Failed to load users: {(error as Error).message}
          </div>
        ) : (
          <>
            <div className="rounded-none border">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead
                          key={header.id}
                          className={
                            header.column.columnDef.meta?.headerClassName
                          }
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
                        colSpan={columns.length}
                        className="py-8 text-center text-muted-foreground"
                      >
                        Loading users...
                      </TableCell>
                    </TableRow>
                  )}
                  {!isLoading && table.getRowModel().rows.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length}
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
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
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
        )}
      </div>

      {/* Dialogs */}
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
