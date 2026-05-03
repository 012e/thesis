import { useState } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { IconBan } from "@tabler/icons-react";

import { authClient } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

import { type AdminUser, BAN_EXPIRY_OPTIONS } from "./types";

export function BanDialog({
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
