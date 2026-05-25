import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { oneDark } from "@codemirror/theme-one-dark";
import { IconLoader2 } from "@tabler/icons-react";
import {
  codeBlockPlugin,
  codeMirrorPlugin,
  headingsPlugin,
  listsPlugin,
  linkPlugin,
  markdownShortcutPlugin,
  quotePlugin,
  thematicBreakPlugin,
} from "@repo/mdx-editor";
import type { PollPostContentDto, PostImageDto } from "@repo/shared-dto";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  PostComposerEditor,
  PostComposerProvider,
  type ImagePreview,
} from "@/components/post-composer";
import { usePostComposerContext } from "@/components/post-composer/context";
import { getUserProfile } from "@/lib/api/users";
import { POST_CODE_BLOCK_LANGUAGES } from "@/lib/code-block-languages";
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

function CurrentUserAvatar({ isReply }: { isReply: boolean }) {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const { data: profile } = useQuery({
    queryKey: ["users", userId, "profile"],
    queryFn: () => getUserProfile(userId!),
    staleTime: 1000 * 60 * 5,
    enabled: !!userId,
  });

  const displayName =
    profile?.name ||
    profile?.username ||
    session?.user?.name ||
    session?.user?.username ||
    session?.user?.email ||
    "User";
  const userInitial = displayName[0]?.toUpperCase() || "U";

  return (
    <Avatar className={`shrink-0 ${isReply ? "w-8 h-8" : "w-10 h-10"}`}>
      <AvatarImage
        src={profile?.image ?? session?.user?.image ?? undefined}
        alt={displayName}
      />
      <AvatarFallback className="text-xs font-semibold bg-primary text-primary-foreground">
        {userInitial}
      </AvatarFallback>
    </Avatar>
  );
}

function CommentEditorActions({
  onCancel,
  isPending,
  submitLabel,
  isReply,
}: Pick<
  CommentEditorProps,
  "onCancel" | "isPending" | "submitLabel" | "isReply"
>) {
  const { content, canPost, handlePost } = usePostComposerContext();

  return (
    <div className="flex items-center justify-between gap-3 mt-2">
      {!isReply ? (
        <div className="text-xs text-muted-foreground">
          {content.length} characters
        </div>
      ) : (
        <div />
      )}
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
          onClick={() => void handlePost()}
          disabled={!canPost || isPending}
        >
          {isPending && <IconLoader2 className="mr-1 w-3 h-3 animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}

export function CommentEditor({
  onSubmit,
  onCancel,
  isPending = false,
  placeholder = "Write a comment...",
  submitLabel = "Post",
  isReply = false,
}: CommentEditorProps) {
  const [content, setContent] = useState("");
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [poll, setPoll] = useState<PollPostContentDto | undefined>(undefined);
  const [selectedImages, setSelectedImages] = useState<ImagePreview[]>([]);
  const [uploadedImages, setUploadedImages] = useState<PostImageDto[]>([]);

  const editorPlugins = useMemo(
    () => [
      headingsPlugin(),
      listsPlugin(),
      quotePlugin(),
      thematicBreakPlugin(),
      codeBlockPlugin({ defaultCodeBlockLanguage: "js" }),
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

  return (
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
      onSubmitContent={onSubmit}
      isSubmitting={isPending}
    >
      <div
        className={`relative z-10 flex gap-2 focus-within:z-40 ${
          isReply ? "py-2" : "p-4 border-b"
        }`}
      >
        <CurrentUserAvatar isReply={isReply} />
        <div className="flex-1 min-w-0">
          <PostComposerEditor
            plugins={editorPlugins}
            placeholder={placeholder}
            wrapperClassName="rounded-none border bg-background"
            contentEditableClassName={`post-composer-markdown outline-none bg-background ${
              isReply ? "min-h-20 p-3" : "min-h-28 p-4"
            }`}
          />
          <CommentEditorActions
            onCancel={onCancel}
            isPending={isPending}
            submitLabel={submitLabel}
            isReply={isReply}
          />
        </div>
      </div>
    </PostComposerProvider>
  );
}
