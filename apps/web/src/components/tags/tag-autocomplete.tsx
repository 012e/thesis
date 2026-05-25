import { useState, useEffect, useLayoutEffect, useCallback } from "react";
import type { RefObject } from "react";
import { IconHash } from "@tabler/icons-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useTagSuggestions } from "@/hooks/use-tag-suggestions";
import { cn } from "@/lib/utils";

interface TagAutocompleteProps {
  /** Current text content from the editor */
  text: string;
  /** Current cursor position (character index) */
  cursorPosition?: number;
  /** Called when a tag is selected — provides the full tag text to insert */
  onSelect: (tag: string, replacementLength: number) => void;
  /** Anchor element for positioning */
  anchorRef?: RefObject<HTMLElement | null>;
}

function getHashtagQuery(text: string, cursorPosition?: number): string | null {
  const pos = cursorPosition ?? text.length;
  const before = text.slice(0, pos);
  // Find the last # that starts a tag
  const match = before.match(
    /(?:^|[\s.,!?;:'"()\[\]{}<>\/\\|@~`^&*+=\-])#([A-Za-z]\w{0,49})$/,
  );
  if (match) return match[1];
  // Also handle # at start of text
  const startMatch = before.match(/^#([A-Za-z]\w{0,49})$/);
  if (startMatch) return startMatch[1];
  return null;
}

function getSelectionRect(anchor: HTMLElement): DOMRect | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;

  const focusNode = selection.focusNode;
  if (!focusNode || !anchor.contains(focusNode)) return null;

  const range = selection.getRangeAt(0).cloneRange();
  range.collapse(false);

  const rect = range.getBoundingClientRect();
  if (rect.width > 0 || rect.height > 0) return rect;

  const clientRect = range.getClientRects().item(0);
  if (clientRect) return clientRect;

  const focusElement =
    focusNode.nodeType === Node.ELEMENT_NODE
      ? focusNode
      : focusNode.parentElement;

  return focusElement instanceof Element
    ? focusElement.getBoundingClientRect()
    : null;
}

function getCaretAnchorPoint(anchor: HTMLElement) {
  const selectionRect = getSelectionRect(anchor);
  if (!selectionRect) return null;

  const anchorRect = anchor.getBoundingClientRect();
  const x = selectionRect.left - anchorRect.left;
  const y = selectionRect.bottom - anchorRect.top;

  return {
    x: Math.max(0, Math.min(x, anchorRect.width)),
    y: Math.max(0, Math.min(y, anchorRect.height)),
  };
}

export function TagAutocomplete({
  text,
  cursorPosition,
  onSelect,
  anchorRef,
}: TagAutocompleteProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [anchorPoint, setAnchorPoint] = useState({ x: 0, y: 0 });
  const query = getHashtagQuery(text, cursorPosition);
  const { data } = useTagSuggestions(query ?? "", 5);

  const suggestions = data?.items ?? [];
  const isOpen = query !== null && suggestions.length > 0;

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleSelect = useCallback(
    (tag: { slug: string; displayName: string }) => {
      onSelect(`#${tag.displayName}`, (query?.length ?? 0) + 1);
    },
    [onSelect, query],
  );

  const updateAnchorPoint = useCallback(() => {
    const anchor = anchorRef?.current;
    if (!anchor) return;

    const point = getCaretAnchorPoint(anchor);
    if (!point) return;

    setAnchorPoint((current) =>
      current.x === point.x && current.y === point.y ? current : point,
    );
  }, [anchorRef]);

  useLayoutEffect(() => {
    if (!isOpen) return;

    updateAnchorPoint();
    const frame = window.requestAnimationFrame(updateAnchorPoint);

    return () => window.cancelAnimationFrame(frame);
  }, [isOpen, text, cursorPosition, updateAnchorPoint]);

  useEffect(() => {
    if (!isOpen) return;

    document.addEventListener("selectionchange", updateAnchorPoint);
    window.addEventListener("resize", updateAnchorPoint);
    window.addEventListener("scroll", updateAnchorPoint, true);

    return () => {
      document.removeEventListener("selectionchange", updateAnchorPoint);
      window.removeEventListener("resize", updateAnchorPoint);
      window.removeEventListener("scroll", updateAnchorPoint, true);
    };
  }, [isOpen, updateAnchorPoint]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        if (suggestions[selectedIndex]) {
          handleSelect(suggestions[selectedIndex]);
        }
      } else if (e.key === "Escape") {
        // Let it close naturally by the query becoming null
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [isOpen, suggestions, selectedIndex, handleSelect]);

  return (
    <Popover open={isOpen}>
      <PopoverTrigger
        aria-hidden="true"
        tabIndex={-1}
        render={
          <button
            type="button"
            className="pointer-events-none absolute top-0 left-0 size-px opacity-0"
            style={{
              transform: `translate(${anchorPoint.x}px, ${anchorPoint.y}px)`,
            }}
          />
        }
      />
      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={4}
        initialFocus={false}
        finalFocus={false}
        className="w-64 gap-0 p-0"
      >
        {suggestions.map((tag, index) => (
          <button
            key={tag.slug}
            type="button"
            tabIndex={-1}
            className={cn(
              "flex w-full items-start gap-2 px-3 py-2 text-sm transition-colors [&_svg:not([class*=size-])]:size-4 [&_svg]:shrink-0",
              index === selectedIndex
                ? "bg-accent text-accent-foreground"
                : "hover:bg-muted/50",
            )}
            onMouseDown={(e) => {
              e.preventDefault();
              handleSelect(tag);
            }}
            onMouseEnter={() => setSelectedIndex(index)}
          >
            <IconHash className="mt-0.5 shrink-0 text-muted-foreground" />
            <div className="flex min-w-0 flex-col items-start gap-0.5">
              <span className="truncate font-medium leading-5">
                {tag.displayName}
              </span>
              <span className="text-[11px] leading-3 text-muted-foreground">
                {tag.postCount} {tag.postCount === 1 ? "post" : "posts"}
              </span>
            </div>
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
