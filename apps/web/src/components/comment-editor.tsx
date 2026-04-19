import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { IconLoader2 } from "@tabler/icons-react";
import { useSession } from "@/hooks/use-session";

export interface CommentEditorProps {
  onSubmit: (content: string) => void;
  onCancel?: () => void;
  isPending?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  submitLabel?: string;
  isReply?: boolean;
}

export function CommentEditor({
  onSubmit,
  onCancel,
  isPending = false,
  placeholder = "Write a comment...",
  autoFocus = false,
  submitLabel = "Post",
  isReply = false,
}: CommentEditorProps) {
  const [content, setContent] = useState("");
  const { data: session } = useSession();

  const handleSubmit = () => {
    if (!content.trim()) return;
    onSubmit(content.trim());
    setContent("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Ctrl+Enter or Cmd+Enter
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const userInitial =
    (
      session?.user?.name?.[0] ||
      session?.user?.username?.[0] ||
      session?.user?.email?.[0]
    )?.toUpperCase() || "U";

  return (
    <div className={`flex gap-2 ${isReply ? "py-2" : "p-4 border-b"}`}>
      <Avatar className={`shrink-0 ${isReply ? "w-8 h-8" : "w-10 h-10"}`}>
        <AvatarImage
          src={session?.user?.image ?? undefined}
          alt={session?.user?.name || undefined}
        />
        <AvatarFallback className="text-xs font-semibold bg-primary text-primary-foreground">
          {userInitial}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`mb-2 resize-none bg-background ${isReply ? "min-h-[80px]" : "min-h-[100px]"}`}
          autoFocus={autoFocus}
          disabled={isPending}
        />
        <div className="flex gap-2 justify-end">
          {onCancel && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              disabled={isPending}
            >
              Cancel
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!content.trim() || isPending}
          >
            {isPending && <IconLoader2 className="mr-1 w-3 h-3 animate-spin" />}
            {submitLabel}
          </Button>
        </div>
        {!isReply && (
          <div className="mt-1 text-xs text-muted-foreground">
            Tip: Press Ctrl+Enter to submit
          </div>
        )}
      </div>
    </div>
  );
}
