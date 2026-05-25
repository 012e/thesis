import { useState, useMemo } from "react";
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
import type { PollPostContentDto, PostImageDto } from "@repo/shared-dto";
import { POST_CODE_BLOCK_LANGUAGES } from "@/lib/code-block-languages";
import {
  PostComposerProvider,
  PostComposerEditor,
  PostComposerPoll,
  PostComposerImageGrid,
  PostComposerCharCounter,
  PostComposerActions,
  type ImagePreview,
} from "@/components/post-composer";

export function PostComposer() {
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
    >
      <div className="border-b bg-background/50 backdrop-blur-sm">
        <div className="p-4">
          <div className="flex-1">
            <div className="mb-4">
              <PostComposerEditor plugins={editorPlugins} />
              <PostComposerPoll />
              <PostComposerImageGrid />
              <PostComposerCharCounter />
            </div>
            <PostComposerActions />
          </div>
        </div>
      </div>
    </PostComposerProvider>
  );
}
