import { useState } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useToast as toast } from "@/hooks/use-toast";
import { IconKey } from "@tabler/icons-react";

import { authClient } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { type AdminUser, isUserAdmin } from "./types";

export function SetRoleDialog({
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
