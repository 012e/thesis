import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { FlagPriorityType } from "@repo/rest-contracts";
import { IconAlertTriangle, IconFlag } from "@tabler/icons-react";
import { useToast as toast } from "@/hooks/use-toast";
import { flagPost } from "@/lib/api/moderation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const PRIORITY_OPTIONS: Array<{ value: FlagPriorityType; label: string }> = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

export function FlagDialog({
  postId,
  open,
  onOpenChange,
  onSuccess,
}: {
  postId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}) {
  const queryClient = useQueryClient();
  const [priority, setPriority] = useState<FlagPriorityType>("medium");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!open) return;
    setPriority("medium");
    setReason("");
  }, [open, postId]);

  const flagMutation = useMutation({
    mutationFn: () =>
      flagPost({
        postId,
        priority,
        reason: reason.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success("Post flagged", {
        description:
          priority === "critical"
            ? "Critical priority applied. The post should be hidden immediately."
            : "The moderation queue has been updated.",
      });
      void queryClient.invalidateQueries({ queryKey: ["moderation"] });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (err: Error) => {
      toast.error("Failed to flag post", { description: err.message });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Flag post</DialogTitle>
          <DialogDescription>
            Manually escalate this post into the moderation queue.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="flag-priority">Priority</Label>
            <Select
              value={priority}
              onValueChange={(value) => setPriority(value as FlagPriorityType)}
            >
              <SelectTrigger id="flag-priority" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {priority === "critical" && (
            <div className="flex items-start gap-2 rounded-none border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
              <IconAlertTriangle className="mt-0.5 size-4 shrink-0" />
              <p>Critical priority will instantly hide the post from users.</p>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="flag-reason">Reason (optional)</Label>
            <Textarea
              id="flag-reason"
              rows={3}
              placeholder="Describe why this post should be escalated"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={flagMutation.isPending}
          >
            Cancel
          </Button>
          <Button onClick={() => flagMutation.mutate()} disabled={flagMutation.isPending}>
            <IconFlag className="size-3.5" />
            {flagMutation.isPending ? "Flagging..." : "Flag post"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
