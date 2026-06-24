import { useEffect, useMemo, useRef, useState } from "react";
import {
  makeAssistantToolUI,
  useAssistantInstructions,
  useAssistantTool,
} from "@assistant-ui/react";
import {
  IconArrowRight,
  IconCamera,
  IconCheck,
  IconHash,
  IconLoader2,
  IconPhoto,
  IconPlus,
  IconRocket,
  IconSparkles,
  IconUserCircle,
  IconX,
} from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ONBOARDING_TOOL_NAMES,
  ChooseExperienceInputSchema,
  FinishOnboardingInputSchema,
  PickContentTypesInputSchema,
  PickProfileMediaInputSchema,
  SuggestBioInputSchema,
  SuggestTagsInputSchema,
  awaitOnboardingResponse,
  resolveOnboardingResponse,
  type ChoiceOption,
  type OnboardingResult,
} from "@/lib/assistant/onboarding-tools";
import { setMyTagPreference } from "@/lib/api/tags";
import { uploadImages } from "@/lib/api/uploads";
import { updateAvatar, updateCoverPhoto, updateUserProfile } from "@/lib/api/users";
import { cn } from "@/lib/utils";

// ── Loose arg readers (args may stream in / be partial) ─────────────────────

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function readOptions(value: unknown): ChoiceOption[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!isRecord(item)) return [];
    const optValue = readString(item.value);
    const label = readString(item.label);
    if (!optValue || !label) return [];
    return [
      {
        value: optValue,
        label,
        description: readString(item.description) ?? null,
      },
    ];
  });
}

function readSuggestions(
  value: unknown,
): { tag: string; reason?: string | null }[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!isRecord(item)) return [];
    const tag = readString(item.tag);
    if (!tag) return [];
    return [{ tag, reason: readString(item.reason) ?? null }];
  });
}

// ── Shared card chrome ──────────────────────────────────────────────────────

function CardShell({
  icon: Icon,
  title,
  message,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  message?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-label={title}
      className="w-full max-w-xl border border-border bg-background"
    >
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <Icon className="size-4 shrink-0 text-primary" />
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      <div className="space-y-3 px-4 py-4">
        {message ? (
          <p className="text-sm text-muted-foreground">{message}</p>
        ) : null}
        {children}
      </div>
    </section>
  );
}

function SkipButton({ onSkip }: { onSkip: () => void }) {
  return (
    <button
      type="button"
      onClick={onSkip}
      className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
    >
      Skip this step
    </button>
  );
}

/** Read-only confirmation shown once a card has been answered or skipped. */
function AnsweredSummary({
  icon: Icon,
  result,
}: {
  icon: React.ComponentType<{ className?: string }>;
  result: OnboardingResult | undefined;
}) {
  let detail = "Saved";
  if (result?.status === "skipped") detail = "Skipped";
  else if (result?.status === "completed") detail = "Onboarding complete";
  else if (result && "value" in result) detail = result.value;
  else if (result && "values" in result) detail = result.values.join(", ");
  else if (result && "tags" in result)
    detail = result.tags.map((t) => `#${t}`).join("  ");
  else if (result && "bio" in result) detail = result.bio;
  else if (result && "avatarUrl" in result) {
    const parts = [
      result.avatarUrl ? "Profile picture" : null,
      result.coverPhotoUrl ? "Cover picture" : null,
    ].filter(Boolean);
    detail = parts.length > 0 ? `${parts.join(" and ")} set` : "Saved";
  }

  return (
    <div className="flex w-full items-start gap-2 border border-border bg-muted/40 px-4 py-3 text-sm">
      <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
      <span className="min-w-0 break-words text-muted-foreground">
        {detail}
      </span>
    </div>
  );
}

function OptionCard({
  option,
  selected,
  multi,
  onToggle,
}: {
  option: ChoiceOption;
  selected: boolean;
  multi: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onToggle}
      className={cn(
        "flex w-full items-start gap-3 border px-3 py-2.5 text-left transition-colors",
        selected
          ? "border-primary bg-primary/10"
          : "border-border hover:bg-accent",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex size-4 shrink-0 items-center justify-center border",
          multi ? "" : "rounded-full",
          selected
            ? "border-primary bg-primary text-primary-foreground"
            : "border-muted-foreground/50",
        )}
      >
        {selected ? <IconCheck className="size-3" /> : null}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-foreground">
          {option.label}
        </span>
        {option.description ? (
          <span className="mt-0.5 block text-xs text-muted-foreground">
            {option.description}
          </span>
        ) : null}
      </span>
    </button>
  );
}

