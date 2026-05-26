import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ReportReasonType } from "@repo/rest-contracts";
import { IconFlag } from "@tabler/icons-react";
import { useToast as toast } from "@/hooks/use-toast";
import { reportPost } from "@/lib/api/moderation";
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

const REPORT_REASONS: Array<{ value: ReportReasonType; label: string }> = [
  { value: "spam", label: "Spam" },
  { value: "harassment", label: "Harassment" },
  { value: "misinformation", label: "Misinformation" },
  { value: "hate_speech", label: "Hate Speech" },
  { value: "violence", label: "Violence" },
  { value: "inappropriate", label: "Inappropriate" },
  { value: "copyright", label: "Copyright" },
  { value: "other", label: "Other" },
];

export function ReportDialog({
  postId,
  open,
  onOpenChange,
}: {
  postId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState<ReportReasonType>("spam");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!open) return;
    setReason("spam");
    setDescription("");
  }, [open, postId]);

  const reportMutation = useMutation({
    mutationFn: () =>
      reportPost(postId, {
        reason,
        description: description.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success("Report submitted", {
        description: "Our moderation team will review this post.",
      });
      void queryClient.invalidateQueries({ queryKey: ["moderation"] });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast.error("Failed to submit report", { description: err.message });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report post</DialogTitle>
          <DialogDescription>
            Tell us what is wrong with this post. Reports are reviewed by the
            moderation system.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="report-reason">Reason</Label>
            <Select
              value={reason}
              onValueChange={(value) => setReason(value as ReportReasonType)}
            >
              <SelectTrigger id="report-reason" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REPORT_REASONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="report-description">Description (optional)</Label>
            <Textarea
              id="report-description"
              rows={4}
              maxLength={2000}
              placeholder="Add more context for the moderation team"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={reportMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => reportMutation.mutate()}
            disabled={reportMutation.isPending}
          >
            <IconFlag className="size-3.5" />
            {reportMutation.isPending ? "Submitting..." : "Submit report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
