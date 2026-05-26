/**
 * Heuristic checks for detecting gibberish / low-effort text in user reports.
 * These are fast, rule-based checks that run before invoking the LLM.
 */

/**
 * Check if text is likely gibberish or too low quality to be a real report.
 * Returns true if text appears to be legitimate (passes the check).
 */
export function passesGibberishCheck(text: string | null | undefined): boolean {
  if (!text || text.trim().length === 0) {
    // Empty description is acceptable (reason enum is required)
    return true;
  }

  const trimmed = text.trim();

  // Too short to be meaningful
  if (trimmed.length < 5) {
    return false;
  }

  // Check for excessive repeated characters (e.g. "aaaaaaa", "xxxxxxxxx")
  if (/(.)\1{5,}/i.test(trimmed)) {
    return false;
  }

  // Check if text has very low unique character ratio (gibberish like "asdfasdfasdf")
  const uniqueChars = new Set(trimmed.toLowerCase().replace(/\s/g, "")).size;
  const totalChars = trimmed.replace(/\s/g, "").length;
  if (totalChars > 10 && uniqueChars / totalChars < 0.15) {
    return false;
  }

  // Check for excessive special characters / non-alphabetic content
  const alphaCount = (
    trimmed.match(/[a-zA-Z\u00C0-\u024F\u0400-\u04FF]/g) || []
  ).length;
  if (totalChars > 5 && alphaCount / totalChars < 0.3) {
    return false;
  }

  // Check for keyboard mashing patterns
  const keyboardPatterns = [
    /^[asdf]+$/i,
    /^[qwer]+$/i,
    /^[zxcv]+$/i,
    /^[hjkl]+$/i,
  ];
  const noSpaces = trimmed.replace(/\s/g, "");
  if (keyboardPatterns.some((p) => p.test(noSpaces))) {
    return false;
  }

  return true;
}