// ── 1. choose_experience (single choice) ────────────────────────────────────

function ChooseExperienceCard({
  toolCallId,
  args,
}: {
  toolCallId: string;
  args: unknown;
}) {
  const message = isRecord(args) ? readString(args.message) : undefined;
  const options = isRecord(args) ? readOptions(args.options) : [];
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <CardShell icon={IconUserCircle} title="Your experience" message={message}>
      <div className="grid gap-2">
        {options.map((option) => (
          <OptionCard
            key={option.value}
            option={option}
            multi={false}
            selected={selected === option.value}
            onToggle={() => setSelected(option.value)}
          />
        ))}
      </div>
      <div className="flex items-center justify-between gap-3 pt-1">
        <SkipButton
          onSkip={() =>
            resolveOnboardingResponse(toolCallId, { status: "skipped" })
          }
        />
        <Button
          type="button"
          size="sm"
          disabled={!selected}
          onClick={() =>
            selected &&
            resolveOnboardingResponse(toolCallId, {
              status: "submitted",
              value: selected,
            })
          }
        >
          <IconCheck className="size-4" />
          Continue
        </Button>
      </div>
    </CardShell>
  );
}

// ── 2. pick_content_types (multiple choice) ─────────────────────────────────

function PickContentTypesCard({
  toolCallId,
  args,
}: {
  toolCallId: string;
  args: unknown;
}) {
  const message = isRecord(args) ? readString(args.message) : undefined;
  const options = isRecord(args) ? readOptions(args.options) : [];
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (value: string) =>
    setSelected((current) =>
      current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value],
    );

  return (
    <CardShell
      icon={IconSparkles}
      title="What you want to see"
      message={message}
    >
      <div className="grid gap-2">
        {options.map((option) => (
          <OptionCard
            key={option.value}
            option={option}
            multi
            selected={selected.includes(option.value)}
            onToggle={() => toggle(option.value)}
          />
        ))}
      </div>
      <div className="flex items-center justify-between gap-3 pt-1">
        <SkipButton
          onSkip={() =>
            resolveOnboardingResponse(toolCallId, { status: "skipped" })
          }
        />
        <Button
          type="button"
          size="sm"
          disabled={selected.length === 0}
          onClick={() =>
            resolveOnboardingResponse(toolCallId, {
              status: "submitted",
              values: selected,
            })
          }
        >
          <IconCheck className="size-4" />
          Continue
        </Button>
      </div>
    </CardShell>
  );
}

// ── 3. suggest_tags (toggle suggestions + add your own) ──────────────────────

