import { afterEach, describe, expect, it, vi, type Mock } from "vitest";
import React, { forwardRef, useImperativeHandle, useState } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { PollPostContentDto, PostImageDto } from "@repo/shared-dto";
import {
  PostComposerActions,
  PostComposerCharCounter,
  PostComposerEditor,
  PostComposerProvider,
  type ImagePreview,
} from ".";

vi.mock("@repo/mdx-editor/style.css", () => ({}));

vi.mock("@repo/mdx-editor", () => ({
  MDXEditor: forwardRef<
    { setMarkdown: (markdown: string) => void },
    {
      markdown: string;
      onChange: (markdown: string) => void;
      placeholder?: string;
    }
  >(function MockMDXEditor({ markdown, onChange, placeholder }, ref) {
    const [value, setValue] = useState(markdown);

    useImperativeHandle(ref, () => ({
      setMarkdown: setValue,
    }));

    return (
      <textarea
        aria-label="composer editor"
        placeholder={placeholder}
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          onChange(event.target.value);
        }}
      />
    );
  }),
}));

vi.mock("@/hooks/use-create-post", () => ({
  useCreatePost: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
}));

vi.mock("@/hooks/use-upload-images", () => ({
  useUploadImages: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function TestComposer({
  initialContent = "",
  onSubmitContent,
}: {
  initialContent?: string;
  onSubmitContent?: Mock;
}) {
  const [content, setContent] = useState(initialContent);
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [poll, setPoll] = useState<PollPostContentDto | undefined>();
  const [selectedImages, setSelectedImages] = useState<ImagePreview[]>([]);
  const [uploadedImages, setUploadedImages] = useState<PostImageDto[]>([]);

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
      onSubmitContent={onSubmitContent}
    >
      <PostComposerEditor plugins={[]} />
      <PostComposerCharCounter />
      <PostComposerActions />
    </PostComposerProvider>
  );
}

function renderComposer(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe("PostComposer", () => {
  it("updates derived composer state when the editor changes", async () => {
    const user = userEvent.setup();

    renderComposer(<TestComposer />);

    await user.type(screen.getByLabelText("composer editor"), "Hello");

    expect(screen.getByText("5 characters")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Clear" })).toBeTruthy();
    expect(
      screen.getByRole<HTMLButtonElement>("button", { name: "Post" }).disabled,
    ).toBe(false);
  });

  it("clears both provider state and the mounted editor value", async () => {
    const user = userEvent.setup();

    renderComposer(<TestComposer initialContent="Draft text" />);

    expect(
      screen.getByLabelText<HTMLTextAreaElement>("composer editor").value,
    ).toBe("Draft text");

    await user.click(screen.getByRole("button", { name: "Clear" }));

    expect(
      screen.getByLabelText<HTMLTextAreaElement>("composer editor").value,
    ).toBe("");
    expect(screen.getByText("0 characters")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Clear" })).toBeNull();
  });

  it("submits trimmed content and clears the mounted editor value", async () => {
    const user = userEvent.setup();
    const onSubmitContent = vi.fn().mockResolvedValue(undefined);

    renderComposer(
      <TestComposer
        initialContent="  Post this  "
        onSubmitContent={onSubmitContent}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Post" }));

    expect(onSubmitContent).toHaveBeenCalledWith("Post this");
    expect(
      screen.getByLabelText<HTMLTextAreaElement>("composer editor").value,
    ).toBe("");
    expect(screen.getByText("0 characters")).toBeTruthy();
  });
});
