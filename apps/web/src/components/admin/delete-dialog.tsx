import { useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { IconTrash } from "@tabler/icons-react";

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

export function DeleteDialog({
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