function SuggestTagsCard({
  toolCallId,
  args,
}: {
  toolCallId: string;
  args: unknown;
}) {
  const message = isRecord(args) ? readString(args.message) : undefined;
  const suggestions = isRecord(args) ? readSuggestions(args.suggestions) : [];

  // Suggested tags start selected (the agent curated them). User edits are
  // tracked explicitly so streaming args don't clobber their choices.
  const [deselected, setDeselected] = useState<Set<string>>(new Set());
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [draftTag, setDraftTag] = useState("");

  const toggleSuggestion = (tag: string) =>
    setDeselected((current) => {
      const next = new Set(current);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });

  const addCustomTag = () => {
    const tag = draftTag.trim().toLowerCase().replace(/\s+/g, "-");
    if (!tag) return;
    setDraftTag("");
    setCustomTags((current) =>
      current.includes(tag) ||
      suggestions.some((suggestion) => suggestion.tag === tag)
        ? current
        : [...current, tag],
    );
  };

  const selectedTags = [
    ...suggestions
      .filter((suggestion) => !deselected.has(suggestion.tag))
      .map((suggestion) => suggestion.tag),
    ...customTags,
  ];

  return (
    <CardShell icon={IconHash} title="Topics for your feed" message={message}>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion) => {
          const selected = !deselected.has(suggestion.tag);
          return (
            <button
              key={suggestion.tag}
              type="button"
              aria-pressed={selected}
              title={suggestion.reason ?? undefined}
              onClick={() => toggleSuggestion(suggestion.tag)}
              className={cn(
                "inline-flex items-center gap-1 border px-2.5 py-1 text-xs font-medium transition-colors",
                selected
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border text-muted-foreground hover:bg-accent",
              )}
            >
              <IconHash className="size-3" />
              {suggestion.tag}
              {selected ? <IconCheck className="size-3 text-primary" /> : null}
            </button>
          );
        })}
        {customTags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 border border-primary bg-primary/10 px-2.5 py-1 text-xs font-medium text-foreground"
          >
            <IconHash className="size-3" />
            {tag}
            <button
              type="button"
              aria-label={`Remove ${tag}`}
              onClick={() =>
                setCustomTags((current) => current.filter((t) => t !== tag))
              }
              className="text-muted-foreground hover:text-foreground"
            >
              <IconX className="size-3" />
            </button>
          </span>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Input
          value={draftTag}
          placeholder="Add your own tag…"
          onChange={(event) => setDraftTag(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addCustomTag();
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addCustomTag}
          disabled={!draftTag.trim()}
        >
          <IconPlus className="size-4" />
          Add
        </Button>
      </div>

      <div className="flex items-center justify-between gap-3 pt-1">
        <SkipButton
          onSkip={() =>
            resolveOnboardingResponse(toolCallId, { status: "skipped" })
          }
        />
        <Button
          type="button"
          size="sm"
          disabled={selectedTags.length === 0}
          onClick={() =>
            resolveOnboardingResponse(toolCallId, {
              status: "submitted",
              tags: selectedTags,
            })
          }
        >
          <IconCheck className="size-4" />
          Save {selectedTags.length} tag{selectedTags.length === 1 ? "" : "s"}
        </Button>
      </div>
    </CardShell>
  );
}

// ── 4. suggest_bio (editable draft) ──────────────────────────────────────────

function SuggestBioCard({
  toolCallId,
  args,
}: {
  toolCallId: string;
  args: unknown;
}) {
  const message = isRecord(args) ? readString(args.message) : undefined;
  const draft = (isRecord(args) ? readString(args.draft) : undefined) ?? "";
  // `null` means "still mirroring the streamed draft"; a string means the user
  // has taken over editing.
  const [edited, setEdited] = useState<string | null>(null);
  const value = edited ?? draft;

  return (
    <CardShell icon={IconUserCircle} title="Your bio" message={message}>
      <Textarea
        aria-label="Bio"
        rows={4}
        value={value}
        onChange={(event) => setEdited(event.target.value)}
      />
      <div className="flex items-center justify-between gap-3 pt-1">
        <SkipButton
          onSkip={() =>
            resolveOnboardingResponse(toolCallId, { status: "skipped" })
          }
        />
        <Button
          type="button"
          size="sm"
          disabled={!value.trim()}
          onClick={() =>
            resolveOnboardingResponse(toolCallId, {
              status: "submitted",
              bio: value.trim(),
            })
          }
        >
          <IconCheck className="size-4" />
          Save bio
        </Button>
      </div>
    </CardShell>
  );
}

// ── 5. pick_profile_media (avatar + cover upload) ────────────────────────────

type MediaSlotState = {
  url: string | null;
  isUploading: boolean;
  error: string | null;
};

const EMPTY_SLOT: MediaSlotState = {
  url: null,
  isUploading: false,
  error: null,
};

