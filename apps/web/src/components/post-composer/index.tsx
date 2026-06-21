import {
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  forwardRef,
  type ReactNode,
  type ComponentProps,
  type Dispatch,
  type SetStateAction,
} from "react";
import { MDXEditor, type MDXEditorMethods } from "@repo/mdx-editor";
import "@repo/mdx-editor/style.css";
import type {
  PostContentDto,
  PostDto,
  PollPostContentDto,
  PostImageDto,
  PostKindDto,
} from "@repo/shared-dto";
import {
  IconAlertCircle,
  IconLoader2,
  IconPhoto,
  IconX,
  IconChartBar,
  IconHelpCircle,
  IconMessage,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { PollCreator } from "@/components/poll-creator";
import { TagAutocomplete } from "@/components/tags/tag-autocomplete";
import { useCreatePost } from "@/hooks/use-create-post";
import { useUploadImages } from "@/hooks/use-upload-images";
import { POST_MAX_LENGTH } from "@/lib/constants";
import {
  PostComposerContext,
  usePostComposerContext,
  type ImagePreview,
} from "./context";
import { Separator } from "../ui/separator";

// ---- Types -----------------------------------------------------------------

export type { ImagePreview };

export const MAX_IMAGES = 4;

// ---- Provider --------------------------------------------------------------

export interface PostComposerProviderProps {
  content: string;
  setContent: (val: string) => void;
  kind?: PostKindDto;
  setKind?: (val: PostKindDto) => void;
  showPollCreator: boolean;
  setShowPollCreator: (val: boolean) => void;
  poll: PollPostContentDto | undefined;
  setPoll: (val: PollPostContentDto | undefined) => void;
  selectedImages: ImagePreview[];
  setSelectedImages: Dispatch<SetStateAction<ImagePreview[]>>;
  uploadedImages: PostImageDto[];
  setUploadedImages: Dispatch<SetStateAction<PostImageDto[]>>;
  onSubmitContent?: (content: string) => void | Promise<void>;
  isSubmitting?: boolean;
  children: ReactNode;
}

export function PostComposerProvider({
  content,
  setContent,
  kind: controlledKind,
  setKind: setControlledKind,
  showPollCreator,
  setShowPollCreator,
  poll,
  setPoll,
  selectedImages,
  setSelectedImages,
  uploadedImages,
  setUploadedImages,
  onSubmitContent,
  isSubmitting = false,
  children,
}: PostComposerProviderProps) {
  const { mutateAsync: createPost, isPending: isCreating } = useCreatePost();
  const { mutateAsync: uploadImages, isPending: isUploading } =
    useUploadImages();
  const [internalKind, setInternalKind] =
    useState<PostKindDto>("discussion");
  const kind = controlledKind ?? internalKind;
  const setKind = setControlledKind ?? setInternalKind;

  const isPending = isCreating || isUploading || isSubmitting;
  const characterCount = content.length;
  const isExceeded = characterCount > POST_MAX_LENGTH;
  const hasContent =
    content.trim() !== "" ||
    poll !== undefined ||
    selectedImages.length > 0 ||
    uploadedImages.length > 0;
  const canPost = hasContent && !isExceeded;
  const totalImages = selectedImages.length + uploadedImages.length;
  const canAddMoreImages = totalImages < MAX_IMAGES;

  const handlePost = async (): Promise<PostDto | void> => {
    if (!canPost) return;

    if (onSubmitContent) {
      await onSubmitContent(content.trim());
      setContent("");
      return;
    }

    try {
      let images = uploadedImages;
      if (selectedImages.length > 0) {
        const files = selectedImages.map((img) => img.file);
        const result = await uploadImages(files);
        images = [...uploadedImages, ...result.images];
      }
      const postContent: PostContentDto = {};
      if (content.trim()) postContent.text = content.trim();
      if (poll) postContent.poll = poll;
      if (images.length > 0) postContent.images = images;
      const post = await createPost({ content: postContent, kind });
      setContent("");
      setPoll(undefined);
      setShowPollCreator(false);
      setSelectedImages([]);
      setUploadedImages([]);
      setKind("discussion");
      return post;
    } catch {
      // Error handling is done in the hook
    }
  };

  const handleClear = () => {
    setContent("");
    setPoll(undefined);
    setShowPollCreator(false);
    selectedImages.forEach((img) => URL.revokeObjectURL(img.previewUrl));
    setSelectedImages([]);
    setUploadedImages([]);
  };

  const handlePollToggle = () => {
    if (showPollCreator) {
      setShowPollCreator(false);
      setPoll(undefined);
    } else {
      setShowPollCreator(true);
    }
  };

  const handlePollClose = () => {
    setShowPollCreator(false);
    setPoll(undefined);
  };

  const handlePollChange = (val: PollPostContentDto | undefined) =>
    setPoll(val);

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    const remainingSlots =
      MAX_IMAGES - selectedImages.length - uploadedImages.length;
    const filesToAdd = Array.from(files).slice(0, remainingSlots);
    const newPreviews: ImagePreview[] = filesToAdd.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setSelectedImages((prev) => [...prev, ...newPreviews]);
    event.target.value = "";
  };

  const handleRemoveSelectedImage = (index: number) => {
    setSelectedImages((prev) => {
      const removed = prev[index];
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleRemoveUploadedImage = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <PostComposerContext.Provider
      value={{
        content,
        setContent,
        kind,
        setKind,
        showPollCreator,
        poll,
        selectedImages,
        uploadedImages,
        isCreating,
        isUploading,
        isPending,
        characterCount,
        isExceeded,
        hasContent,
        canPost,
        totalImages,
        canAddMoreImages,
        handlePost,
        handleClear,
        handlePollToggle,
        handlePollClose,
        handlePollChange,
        handleImageSelect,
        handleRemoveSelectedImage,
        handleRemoveUploadedImage,
      }}
    >
      {children}
    </PostComposerContext.Provider>
  );
}

// ---- PostComposerEditor ----------------------------------------------------

type PostComposerEditorProps = {
  plugins: ComponentProps<typeof MDXEditor>["plugins"];
  placeholder?: string;
  wrapperClassName?: string;
  contentEditableClassName?: string;
};

export const PostComposerEditor = forwardRef<
  MDXEditorMethods,
  PostComposerEditorProps
>(
  (
    {
      plugins,
      placeholder = "What's happening",
      wrapperClassName,
      contentEditableClassName = "post-composer-markdown p-4 outline-none bg-background",
    },
    ref,
  ) => {
    const { content, setContent } = usePostComposerContext();
    const editorRef = useRef<MDXEditorMethods>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => editorRef.current as MDXEditorMethods, []);

    useEffect(() => {
      editorRef.current?.setMarkdown(content);
    }, [content]);

    return (
      <div
        ref={wrapperRef}
        className={`relative rounded-lg mdx-editor-wrapper${wrapperClassName ? ` ${wrapperClassName}` : ""}`}
      >
        <MDXEditor
          placeholder={placeholder}
          ref={editorRef}
          markdown={content}
          onChange={setContent}
          plugins={plugins}
          contentEditableClassName={contentEditableClassName}
        />
        <TagAutocomplete
          text={content}
          anchorRef={wrapperRef}
          onSelect={(tag, replacementLength) => {
            editorRef.current?.replaceTextBeforeCursor(
              replacementLength,
              `${tag} `,
            );
          }}
        />
      </div>
    );
  },
);
PostComposerEditor.displayName = "PostComposerEditor";

// ---- PostComposerPoll ------------------------------------------------------

export function PostComposerPoll() {
  const { showPollCreator, handlePollChange, handlePollClose } =
    usePostComposerContext();
  if (!showPollCreator) return null;
  return (
    <>
      <Separator className="mt-3" />
      <PollCreator onPollChange={handlePollChange} onClose={handlePollClose} />
    </>
  );
}

// ---- PostComposerImageGrid -------------------------------------------------

export function PostComposerImageGrid() {
  const {
    uploadedImages,
    selectedImages,
    isPending,
    isUploading,
    handleRemoveUploadedImage,
    handleRemoveSelectedImage,
  } = usePostComposerContext();

  if (selectedImages.length === 0 && uploadedImages.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-2 mt-3">
      {uploadedImages.map((img, index) => (
        <div key={`uploaded-${img.key}`} className="relative group">
          <img
            src={img.url}
            alt={`Uploaded ${index + 1}`}
            className="object-cover w-full rounded-lg h-32"
          />
          <button
            type="button"
            onClick={() => handleRemoveUploadedImage(index)}
            className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
            disabled={isPending}
          >
            <IconX className="w-4 h-4" />
          </button>
        </div>
      ))}
      {selectedImages.map((img, index) => (
        <div key={`preview-${index}`} className="relative group">
          <img
            src={img.previewUrl}
            alt={`Preview ${index + 1}`}
            className="object-cover w-full rounded-lg h-32"
          />
          <button
            type="button"
            onClick={() => handleRemoveSelectedImage(index)}
            className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
            disabled={isPending}
          >
            <IconX className="w-4 h-4" />
          </button>
          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg">
              <IconLoader2 className="w-6 h-6 text-white animate-spin" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ---- PostComposerCharCounter -----------------------------------------------

export function PostComposerCharCounter() {
  const { characterCount, isExceeded, totalImages } = usePostComposerContext();
  return (
    <div className="flex justify-between items-center px-2 mt-2">
      <div className="text-xs text-muted-foreground">
        {characterCount} characters
        <span className="ml-1">(max {POST_MAX_LENGTH})</span>
        {totalImages > 0 && (
          <span className="ml-2">
            {totalImages}/{MAX_IMAGES} images
          </span>
        )}
      </div>
      {isExceeded && (
        <div className="flex gap-1 items-center text-xs text-destructive">
          <IconAlertCircle className="w-3 h-3" />
          <span>Exceeds character limit</span>
        </div>
      )}
    </div>
  );
}

// ---- PostComposerActions ---------------------------------------------------

export function PostComposerActions() {
  const {
    showPollCreator,
    isPending,
    isCreating,
    isUploading,
    hasContent,
    canPost,
    canAddMoreImages,
    handlePost,
    handleClear,
    handlePollToggle,
    handleImageSelect,
  } = usePostComposerContext();
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex gap-2 justify-between items-center">
      <div className="flex">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="hidden"
          onChange={handleImageSelect}
          disabled={!canAddMoreImages || isPending}
        />
        <Button
          variant="ghost"
          size="icon"
          className="w-9 h-9 text-muted-foreground hover:text-primary hover:bg-primary/10 border-0"
          onClick={() => fileInputRef.current?.click()}
          disabled={!canAddMoreImages || isPending}
          title={
            canAddMoreImages ? "Add images" : `Maximum ${MAX_IMAGES} images`
          }
        >
          <IconPhoto className="w-5 h-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={`w-9 h-9 hover:text-primary hover:bg-primary/10 border-0 ${
            showPollCreator
              ? "text-primary bg-primary/10"
              : "text-muted-foreground"
          }`}
          onClick={handlePollToggle}
          title={showPollCreator ? "Remove poll" : "Add a poll"}
        >
          <IconChartBar className="w-5 h-5" />
        </Button>
      </div>
      <div className="flex gap-2">
        <Button
          variant="ghost"
          className="px-4"
          onClick={handleClear}
          disabled={!hasContent || isPending}
          hidden={!hasContent}
        >
          Clear
        </Button>
        <Button
          className="px-6 font-bold"
          onClick={handlePost}
          disabled={!canPost || isPending}
        >
          {isPending && <IconLoader2 className="mr-2 w-4 h-4 animate-spin" />}
          {isUploading ? "Uploading..." : isCreating ? "Posting..." : "Post"}
        </Button>
      </div>
    </div>
  );
}

// ---- PostComposerKindToggle ------------------------------------------------

/**
 * Q&A primitive: lets the author choose whether the post is a help-seeking
 * "question" (which unlocks the solved / accepted-answer surface) or a regular
 * "discussion".
 */
export function PostComposerKindToggle() {
  const { kind, setKind, isPending } = usePostComposerContext();

  const options: Array<{
    value: PostKindDto;
    label: string;
    icon: typeof IconMessage;
  }> = [
    { value: "discussion", label: "Discussion", icon: IconMessage },
    { value: "question", label: "Question", icon: IconHelpCircle },
  ];

  return (
    <div className="inline-flex gap-1 p-0.5 border bg-muted/40">
      {options.map((option) => {
        const Icon = option.icon;
        const active = kind === option.value;
        return (
          <button
            key={option.value}
            type="button"
            disabled={isPending}
            onClick={() => setKind(option.value)}
            className={`inline-flex gap-1.5 items-center px-3 py-1 text-xs font-medium transition-colors ${
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

// ---- PostComposerCloseButton -----------------------------------------------

export function PostComposerCloseButton() {
  const { handleClear, isPending } = usePostComposerContext();
  return (
    <Button
      variant="ghost"
      size="icon"
      className="w-8 h-8 rounded-full text-muted-foreground hover:text-foreground"
      onClick={() => {
        if (!isPending) handleClear();
      }}
      disabled={isPending}
    >
      <IconX className="w-4 h-4" />
    </Button>
  );
}
