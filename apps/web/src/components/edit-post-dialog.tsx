import { useMemo, useState } from "react";
import {
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
  codeBlockPlugin,
  codeMirrorPlugin,
  linkPlugin,
} from "@repo/mdx-editor";
import { oneDark } from "@codemirror/theme-one-dark";
import type {
  PollPostContentDto,
  PostDto,
  PostImageDto,
} from "@repo/shared-dto";
import { IconLoader2 } from "@tabler/icons-react";
import {
  PostComposerCharCounter,
  PostComposerEditor,
  PostComposerProvider,
  type ImagePreview,
} from "@/components/post-composer";
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
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [poll, setPoll] = useState<PollPostContentDto | undefined>(undefined);
  const [selectedImages, setSelectedImages] = useState<ImagePreview[]>([]);
  const [uploadedImages, setUploadedImages] = useState<PostImageDto[]>([]);
  const { mutate: updatePost, isPending } = useUpdatePost();

  const editorPlugins = useMemo(
    () => [
      headingsPlugin(),
      listsPlugin(),
      quotePlugin(),
      thematicBreakPlugin(),
      codeBlockPlugin(),
      codeMirrorPlugin({
        autoLoadLanguageSupport: true,
        codeBlockLanguages: POST_CODE_BLOCK_LANGUAGES,
        codeMirrorExtensions: [oneDark],
      }),
      linkPlugin(),
      markdownShortcutPlugin(),
    ],
    [],
  );

  const isExceeded = content.length > POST_MAX_LENGTH;
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
      <PostComposerProvider
        content={content}
        setContent={setContent}
        showPollCreator={showPollCreator}
        setShowPollCreator={setShowPollCreator}
        poll={poll}
        setPoll={setPoll}
        selectedImages={selectedImages}
        setSelectedImages={setSelectedImages}
        uploadedImages={uploadedImages}
        setUploadedImages={setUploadedImages}
        isSubmitting={isPending}
      >
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-hidden sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit post</DialogTitle>
          </DialogHeader>

          <PostComposerEditor
            key={open ? "open" : "closed"}
            plugins={editorPlugins}
            wrapperClassName="overflow-hidden bg-background"
            contentEditableClassName="post-composer-markdown p-4 outline-none bg-background min-h-[120px] max-h-[60dvh] overflow-y-auto"
          />
          <PostComposerCharCounter />

          <DialogFooter showCloseButton>
            <Button
              onClick={handleSave}
              disabled={!canSave || isPending}
              className="px-6 font-bold"
            >
              {isPending && (
                <IconLoader2 className="mr-2 w-4 h-4 animate-spin" />
              )}
              {isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </PostComposerProvider>
    </Dialog>
  );
}