function PickProfileMediaCard({
  toolCallId,
  args,
}: {
  toolCallId: string;
  args: unknown;
}) {
  const message = isRecord(args) ? readString(args.message) : undefined;

  const [avatar, setAvatar] = useState<MediaSlotState>(EMPTY_SLOT);
  const [cover, setCover] = useState<MediaSlotState>(EMPTY_SLOT);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const handlePick = async (
    file: File | undefined,
    setSlot: React.Dispatch<React.SetStateAction<MediaSlotState>>,
  ) => {
    if (!file) return;

    setSlot((current) => ({ ...current, isUploading: true, error: null }));
    try {
      const result = await uploadImages([file]);
      const uploaded = result.images[0];
      if (!uploaded) throw new Error("Upload returned no image");
      setSlot({ url: uploaded.url, isUploading: false, error: null });
    } catch (err) {
      setSlot({
        url: null,
        isUploading: false,
        error:
          err instanceof Error ? err.message : "Upload failed. Try again.",
      });
    }
  };

  const isUploading = avatar.isUploading || cover.isUploading;
  const hasSelection = Boolean(avatar.url) || Boolean(cover.url);

  return (
    <CardShell
      icon={IconCamera}
      title="Your profile pictures"
      message={message}
    >
      {/* Cover + avatar preview */}
      <div className="relative">
        <button
          type="button"
          onClick={() => coverInputRef.current?.click()}
          disabled={isUploading}
          aria-label="Choose a cover picture"
          className="group relative flex h-32 w-full items-center justify-center overflow-hidden border border-border bg-muted/40 transition-colors hover:bg-accent disabled:cursor-not-allowed"
        >
          {cover.url ? (
            <img
              src={cover.url}
              alt="Cover preview"
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="flex flex-col items-center gap-1 text-xs text-muted-foreground">
              <IconPhoto className="size-6" />
              Add a cover picture
            </span>
          )}
          {cover.isUploading ? (
            <span className="absolute inset-0 flex items-center justify-center bg-black/40">
              <IconLoader2 className="size-6 animate-spin text-white" />
            </span>
          ) : (
            <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              <IconCamera className="size-6 text-white" />
            </span>
          )}
        </button>

        {/* Avatar overlaps the bottom-left of the cover */}
        <button
          type="button"
          onClick={() => avatarInputRef.current?.click()}
          disabled={isUploading}
          aria-label="Choose a profile picture"
          className="group absolute -bottom-5 left-4 cursor-pointer disabled:cursor-not-allowed"
        >
          <Avatar className="size-20 border-4 border-background">
            <AvatarImage src={avatar.url ?? undefined} alt="Profile preview" />
            <AvatarFallback className="bg-muted">
              <IconUserCircle className="size-8 text-muted-foreground" />
            </AvatarFallback>
          </Avatar>
          {avatar.isUploading ? (
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
              <IconLoader2 className="size-5 animate-spin text-white" />
            </span>
          ) : (
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              <IconCamera className="size-5 text-white" />
            </span>
          )}
        </button>
      </div>

      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          void handlePick(event.target.files?.[0], setAvatar);
          event.target.value = "";
        }}
      />
      <input
        ref={coverInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          void handlePick(event.target.files?.[0], setCover);
          event.target.value = "";
        }}
      />

      <div className="pt-5">
        {(avatar.error || cover.error) && (
          <p className="text-xs text-red-500">{avatar.error ?? cover.error}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Tap the circle for your profile picture and the banner for your cover.
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 pt-1">
        <SkipButton
          onSkip={() =>
            resolveOnboardingResponse(toolCallId, { status: "skipped" })
          }
        />
        <Button
          type="button"
          size="sm"
          disabled={isUploading || !hasSelection}
          onClick={() =>
            resolveOnboardingResponse(toolCallId, {
              status: "submitted",
              avatarUrl: avatar.url,
              coverPhotoUrl: cover.url,
            })
          }
        >
          <IconCheck className="size-4" />
          Save pictures
        </Button>
      </div>
    </CardShell>
  );
}

// ── 6. finish_onboarding (countdown → navigate) ───────────────────────────────

function FinishOnboardingCard({
  toolCallId,
  args,
}: {
  toolCallId: string;
  args: unknown;
}) {
  const navigate = useNavigate();
  const message = isRecord(args) ? readString(args.message) : undefined;
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (countdown <= 0) {
      resolveOnboardingResponse(toolCallId, { status: "completed" });
      void navigate({ to: "/" });
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, navigate, toolCallId]);

  const handleGoNow = () => {
    resolveOnboardingResponse(toolCallId, { status: "completed" });
    void navigate({ to: "/" });
  };

  return (
    <CardShell icon={IconRocket} title="You're all set!" message={message}>
      <div className="flex flex-col items-center gap-3 py-2">
        <div className="flex size-14 items-center justify-center border border-primary bg-primary/10">
          <span className="font-mono text-3xl font-bold tabular-nums text-primary">
            {countdown}
          </span>
        </div>
        <p className="text-center text-sm text-muted-foreground">
          Taking you to your feed…
        </p>
      </div>
      <div className="flex justify-end pt-1">
        <Button type="button" size="sm" onClick={handleGoNow}>
          <IconArrowRight className="size-4" />
          Go now
        </Button>
      </div>
    </CardShell>
  );
}

