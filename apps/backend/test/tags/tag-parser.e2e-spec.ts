import { describe, expect, it } from "vitest";
import { extractTags } from "@/tags/tag-parser";

describe("extractTags", () => {
  it("returns empty array for undefined/null/empty input", () => {
    expect(extractTags(undefined)).toEqual([]);
    expect(extractTags(null)).toEqual([]);
    expect(extractTags("")).toEqual([]);
  });

  it("extracts a single hashtag", () => {
    const result = extractTags("Hello #React world");
    expect(result).toEqual([{ raw: "React", slug: "react" }]);
  });

  it("extracts multiple hashtags", () => {
    const result = extractTags("#React and #TypeScript are great");
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ raw: "React", slug: "react" });
    expect(result[1]).toEqual({ raw: "TypeScript", slug: "typescript" });
  });

  it("extracts hashtag at start of string", () => {
    const result = extractTags("#AI is the future");
    expect(result).toEqual([{ raw: "AI", slug: "ai" }]);
  });

  it("extracts hashtag at end of string", () => {
    const result = extractTags("Check out #ParadeDB");
    expect(result).toEqual([{ raw: "ParadeDB", slug: "paradedb" }]);
  });

  it("deduplicates tags by slug (case-insensitive)", () => {
    const result = extractTags("#React #react #REACT");
    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe("react");
  });

  it("preserves the first occurrence casing as raw", () => {
    const result = extractTags("#ParadeDB and #paradedb again");
    expect(result).toHaveLength(1);
    expect(result[0].raw).toBe("ParadeDB");
  });

  it("supports underscores in tags", () => {
    const result = extractTags("#my_tag is valid");
    expect(result).toEqual([{ raw: "my_tag", slug: "my_tag" }]);
  });

  it("supports tags starting with numbers if they contain letters", () => {
    const result = extractTags("#3dPrinting is cool");
    expect(result).toEqual([{ raw: "3dPrinting", slug: "3dprinting" }]);
  });

  it("rejects pure number tags like #123", () => {
    const result = extractTags("Check out #123");
    expect(result).toEqual([]);
  });

  it("limits to 10 tags per post", () => {
    const text = Array.from(
      { length: 15 },
      (_, i) => `#tag${String.fromCharCode(65 + i)}`,
    ).join(" ");
    const result = extractTags(text);
    expect(result).toHaveLength(10);
  });

  it("does not match tags inside URLs", () => {
    const result = extractTags("Visit https://example.com/#section");
    expect(result).toEqual([]);
  });

  it("matches tags after punctuation", () => {
    const result = extractTags("Hello, #world!");
    expect(result).toEqual([{ raw: "world", slug: "world" }]);
  });

  it("handles tags after newlines", () => {
    const result = extractTags("Line one\n#tag on new line");
    expect(result).toEqual([{ raw: "tag", slug: "tag" }]);
  });

  it("does not match mid-word hashtags", () => {
    const result = extractTags("email@example.com#tag");
    expect(result).toEqual([]);
  });

  it("handles text with no hashtags", () => {
    const result = extractTags(
      "Just a regular post with no special characters",
    );
    expect(result).toEqual([]);
  });

  it("handles tags with maximum length", () => {
    const longTag = "a".repeat(50);
    const result = extractTags(`#${longTag}`);
    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe(longTag);
  });

  it("truncates tags at 50 characters gracefully (regex captures first 50)", () => {
    const longTag = "a".repeat(51);
    const result = extractTags(`#${longTag}`);
    // Regex captures the first 50 characters
    expect(result).toHaveLength(1);
    expect(result[0].slug.length).toBeLessThanOrEqual(50);
  });

  it("handles parenthesized tags", () => {
    const result = extractTags("Check (#react) out");
    expect(result).toEqual([{ raw: "react", slug: "react" }]);
  });
});
