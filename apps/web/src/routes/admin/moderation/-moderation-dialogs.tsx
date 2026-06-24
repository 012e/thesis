import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PostModerationType } from "@repo/rest-contracts";
import { IconCheck, IconFlag, IconMinus, IconX } from "@tabler/icons-react";

import { FlagDialog } from "@/components/admin/flag-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PostMarkdown } from "@/components/ui/post-markdown";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useToast as toast } from "@/hooks/use-toast";
import {
  getModeration,
  getPostValidationStatus,
  reviewModeration,
} from "@/lib/api/moderation";

import {
  DetailRow,
  PriorityBadge,
  SourceBadge,
  StatusBadge,
  formatConfidence,
  formatDate,
  getPostPreview,
  type ModerationDialogState,
} from "./-shared";
import { ValidationStatusGraph } from "./-validation-graph";
import { ModerationAIReviewPanel } from "./-ai-review-panel";

export function ModerationDialogs({
  dialog,
  setDialog,
  enabled,
}: {
  dialog: ModerationDialogState;
  setDialog: (dialog: ModerationDialogState) => void;
  enabled: boolean;
}) {
  const queryClient = useQueryClient();
  const selectedModerationId =
    dialog.type === "details" || dialog.type === "review"
      ? dialog.id
      : undefined;
  const selectedModerationFromDialog =
    dialog.type === "details" || dialog.type === "review"
      ? dialog.moderation
      : undefined;

  const {
    data: moderationDetail,
    isLoading: isDetailLoading,
    error: detailError,
  } = useQuery({
    queryKey: ["moderation", "detail", selectedModerationId],
    queryFn: () => getModeration(selectedModerationId as string),
    enabled: enabled && !!selectedModerationId,
  });

  const selectedModeration = moderationDetail ?? selectedModerationFromDialog;

  const selectedPostId = selectedModeration?.postId;
  const {
    data: validationGraph,
    isLoading: isGraphLoading,
    error: graphError,
  } = useQuery({
    queryKey: ["moderation", "validation-status", selectedPostId],
    queryFn: () => getPostValidationStatus(selectedPostId as string),
    enabled: enabled && dialog.type === "details" && !!selectedPostId,
  });

  const reviewMutation = useMutation({
    mutationFn: ({
      id,
      status,
      reviewNote,
    }: {
      id: string;
      status: "approved" | "rejected";
      reviewNote?: string;
    }) => reviewModeration(id, { status, reviewNote }),
    onSuccess: (_, variables) => {
      toast.success(
        variables.status === "approved"
          ? "Marked as false positive"
          : "Post rejected",
      );
      void queryClient.invalidateQueries({ queryKey: ["moderation"] });
      setDialog({ type: "none" });
    },
    onError: (err: Error) => {
      toast.error("Failed to review moderation", { description: err.message });
    },
  });

  return (
    <>
      <ModerationDetailDialog
        moderation={selectedModeration}
        validationGraph={validationGraph}
        isLoading={isDetailLoading}
        isGraphLoading={isGraphLoading}
        error={detailError as Error | null}
        graphError={graphError as Error | null}
        open={dialog.type === "details"}
        onOpenChange={(open) => !open && setDialog({ type: "none" })}
        onApprove={() =>
          selectedModeration &&
          setDialog({
            type: "review",
            id: selectedModeration.id,
            action: "approved",
          })
        }
        onReject={() =>
          selectedModeration &&
          setDialog({
            type: "review",
            id: selectedModeration.id,
            action: "rejected",
          })
        }
        onFlag={() =>
          selectedModeration &&
          setDialog({ type: "flag", postId: selectedModeration.postId })
        }
      />

      <ReviewDialog
        moderation={selectedModeration}
        action={dialog.type === "review" ? dialog.action : "approved"}
        open={dialog.type === "review"}
        isPending={reviewMutation.isPending}
        onOpenChange={(open) => !open && setDialog({ type: "none" })}
        onSubmit={(reviewNote) => {
          if (dialog.type !== "review") return;
          reviewMutation.mutate({
            id: dialog.id,
            status: dialog.action,
            reviewNote,
          });
        }}
      />

      {dialog.type === "flag" && (
        <FlagDialog
          postId={dialog.postId}
          open
          onOpenChange={(open) => !open && setDialog({ type: "none" })}
          onSuccess={() => {
            setDialog({ type: "none" });
          }}
        />
      )}
    </>
  );
}

