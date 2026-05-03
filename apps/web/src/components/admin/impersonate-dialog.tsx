import { useMutation } from "@tanstack/react-query";
import { useToast as toast } from "@/hooks/use-toast";
import { IconUserCheck } from "@tabler/icons-react";

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

import { type AdminUser } from "./types";

export function ImpersonateDialog({
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
