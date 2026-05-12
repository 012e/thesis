import { useRef, useEffect, useMemo, type Dispatch, type SetStateAction } from "react";
import { useAtom } from "jotai";
import { produce } from "immer";
import { formDraftsAtom } from "@/lib/atoms/form-drafts";
import {
  type MDXEditorMethods,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
  codeBlockPlugin,
  codeMirrorPlugin,
} from "@repo/mdx-editor";
import type { PollPostContentDto, PostImageDto } from "@repo/shared-dto";
import { POST_CODE_BLOCK_LANGUAGES } from "@/lib/code-block-languages";
import {
  PostComposerProvider,
  PostComposerEditor,
  PostComposerPoll,
  PostComposerImageGrid,
  PostComposerCharCounter,
  PostComposerActions,
  PostComposerCloseButton,
  usePostComposerContext,
  type ImagePreview,
} from "@/components/post-composer";

/**
 * Watches the submitRequest flag set by the submit_form AI tool and triggers
 * handlePost() from within PostComposerProvider context. Clears the flag after
 * initiating submission so it doesn't re-fire on re-render.
 */
function AutoSubmit({ threadId }: { threadId: string }) {
  const { handlePost, canPost } = usePostComposerContext();
  const [drafts, setDrafts] = useAtom(formDraftsAtom);
  const submitRequest = drafts[threadId]?.submitRequest ?? false;

  useEffect(() => {
    if (!submitRequest || !canPost) return;
    // Clear the flag first to avoid double-submit on re-render.
    setDrafts(
      produce((d) => {
        if (d[threadId]) d[threadId]!.submitRequest = false;
      }),
    );
    void handlePost();
  }, [submitRequest, canPost, threadId, handlePost, setDrafts]);

  return null;
}

export function PostCreationForm({ threadId }: { threadId: string }) {
  const [drafts, setDrafts] = useAtom(formDraftsAtom);
  const draft = drafts[threadId]?.data ?? {};

  const content = (draft.content as string) ?? "";
  const editorRef = useRef<MDXEditorMethods>(null);
  const lastEditorContent = useRef(content);

  const setContent = (val: string) => {
    lastEditorContent.current = val;
    setDrafts(
      produce((d) => {
        if (!d[threadId]) d[threadId] = { activeForm: "PostCreationForm", data: {} };
        d[threadId]!.activeForm = "PostCreationForm";
        d[threadId]!.data.content = val;
      }),
    );
  };

  const showPollCreator = (draft.showPollCreator as boolean) ?? false;
  const setShowPollCreator = (val: boolean) =>
    setDrafts(
      produce((d) => {
        if (!d[threadId]) d[threadId] = { activeForm: "PostCreationForm", data: {} };
        d[threadId]!.activeForm = "PostCreationForm";
        d[threadId]!.data.showPollCreator = val;
      }),
    );

  const poll = draft.poll as PollPostContentDto | undefined;
  const setPoll = (val: PollPostContentDto | undefined) =>
    setDrafts(
      produce((d) => {
        if (!d[threadId]) d[threadId] = { activeForm: "PostCreationForm", data: {} };
        d[threadId]!.activeForm = "PostCreationForm";
        d[threadId]!.data.poll = val;
      }),
    );

  const selectedImages = (draft.selectedImages as ImagePreview[]) ?? [];
  const setSelectedImages: Dispatch<SetStateAction<ImagePreview[]>> = (valOrUpdater) =>
    setDrafts(
      produce((d) => {
        if (!d[threadId]) d[threadId] = { activeForm: "PostCreationForm", data: {} };
        d[threadId]!.activeForm = "PostCreationForm";
        const prev = (d[threadId]!.data.selectedImages as ImagePreview[]) ?? [];
        d[threadId]!.data.selectedImages =
          typeof valOrUpdater === "function" ? valOrUpdater(prev) : valOrUpdater;
      }),
    );

  const uploadedImages = (draft.uploadedImages as PostImageDto[]) ?? [];
  const setUploadedImages: Dispatch<SetStateAction<PostImageDto[]>> = (valOrUpdater) =>
    setDrafts(
      produce((d) => {
        if (!d[threadId]) d[threadId] = { activeForm: "PostCreationForm", data: {} };
        d[threadId]!.activeForm = "PostCreationForm";
        const prev = (d[threadId]!.data.uploadedImages as PostImageDto[]) ?? [];
        d[threadId]!.data.uploadedImages =
          typeof valOrUpdater === "function" ? valOrUpdater(prev) : valOrUpdater;
      }),
    );

  // Push external content changes (e.g. from set_form_field tool) into the editor.
  useEffect(() => {
    if (content !== lastEditorContent.current && editorRef.current) {
      lastEditorContent.current = content;
      editorRef.current.setMarkdown(content);
    }
  }, [content]);

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
      }),
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
      {/* Handles submit_form AI tool calls from within provider context */}
      <AutoSubmit threadId={threadId} />
      <div className="border-b bg-background/50 backdrop-blur-sm">
        <div className="p-4">
          <div className="flex-1">
            <div className="mb-4">
              <PostComposerEditor
                ref={editorRef}
                plugins={editorPlugins}
                wrapperClassName="bg-background"
                contentEditableClassName="post-composer-markdown p-4 outline-none bg-background"
              />
              <PostComposerPoll />
              <PostComposerImageGrid />
              <PostComposerCharCounter />
            </div>
            <PostComposerActions />
          </div>
          <PostComposerCloseButton />
        </div>
      </div>
    </PostComposerProvider>
  );
}
