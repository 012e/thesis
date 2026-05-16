import {
  createContext,
  useContext,
  useEffect,
  useImperativeHandle,
  useRef,
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
  PollPostContentDto,
  PostImageDto,
} from "@repo/shared-dto";
import {
  IconAlertCircle,
  IconLoader2,
  IconPhoto,
  IconX,
  IconChartBar,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { PollCreator } from "@/components/poll-creator";
import { useCreatePost } from "@/hooks/use-create-post";
import { useUploadImages } from "@/hooks/use-upload-images";
import { POST_MAX_LENGTH } from "@/lib/constants";

// ---- Types -----------------------------------------------------------------

export interface ImagePreview {
  file: File;
  previewUrl: string;
}

export const MAX_IMAGES = 4;

// ---- Context ---------------------------------------------------------------

interface PostComposerContextValue {
  content: string;
  setContent: (val: string) => void;
  showPollCreator: boolean;
  poll: PollPostContentDto | undefined;
  selectedImages: ImagePreview[];
  uploadedImages: PostImageDto[];
  isCreating: boolean;
  isUploading: boolean;
  isPending: boolean;
  characterCount: number;
  isExceeded: boolean;
  hasContent: boolean;
  canPost: boolean;
  totalImages: number;
  canAddMoreImages: boolean;
  handlePost: () => Promise<void>;
  handleClear: () => void;
  handlePollToggle: () => void;
  handlePollClose: () => void;
  handlePollChange: (poll: PollPostContentDto | undefined) => void;
  handleImageSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleRemoveSelectedImage: (index: number) => void;
  handleRemoveUploadedImage: (index: number) => void;
}

const PostComposerContext = createContext<PostComposerContextValue | null>(
  null,
);

export function usePostComposerContext(): PostComposerContextValue {
  const ctx = useContext(PostComposerContext);
  if (!ctx)
    throw new Error(
      "usePostComposerContext must be used inside PostComposerProvider",
    );
  return ctx;
}

// ---- Provider --------------------------------------------------------------

export interface PostComposerProviderProps {
  content: string;
  setContent: (val: string) => void;
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
  const { mutate: createPost, isPending: isCreating } = useCreatePost();
  const { mutateAsync: uploadImages, isPending: isUploading } =
    useUploadImages();

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

  const handlePost = async () => {
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
      createPost(postContent, {
        onSuccess: () => {
          setContent("");
          setPoll(undefined);
          setShowPollCreator(false);
          setSelectedImages([]);
          setUploadedImages([]);
        },
      });
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

    useImperativeHandle(ref, () => editorRef.current as MDXEditorMethods, []);

    useEffect(() => {
      editorRef.current?.setMarkdown(content);
    }, [content]);

    return (
      <div
        className={`rounded-lg mdx-editor-wrapper${wrapperClassName ? ` ${wrapperClassName}` : ""}`}
      >
        <MDXEditor
          placeholder={placeholder}
          ref={editorRef}
          markdown={content}
          onChange={setContent}
          plugins={plugins}
          contentEditableClassName={contentEditableClassName}
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
    <PollCreator onPollChange={handlePollChange} onClose={handlePollClose} />
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
