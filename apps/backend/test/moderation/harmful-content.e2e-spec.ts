import { afterEach, describe, expect, it, vi } from "vitest";

import { HarmfulContentService } from "@/moderation/harmful-content.service";

describe("HarmfulContentService", () => {
  const setClient = (service: HarmfulContentService, client: unknown) => {
    Object.defineProperty(service, "client", {
      value: client,
      configurable: true,
    });
  };

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns unflagged when no API client is available", async () => {
    const service = new HarmfulContentService();
    setClient(service, null);

    await expect(service.check("violent text")).resolves.toEqual({
      flagged: false,
      categories: {},
      categoryScores: {},
      raw: null,
    });
  });

  it("returns unflagged for empty input without calling OpenAI", async () => {
    const create = vi.fn();
    const service = new HarmfulContentService();
    setClient(service, { moderations: { create } });

    await expect(service.check("   ")).resolves.toEqual({
      flagged: false,
      categories: {},
      categoryScores: {},
      raw: null,
    });
    expect(create).not.toHaveBeenCalled();
  });

  it("returns flagged moderation results from OpenAI", async () => {
    const rawResult = {
      flagged: true,
      categories: { violence: true, harassment: false },
      category_scores: { violence: 0.97, harassment: 0.02 },
    };
    const create = vi.fn().mockResolvedValue({ results: [rawResult] });
    const service = new HarmfulContentService();
    setClient(service, { moderations: { create } });

    const result = await service.check("I will hurt you");

    expect(create).toHaveBeenCalledWith({
      model: "omni-moderation-latest",
      input: "I will hurt you",
    });
    expect(result).toEqual({
      flagged: true,
      categories: { violence: true, harassment: false },
      categoryScores: { violence: 0.97, harassment: 0.02 },
      raw: rawResult,
    });
  });

  it("returns unflagged moderation results when OpenAI does not flag the content", async () => {
    const rawResult = {
      flagged: false,
      categories: { violence: false },
      category_scores: { violence: 0.01 },
    };
    const service = new HarmfulContentService();
    setClient(service, {
      moderations: {
        create: vi.fn().mockResolvedValue({ results: [rawResult] }),
      },
    });

    await expect(service.check("Discussing safety policy")).resolves.toEqual({
      flagged: false,
      categories: { violence: false },
      categoryScores: { violence: 0.01 },
      raw: rawResult,
    });
  });

  it("fails open when OpenAI throws", async () => {
    const service = new HarmfulContentService();
    setClient(service, {
      moderations: {
        create: vi.fn().mockRejectedValue(new Error("network down")),
      },
    });

    await expect(service.check("Potentially harmful text")).resolves.toEqual({
      flagged: false,
      categories: {},
      categoryScores: {},
      raw: null,
    });
  });
});
