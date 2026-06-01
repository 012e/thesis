import { expect, type Page } from "@playwright/test";

const backendUrl =
  process.env.PLAYWRIGHT_BACKEND_URL ?? "http://localhost:3000";

export async function createPost(
  page: Page,
  content = `E2E post ${Date.now()}`,
) {
  const token = await page.evaluate(() => {
    const stored = window.localStorage.getItem("bearer_token");
    if (!stored) return null;

    try {
      const parsed: unknown = JSON.parse(stored);
      return typeof parsed === "string" ? parsed : stored;
    } catch {
      return stored;
    }
  });

  if (!token) {
    throw new Error("Cannot create post without an authenticated token");
  }

  const response = await page.request.post(`${backendUrl}/posts`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    data: {
      content: {
        text: content,
      },
    },
  });

  expect(response.status()).toBe(201);
  const post: unknown = await response.json();

  await page.goto("/");
  await page.evaluate((createdPost) => {
    const existingRaw = window.sessionStorage.getItem("new_posts");
    const existing: unknown = existingRaw ? JSON.parse(existingRaw) : [];
    const posts = Array.isArray(existing) ? existing : [];
    window.sessionStorage.setItem(
      "new_posts",
      JSON.stringify([createdPost, ...posts]),
    );
  }, post);
  await page.reload();

  const article = page.locator("article").filter({ hasText: content }).first();
  await expect(article).toBeVisible({ timeout: 15_000 });

  return content;
}
