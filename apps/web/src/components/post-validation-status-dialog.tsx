import { useQuery } from "@tanstack/react-query";
import { IconShieldCheck } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getPostValidationStatus } from "@/lib/api/moderation";
import { ValidationStatusGraph } from "@/routes/admin/moderation/-validation-graph";

export function PostValidationStatusDialog({
  postId,
  open,
  onOpenChange,
}: {
  postId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const {
    data: validationGraph,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["moderation", "validation-status", postId],
    queryFn: () => getPostValidationStatus(postId),
    enabled: open && !!postId,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconShieldCheck className="size-4 text-muted-foreground" />
            Validation status
          </DialogTitle>
          <DialogDescription>
            View the moderation validation pipeline results for this post. Hover
            a step to see blockage details or the validation summary.
          </DialogDescription>
        </DialogHeader>

        <ValidationStatusGraph
          graph={validationGraph}
          isLoading={isLoading}
          error={error as Error | null}
        />

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
