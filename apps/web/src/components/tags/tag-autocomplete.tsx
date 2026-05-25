import { useState, useEffect, useCallback } from "react";
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
  onSelect: (tag: string) => void;
  /** Anchor element for positioning */
  anchorRef?: RefObject<HTMLElement | null>;
}

function getHashtagQuery(text: string, cursorPosition?: number): string | null {
  const pos = cursorPosition ?? text.length;
  const before = text.slice(0, pos);
  // Find the last # that starts a tag
  const match = before.match(/(?:^|[\s.,!?;:'"()\[\]{}<>\/\\|@~`^&*+=\-])#([A-Za-z]\w{0,49})$/);
  if (match) return match[1];
  // Also handle # at start of text
  const startMatch = before.match(/^#([A-Za-z]\w{0,49})$/);
  if (startMatch) return startMatch[1];
  return null;
}

export function TagAutocomplete({
  text,
  cursorPosition,
  onSelect,
}: TagAutocompleteProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const query = getHashtagQuery(text, cursorPosition);
  const { data } = useTagSuggestions(query ?? "", 5);

  const suggestions = data?.items ?? [];
  const isOpen = query !== null && suggestions.length > 0;

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleSelect = useCallback(
    (tag: { slug: string; displayName: string }) => {
      onSelect(`#${tag.displayName}`);
    },
    [onSelect],
  );

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
          />
        }
      />
      <PopoverContent
        align="start"
        side="top"
        sideOffset={4}
        className="w-64 gap-0 p-1"
      >
        {suggestions.map((tag, index) => (
          <button
            key={tag.slug}
            type="button"
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors [&_svg:not([class*=size-])]:size-4 [&_svg]:shrink-0",
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
            <IconHash className="shrink-0 text-muted-foreground" />
            <div className="flex min-w-0 flex-col items-start">
              <span className="truncate font-medium">{tag.displayName}</span>
              <span className="text-xs text-muted-foreground">
                {tag.postCount} {tag.postCount === 1 ? "post" : "posts"}
              </span>
            </div>
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
