import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";

import { ContentHashService } from "@/moderation/content-hash.service";

describe("ContentHashService", () => {
  let service: ContentHashService;

  beforeEach(() => {
    service = new ContentHashService();
  });

  describe("normalize()", () => {
    it("lowercases, collapses whitespace, and trims text", () => {
      expect(service.normalize("  HeLLo\n\t  WoRLD   AGAIN  ")).toBe(
        "hello world again",
      );
    });
  });

  describe("hash()", () => {
    it("returns null for null, undefined, empty, and whitespace-only input", () => {
      expect(service.hash(null)).toBeNull();
      expect(service.hash(undefined)).toBeNull();
      expect(service.hash("")).toBeNull();
      expect(service.hash("   \n\t  ")).toBeNull();
    });

    it("hashes normalized content using SHA-256", () => {
      const input = "  HeLLo\n  WoRLD  ";
      const expected = createHash("sha256")
        .update("hello world")
        .digest("hex");

      expect(service.hash(input)).toBe(expected);
    });

    it("produces the same hash for differently formatted equivalent content", () => {
      const first = service.hash("Hello   World");
      const second = service.hash("  hello\nworld  ");
      const third = service.hash("HELLO\tWORLD");

      expect(first).toBe(second);
      expect(second).toBe(third);
    });

    it("produces different hashes for meaningfully different content", () => {
      expect(service.hash("hello world")).not.toBe(service.hash("hello there"));
    });
  });
});
