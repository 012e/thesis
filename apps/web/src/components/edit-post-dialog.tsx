import { useState, useRef } from "react";
import {
  MDXEditor,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
  codeBlockPlugin,
  codeMirrorPlugin,
} from "@repo/mdx-editor";
import "@repo/mdx-editor/style.css";
import type { PostDto } from "@repo/shared-dto";
import { IconAlertCircle, IconLoader2 } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUpdatePost } from "@/hooks/use-update-post";
import { POST_CODE_BLOCK_LANGUAGES } from "@/lib/code-block-languages";
import { POST_MAX_LENGTH } from "@/lib/constants";

interface EditPostDialogProps {
  post: PostDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditPostDialog({
  post,
  open,
  onOpenChange,
}: EditPostDialogProps) {
  const [content, setContent] = useState(post.content.text ?? "");
  const { mutate: updatePost, isPending } = useUpdatePost();
  const editorRef = useRef(null);

  const maxCharacters = POST_MAX_LENGTH;
  const isExceeded = content.length > maxCharacters;
  const canSave = content.trim().length > 0 && !isExceeded;

  const handleSave = () => {
    if (!canSave) return;

    updatePost(
      {
        postId: post.id,
        content: {
          ...post.content,
          text: content.trim(),
        },
      },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      },
    );
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!isPending) {
      if (nextOpen) {
        setContent(post.content.text ?? "");
      }
      onOpenChange(nextOpen);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit post</DialogTitle>
        </DialogHeader>

        <div className="overflow-hidden rounded-lg bg-background mdx-editor-wrapper">
          <MDXEditor
            ref={editorRef}
            key={open ? "open" : "closed"}
            markdown={content}
            onChange={setContent}
            plugins={[
              headingsPlugin(),
              listsPlugin(),
              quotePlugin(),
              thematicBreakPlugin(),
              codeBlockPlugin(),
              codeMirrorPlugin({
                autoLoadLanguageSupport: true,
                codeBlockLanguages: POST_CODE_BLOCK_LANGUAGES,
              }),
              markdownShortcutPlugin(),
            ]}
            contentEditableClassName="post-composer-markdown p-4 outline-none bg-background min-h-[120px]"
          />
        </div>

        <div className="flex justify-between items-center px-1">
          <span className="text-xs text-muted-foreground">
            {content.length} / {maxCharacters}
          </span>
          {isExceeded && (
            <div className="flex gap-1 items-center text-xs text-destructive">
              <IconAlertCircle className="w-3 h-3" />
              <span>Exceeds character limit</span>
            </div>
          )}
        </div>

        <DialogFooter showCloseButton>
          <Button
            onClick={handleSave}
            disabled={!canSave || isPending}
            className="rounded-full px-6 font-bold"
          >
            {isPending && <IconLoader2 className="mr-2 w-4 h-4 animate-spin" />}
            {isPending ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
