import { createContext, useContext, type ChangeEvent } from "react";
import type {
  PollPostContentDto,
  PostDto,
  PostImageDto,
  PostKindDto,
} from "@repo/shared-dto";

export interface ImagePreview {
  file: File;
  previewUrl: string;
}

export interface PostComposerContextValue {
  content: string;
  setContent: (val: string) => void;
  /** Q&A primitive: whether the composed post is a question or a discussion. */
  kind: PostKindDto;
  setKind: (val: PostKindDto) => void;
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
  handlePost: () => Promise<PostDto | void>;
  handleClear: () => void;
  handlePollToggle: () => void;
  handlePollClose: () => void;
  handlePollChange: (poll: PollPostContentDto | undefined) => void;
  handleImageSelect: (event: ChangeEvent<HTMLInputElement>) => void;
  handleRemoveSelectedImage: (index: number) => void;
  handleRemoveUploadedImage: (index: number) => void;
}

export const PostComposerContext =
  createContext<PostComposerContextValue | null>(null);

export function usePostComposerContext(): PostComposerContextValue {
  const ctx = useContext(PostComposerContext);
  if (!ctx)
    throw new Error(
      "usePostComposerContext must be used inside PostComposerProvider",
    );
  return ctx;
}
