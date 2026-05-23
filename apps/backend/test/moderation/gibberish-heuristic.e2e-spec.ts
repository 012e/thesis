import { describe, expect, it } from "vitest";

import { passesGibberishCheck } from "@/moderation/gibberish-heuristic";

describe("passesGibberishCheck", () => {
  it("returns true for null, undefined, and empty descriptions", () => {
    expect(passesGibberishCheck(null)).toBe(true);
    expect(passesGibberishCheck(undefined)).toBe(true);
    expect(passesGibberishCheck("")).toBe(true);
    expect(passesGibberishCheck("   ")).toBe(true);
  });

  it("returns false for descriptions that are too short", () => {
    expect(passesGibberishCheck("hey")).toBe(false);
    expect(passesGibberishCheck("abcd")).toBe(false);
  });

  it("returns false for excessive repeated characters", () => {
    expect(passesGibberishCheck("aaaaaa")).toBe(false);
    expect(passesGibberishCheck("!!!!!!aaaaaa!!!!!!")).toBe(false);
  });

  it("returns false for very low unique character ratio text", () => {
    expect(passesGibberishCheck("abababababababababab")).toBe(false);
  });

  it("returns false when the alphabetic ratio is too low", () => {
    expect(passesGibberishCheck("1234!!!!@@@@####")).toBe(false);
  });

  it("returns false for keyboard-mashing patterns", () => {
    expect(passesGibberishCheck("asdfasdfasdf")).toBe(false);
    expect(passesGibberishCheck("qwerqwerqwer")).toBe(false);
  });

  it("returns true for normal report text", () => {
    expect(
      passesGibberishCheck(
        "This post contains repeated harassment toward another user.",
      ),
    ).toBe(true);
  });
});
