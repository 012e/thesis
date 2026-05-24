import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { useToast as toast } from "@/hooks/use-toast";

import { authClient } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";

import { type AdminUser, type UserSession, formatDate } from "./types";

export function SessionsDialog({
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
            <div className="flex justify-center py-4 text-muted-foreground">
              <Spinner size="md" />
            </div>
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