function ModerationDetailDialog({
  moderation,
  validationGraph,
  isLoading,
  isGraphLoading,
  error,
  graphError,
  open,
  onOpenChange,
  onApprove,
  onReject,
  onFlag,
}: {
  moderation: PostModerationType | undefined;
  validationGraph: Parameters<typeof ValidationStatusGraph>[0]["graph"];
  isLoading: boolean;
  isGraphLoading: boolean;
  error: Error | null;
  graphError: Error | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove: () => void;
  onReject: () => void;
  onFlag: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden sm:max-w-4xl lg:max-w-6xl">
        <DialogHeader>
          <DialogTitle>Moderation details</DialogTitle>
          <DialogDescription>
            Review the full moderation record, supporting context, and current
            decision.
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 gap-4 overflow-hidden md:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
          <div className="min-h-0 overflow-y-auto pr-1">
          {isLoading ? (
            <div className="flex min-h-48 items-center justify-center">
              <Spinner size="md" />
            </div>
          ) : error ? (
            <div className="rounded-none border border-destructive/30 bg-destructive/5 p-4 text-xs text-destructive">
              Failed to load moderation details: {error.message}
            </div>
          ) : moderation ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Validation status graph
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Hover a step to see the blockage details or validation
                    summary.
                  </p>
                </div>
                <ValidationStatusGraph
                  graph={validationGraph}
                  isLoading={isGraphLoading}
                  error={graphError}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <DetailRow
                  label="Status"
                  value={<StatusBadge status={moderation.status} />}
                />
                <DetailRow
                  label="Priority"
                  value={<PriorityBadge priority={moderation.priority} />}
                />
                <DetailRow
                  label="Source"
                  value={<SourceBadge source={moderation.source} />}
                />
                <DetailRow
                  label="LLM confidence"
                  value={formatConfidence(moderation.llmConfidence)}
                />
                <DetailRow
                  label="Created"
                  value={formatDate(moderation.createdAt)}
                />
                <DetailRow
                  label="Reviewed"
                  value={
                    moderation.reviewedAt
                      ? formatDate(moderation.reviewedAt)
                      : "—"
                  }
                />
              </div>

              <div className="space-y-2 rounded-none border p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Post content
                </p>
                {moderation.post?.content.text ? (
                  <div className="prose prose-sm max-w-none text-sm dark:prose-invert">
                    <PostMarkdown content={moderation.post.content.text} />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {getPostPreview(moderation)}
                  </p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <DetailRow
                  label="LLM summary"
                  value={
                    moderation.llmSummary ?? (
                      <span className="text-muted-foreground">
                        No summary available
                      </span>
                    )
                  }
                />
                <DetailRow
                  label="Review note"
                  value={
                    moderation.reviewNote ?? (
                      <span className="text-muted-foreground">
                        No review note
                      </span>
                    )
                  }
                />
                <DetailRow
                  label="Similar post ID"
                  value={
                    <span className="font-mono text-xs text-muted-foreground">
                      {moderation.similarPostId ?? "—"}
                    </span>
                  }
                />
                <DetailRow
                  label="Similarity score"
                  value={formatConfidence(moderation.similarityScore)}
                />
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No moderation record selected.
            </p>
          )}
          </div>

          {moderation && (
            <ModerationAIReviewPanel
              key={moderation.id}
              moderation={moderation}
            />
          )}
        </div>

        <DialogFooter>
          {moderation && (
            <>
              <Button variant="ghost" onClick={onFlag}>
                <IconFlag className="size-3.5" />
                Flag post
              </Button>
              <Button variant="outline" onClick={onApprove}>
                <IconMinus className="size-3.5" />
                False positive
              </Button>
              <Button variant="destructive" onClick={onReject}>
                <IconX className="size-3.5" />
                Reject post
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReviewDialog({
  moderation,
  action,
  open,
  isPending,
  onOpenChange,
  onSubmit,
}: {
  moderation: PostModerationType | undefined;
  action: "approved" | "rejected";
  open: boolean;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (note?: string) => void;
}) {
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) return;
    setNote("");
  }, [open, moderation?.id, action]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            {action === "approved" ? "Mark as false positive" : "Reject post"}
          </DialogTitle>
          <DialogDescription>
            {action === "approved"
              ? "Mark this moderation record as a false positive and allow the post."
              : "Reject this post and keep the content blocked."}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 space-y-3 overflow-y-auto pr-1">
          {moderation && (
            <div className="rounded-none border bg-muted/40 p-3 text-xs text-muted-foreground">
              <div className="mb-2 flex flex-wrap gap-2">
                <StatusBadge status={moderation.status} />
                <PriorityBadge priority={moderation.priority} />
                <SourceBadge source={moderation.source} />
              </div>
              <p>{getPostPreview(moderation)}</p>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="review-note" className="text-xs font-medium">
              Note (optional)
            </label>
            <Textarea
              id="review-note"
              rows={4}
              maxLength={2000}
              placeholder="Add a note for the moderation audit trail"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            variant={action === "approved" ? "default" : "destructive"}
            onClick={() => onSubmit(note.trim() || undefined)}
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Spinner size="sm" />
                Saving...
              </>
            ) : action === "approved" ? (
              <>
                <IconCheck className="size-3.5" />
                Mark false positive
              </>
            ) : (
              <>
                <IconX className="size-3.5" />
                Reject post
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