// ── Tool UI registrations ────────────────────────────────────────────────────

function asResult(result: unknown): OnboardingResult | undefined {
  return isRecord(result) && typeof result.status === "string"
    ? (result as OnboardingResult)
    : undefined;
}

const ChooseExperienceToolUI = makeAssistantToolUI({
  toolName: ONBOARDING_TOOL_NAMES.chooseExperience,
  render: ({ args, status, toolCallId, result }) =>
    status.type === "running" ? (
      <ChooseExperienceCard toolCallId={toolCallId} args={args} />
    ) : (
      <AnsweredSummary icon={IconUserCircle} result={asResult(result)} />
    ),
});

const PickContentTypesToolUI = makeAssistantToolUI({
  toolName: ONBOARDING_TOOL_NAMES.pickContentTypes,
  render: ({ args, status, toolCallId, result }) =>
    status.type === "running" ? (
      <PickContentTypesCard toolCallId={toolCallId} args={args} />
    ) : (
      <AnsweredSummary icon={IconSparkles} result={asResult(result)} />
    ),
});

const SuggestTagsToolUI = makeAssistantToolUI({
  toolName: ONBOARDING_TOOL_NAMES.suggestTags,
  render: ({ args, status, toolCallId, result }) =>
    status.type === "running" ? (
      <SuggestTagsCard toolCallId={toolCallId} args={args} />
    ) : (
      <AnsweredSummary icon={IconHash} result={asResult(result)} />
    ),
});

const SuggestBioToolUI = makeAssistantToolUI({
  toolName: ONBOARDING_TOOL_NAMES.suggestBio,
  render: ({ args, status, toolCallId, result }) =>
    status.type === "running" ? (
      <SuggestBioCard toolCallId={toolCallId} args={args} />
    ) : (
      <AnsweredSummary icon={IconUserCircle} result={asResult(result)} />
    ),
});

const PickProfileMediaToolUI = makeAssistantToolUI({
  toolName: ONBOARDING_TOOL_NAMES.pickProfileMedia,
  render: ({ args, status, toolCallId, result }) =>
    status.type === "running" ? (
      <PickProfileMediaCard toolCallId={toolCallId} args={args} />
    ) : (
      <AnsweredSummary icon={IconCamera} result={asResult(result)} />
    ),
});

const FinishOnboardingToolUI = makeAssistantToolUI({
  toolName: ONBOARDING_TOOL_NAMES.finishOnboarding,
  render: ({ args, status, toolCallId, result }) =>
    status.type === "running" ? (
      <FinishOnboardingCard toolCallId={toolCallId} args={args} />
    ) : (
      <AnsweredSummary icon={IconRocket} result={asResult(result)} />
    ),
});

/**
 * Registers the onboarding client tools and their tailored UIs. Mount once
 * inside the onboarding AssistantRuntimeProvider.
 */
