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
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { Button } from "./button";
import { useCreatePost } from "@/hooks/use-create-post";
import { useUploadImages } from "@/hooks/use-upload-images";
import { useSession } from "@/hooks/use-session";
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
import { PollCreator } from "@/components/poll-creator";

const MAX_IMAGES = 4;

interface ImagePreview {
  file: File;
  previewUrl: string;
}

export function PostComposer() {
  const [content, setContent] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [poll, setPoll] = useState<PollPostContentDto | undefined>(undefined);
  const [selectedImages, setSelectedImages] = useState<ImagePreview[]>([]);
  const [uploadedImages, setUploadedImages] = useState<PostImageDto[]>([]);
  const { mutate: createPost, isPending: isCreating } = useCreatePost();
  const { mutateAsync: uploadImages, isPending: isUploading } =
    useUploadImages();
  const { data: session } = useSession();
  const editorRef = useRef(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const characterCount = content.length;
  const maxCharacters = 280;
  const isExceeded = characterCount > maxCharacters;
  const isPending = isCreating || isUploading;

  const userInitial =
    (
      session?.user?.name?.[0] ||
      session?.user?.username?.[0] ||
      session?.user?.email?.[0]
    )?.toUpperCase() || "U";

  const hasContent =
    content.trim() !== "" ||
    poll !== undefined ||
    selectedImages.length > 0 ||
    uploadedImages.length > 0;
  const canPost = hasContent && !isExceeded;

  const handlePost = async () => {
    if (!canPost) {
      return;
    }

    try {
      let images = uploadedImages;

      // Upload any pending images first
      if (selectedImages.length > 0) {
        const files = selectedImages.map((img) => img.file);
        const result = await uploadImages(files);
        images = [...uploadedImages, ...result.images];
      }

      const postContent: PostContentDto = {};

      if (content.trim()) {
        postContent.text = content.trim();
      }

      if (poll) {
        postContent.poll = poll;
      }

      if (images.length > 0) {
        postContent.images = images;
      }

      createPost(postContent, {
        onSuccess: () => {
          setContent("");
          setPoll(undefined);
          setShowPollCreator(false);
          setSelectedImages([]);
          setUploadedImages([]);
          setIsOpen(false);
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
    // Cleanup preview URLs
    selectedImages.forEach((img) => URL.revokeObjectURL(img.previewUrl));
    setSelectedImages([]);
    setUploadedImages([]);
  };

  const handleClose = () => {
    setIsOpen(false);
    if (!isPending) {
      handleClear();
    }
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

    // Reset the input so the same file can be selected again
    event.target.value = "";
  };

  const handleRemoveSelectedImage = (index: number) => {
    setSelectedImages((prev) => {
      const removed = prev[index];
      if (removed) {
        URL.revokeObjectURL(removed.previewUrl);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleRemoveUploadedImage = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const totalImages = selectedImages.length + uploadedImages.length;
  const canAddMoreImages = totalImages < MAX_IMAGES;

  if (!isOpen) {
    // Collapsed state
    return (
      <div className="p-4 border-b cursor-text" onClick={() => setIsOpen(true)}>
        <div className="flex gap-3">
          <Avatar className="flex-shrink-0 w-10 h-10">
            <AvatarImage
              src={session?.user?.image ?? undefined}
              alt={session?.user?.name || undefined}
            />
            <AvatarFallback className="font-semibold bg-primary text-primary-foreground">
              {userInitial}
            </AvatarFallback>
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
            <AvatarImage
              src={session?.user?.image ?? undefined}
              alt={session?.user?.name || undefined}
            />
            <AvatarFallback className="font-semibold bg-primary text-primary-foreground">
              {userInitial}
            </AvatarFallback>
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

              {/* Poll Creator */}
              {showPollCreator && (
                <PollCreator onPollChange={setPoll} onClose={handlePollClose} />
              )}

              {/* Image previews */}
              {(selectedImages.length > 0 || uploadedImages.length > 0) && (
                <div className="grid grid-cols-2 gap-2 mt-3">
                  {/* Uploaded images */}
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
                  {/* Pending images */}
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
              )}

              {/* Character counter */}
              <div className="flex justify-between items-center px-2 mt-2">
                <div className="text-xs text-muted-foreground">
                  {characterCount} characters
                  {maxCharacters && (
                    <span className="ml-1">(max {maxCharacters})</span>
                  )}
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
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 justify-between items-center">
              <div className="flex gap-1">
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
                  className="w-9 h-9 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!canAddMoreImages || isPending}
                  title={
                    canAddMoreImages
                      ? "Add images"
                      : `Maximum ${MAX_IMAGES} images`
                  }
                >
                  <IconPhoto className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`w-9 h-9 rounded-full hover:text-primary hover:bg-primary/10 ${
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
                  variant="outline"
                  className="px-4 rounded-full"
                  onClick={handleClear}
                  disabled={!hasContent || isPending}
                >
                  Clear
                </Button>
                <Button
                  className="px-6 font-bold rounded-full"
                  onClick={handlePost}
                  disabled={!canPost || isPending}
                >
                  {isPending && (
                    <IconLoader2 className="mr-2 w-4 h-4 animate-spin" />
                  )}
                  {isUploading
                    ? "Uploading..."
                    : isCreating
                      ? "Posting..."
                      : "Post"}
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
