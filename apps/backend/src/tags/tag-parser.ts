export interface ParsedTag {
  /** The raw text as written by the user, e.g. "React" */
  raw: string;
  /** Normalized lowercase slug, e.g. "react" */
  slug: string;
}

/**
 * Regex to match X-style hashtags.
 * - Must be preceded by start-of-string, whitespace, or common punctuation.
 * - `#` followed by letters/digits/underscores, requiring at least one letter.
 * - Max 50 characters after `#`.
 */
const TAG_PATTERN =
  /(?:^|(?<=[\s.,;:!?()[\]{}"'<>]))#([A-Za-z\u00C0-\u024F\u0400-\u04FF][A-Za-z0-9\u00C0-\u024F\u0400-\u04FF_]{0,49}|[0-9_]*[A-Za-z\u00C0-\u024F\u0400-\u04FF][A-Za-z0-9\u00C0-\u024F\u0400-\u04FF_]{0,49})/g;

const MAX_TAGS_PER_POST = 10;

/**
 * Extract unique tags from post text.
 * Returns at most MAX_TAGS_PER_POST tags, deduplicated by slug.
 */
export function extractTags(text: string | undefined | null): ParsedTag[] {
  if (!text) return [];

  const seen = new Set<string>();
  const tags: ParsedTag[] = [];

  for (const match of text.matchAll(TAG_PATTERN)) {
    const raw = match[1];
    if (!raw) continue;
    if (raw.length > 50) continue;
    // Must contain at least one letter
    if (!/[A-Za-z\u00C0-\u024F\u0400-\u04FF]/.test(raw)) continue;

    const slug = raw.toLowerCase().normalize("NFC");
    if (seen.has(slug)) continue;
    seen.add(slug);
    tags.push({ raw, slug });

    if (tags.length >= MAX_TAGS_PER_POST) break;
  }

  return tags;
}