export function OnboardingAssistantTools() {
  useAssistantInstructions(
    "You are running the onboarding preference setup. Ask one question at a time using the dedicated tools (choose_experience, pick_content_types, suggest_tags, suggest_bio, pick_profile_media) and wait for each result before continuing. When all steps are done, call finish_onboarding.",
  );

  const chooseExperience = useMemo(
    () => ({
      toolName: ONBOARDING_TOOL_NAMES.chooseExperience,
      description:
        "Ask the user to pick how they'd describe themselves (single choice). Renders selectable cards.",
      parameters: ChooseExperienceInputSchema,
      execute: (
        _input: unknown,
        context: { abortSignal?: AbortSignal; toolCallId: string },
      ) => awaitOnboardingResponse(context.toolCallId, context.abortSignal),
    }),
    [],
  );

  const pickContentTypes = useMemo(
    () => ({
      toolName: ONBOARDING_TOOL_NAMES.pickContentTypes,
      description:
        "Ask the user which content types they want to see (multiple choice). Renders multi-select cards.",
      parameters: PickContentTypesInputSchema,
      execute: async (
        _input: unknown,
        context: { abortSignal?: AbortSignal; toolCallId: string },
      ) => {
        const result = await awaitOnboardingResponse(
          context.toolCallId,
          context.abortSignal,
        );
        if (result.status === "submitted" && "values" in result) {
          await Promise.allSettled(
            result.values.map((slug) =>
              setMyTagPreference({ slug, preference: "preferred" }),
            ),
          );
        }
        return result;
      },
    }),
    [],
  );

  const suggestTags = useMemo(
    () => ({
      toolName: ONBOARDING_TOOL_NAMES.suggestTags,
      description:
        "Suggest personalised topic tags the user can toggle and extend. Renders a chip picker with a custom-tag input.",
      parameters: SuggestTagsInputSchema,
      execute: async (
        _input: unknown,
        context: { abortSignal?: AbortSignal; toolCallId: string },
      ) => {
        const result = await awaitOnboardingResponse(
          context.toolCallId,
          context.abortSignal,
        );
        if (result.status === "submitted" && "tags" in result) {
          await Promise.allSettled(
            result.tags.map((slug) =>
              setMyTagPreference({ slug, preference: "preferred" }),
            ),
          );
        }
        return result;
      },
    }),
    [],
  );

  const suggestBio = useMemo(
    () => ({
      toolName: ONBOARDING_TOOL_NAMES.suggestBio,
      description:
        "Offer a first-person bio draft the user can edit before saving. Renders an editable text card.",
      parameters: SuggestBioInputSchema,
      execute: async (
        _input: unknown,
        context: { abortSignal?: AbortSignal; toolCallId: string },
      ) => {
        const result = await awaitOnboardingResponse(
          context.toolCallId,
          context.abortSignal,
        );
        if (result.status === "submitted" && "bio" in result) {
          await updateUserProfile({ bio: result.bio });
        }
        return result;
      },
    }),
    [],
  );

  const pickProfileMedia = useMemo(
    () => ({
      toolName: ONBOARDING_TOOL_NAMES.pickProfileMedia,
      description:
        "Invite the user to pick a profile picture and a cover picture. Renders an interactive card with avatar and cover upload slots.",
      parameters: PickProfileMediaInputSchema,
      execute: async (
        _input: unknown,
        context: { abortSignal?: AbortSignal; toolCallId: string },
      ) => {
        const result = await awaitOnboardingResponse(
          context.toolCallId,
          context.abortSignal,
        );
        if (result.status === "submitted" && "avatarUrl" in result) {
          const updates: Promise<unknown>[] = [];
          if (result.avatarUrl) updates.push(updateAvatar(result.avatarUrl));
          if (result.coverPhotoUrl)
            updates.push(updateCoverPhoto(result.coverPhotoUrl));
          await Promise.allSettled(updates);
        }
        return result;
      },
    }),
    [],
  );

  const finishOnboarding = useMemo(
    () => ({
      toolName: ONBOARDING_TOOL_NAMES.finishOnboarding,
      description:
        "Signal that onboarding is complete. Shows a 5-second countdown card, then navigates the user to the home feed.",
      parameters: FinishOnboardingInputSchema,
      execute: (
        _input: unknown,
        context: { abortSignal?: AbortSignal; toolCallId: string },
      ) => awaitOnboardingResponse(context.toolCallId, context.abortSignal),
    }),
    [],
  );

  useAssistantTool(chooseExperience);
  useAssistantTool(pickContentTypes);
  useAssistantTool(suggestTags);
  useAssistantTool(suggestBio);
  useAssistantTool(pickProfileMedia);
  useAssistantTool(finishOnboarding);

  return (
    <>
      <ChooseExperienceToolUI />
      <PickContentTypesToolUI />
      <SuggestTagsToolUI />
      <SuggestBioToolUI />
      <PickProfileMediaToolUI />
      <FinishOnboardingToolUI />
    </>
  );
}
