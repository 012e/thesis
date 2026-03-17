import { useState, useRef } from "react";
import {
  MDXEditor,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
  codeBlockPlugin,
} from "@mdxeditor/editor";
import "@mdxeditor/editor/style.css";
import { Avatar } from "./avatar";
import { Button } from "./button";
import { useCreatePost } from "@/hooks/use-create-post";
import { useSession } from "@/hooks/use-session";
import type { PostContentDto } from "@repo/shared-dto";
import {
  IconAlertCircle,
  IconLoader2,
  IconPhotoOff,
  IconX,
} from "@tabler/icons-react";

export function PostComposer() {
  const [content, setContent] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const { mutate: createPost, isPending } = useCreatePost();
  const { data: session } = useSession();
  const editorRef = useRef(null);

  const characterCount = content.length;
  const maxCharacters = 280;
  const isExceeded = characterCount > maxCharacters;

  const userInitial =
    (
      session?.user?.name?.[0] ||
      session?.user?.username?.[0] ||
      session?.user?.email?.[0]
    )?.toUpperCase() || "U";

  const handlePost = async () => {
    if (!content.trim()) {
      return;
    }

    const postContent: PostContentDto = {
      text: content.trim(),
    };

    createPost(postContent, {
      onSuccess: () => {
        setContent("");
        setIsOpen(false);
      },
    });
  };

  const handleClear = () => {
    setContent("");
  };

  const handleClose = () => {
    setIsOpen(false);
    // Optionally clear content on close
    if (content && !isPending) {
      setContent("");
    }
  };

  if (!isOpen) {
    // Collapsed state
    return (
      <div className="p-4 border-b cursor-text" onClick={() => setIsOpen(true)}>
        <div className="flex gap-3">
          <Avatar className="flex-shrink-0 w-10 h-10">
            <div className="flex justify-center items-center w-full h-full font-semibold rounded-full bg-primary text-primary-foreground">
              {userInitial}
            </div>
          </Avatar>
          <div className="flex-1">
            <textarea
              placeholder="What's happening?!"
              className="w-full text-xl bg-transparent cursor-text outline-none resize-none placeholder:text-muted-foreground min-h-[56px]"
              readOnly
              onClick={() => setIsOpen(true)}
            />
          </div>
        </div>
      </div>
    );
  }

  // Expanded state with editor
  return (
    <div className="border-b bg-background/50 backdrop-blur-sm">
      <div className="p-4">
        <div className="flex gap-3">
          <Avatar className="flex-shrink-0 w-10 h-10">
            <div className="flex justify-center items-center w-full h-full font-semibold rounded-full bg-primary text-primary-foreground">
              {userInitial}
            </div>
          </Avatar>
          <div className="flex-1">
            <div className="mb-4">
              <div className="overflow-hidden rounded-lg bg-background mdx-editor-wrapper">
                <MDXEditor
                  ref={editorRef}
                  markdown={content}
                  onChange={setContent}
                  plugins={[
                    headingsPlugin(),
                    listsPlugin(),
                    quotePlugin(),
                    thematicBreakPlugin(),
                    codeBlockPlugin(),
                    markdownShortcutPlugin(),
                  ]}
                  contentEditableClassName="prose dark:prose-invert prose-sm max-w-none p-4 outline-none text-base bg-background font-sans"
                />
              </div>

              {/* Character counter */}
              <div className="flex justify-between items-center px-2 mt-2">
                <div className="text-xs text-muted-foreground">
                  {characterCount} characters
                  {maxCharacters && (
                    <span className="ml-1">(max {maxCharacters})</span>
                  )}
                </div>
                {isExceeded && (
                  <div className="flex gap-1 items-center text-xs text-destructive">
                    <IconAlertCircle className="w-3 h-3" />
                    <span>Exceeds character limit</span>
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 justify-between items-center">
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-9 h-9 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10"
                  disabled
                  title="Image upload coming soon"
                >
                  <IconPhotoOff className="w-5 h-5" />
                </Button>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="px-4 rounded-full"
                  onClick={handleClear}
                  disabled={!content || isPending}
                >
                  Clear
                </Button>
                <Button
                  className="px-6 font-bold rounded-full"
                  onClick={handlePost}
                  disabled={!content.trim() || isPending || isExceeded}
                >
                  {isPending && (
                    <IconLoader2 className="mr-2 w-4 h-4 animate-spin" />
                  )}
                  {isPending ? "Posting..." : "Post"}
                </Button>
              </div>
            </div>
          </div>

          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 rounded-full text-muted-foreground hover:text-foreground"
            onClick={handleClose}
            disabled={isPending}
          >
            <IconX className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
