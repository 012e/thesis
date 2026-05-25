import { test, expect } from "@/fixtures/auth-fixture";
import { PostPage } from "@/models/post-page";

test.describe("Single Post Page", () => {
  // Helper: create a post and return its content and navigate to single post page
  async function createPostAndGetId(page: import("@playwright/test").Page) {
    const postContent = `Single post test ${Date.now()}`;

    await page.goto("/");
    await page.getByText("What's happening").first().click();
    const editor = page.locator('[contenteditable="true"]').first();
    await editor.fill(postContent);
    await page.getByRole("button", { name: "Post" }).click();

    // Wait for post to appear
    await expect(page.getByText(postContent).first()).toBeVisible({
      timeout: 15_000,
    });

    return postContent;
  }

  async function navigateToSinglePost(
    page: import("@playwright/test").Page,
    postContent: string,
  ) {
    const article = page
      .locator("article")
      .filter({ hasText: postContent })
      .first();

    // Grant clipboard permissions and use share to get the post link
    await page
      .context()
      .grantPermissions(["clipboard-read", "clipboard-write"]);

    // Click the share button to copy the link
    const shareButton = article.getByTitle("Share via link");
    await shareButton.click();

    // Get the link from clipboard
    const clipboardContent = await page.evaluate(() =>
      navigator.clipboard.readText(),
    );

    // Navigate to the single post page
    await page.goto(clipboardContent);

    return clipboardContent;
  }

  test.describe("Post display", () => {
    test("should display a single post page", async ({
      authedPage: page,
    }) => {
      const postContent = await createPostAndGetId(page);
      await navigateToSinglePost(page, postContent);

      // Post content should be visible on the single post page
      await expect(page.getByText(postContent).first()).toBeVisible({
        timeout: 15_000,
      });
    });

    test("should show back button", async ({ authedPage: page }) => {
      const postContent = await createPostAndGetId(page);
      await navigateToSinglePost(page, postContent);

      // Should show a back button or arrow
      const backButton = page.getByRole("button", { name: /back/i });
      const backLink = page.locator('a[href="/"]');

      const backIsVisible =
        (await backButton.isVisible().catch(() => false)) ||
        (await backLink.isVisible().catch(() => false));

      expect(backIsVisible).toBe(true);
    });

    test("should navigate back when back button is clicked", async ({
      authedPage: page,
    }) => {
      const postContent = await createPostAndGetId(page);
      await navigateToSinglePost(page, postContent);

      // Click back - try button first, then link
      const backButton = page.getByRole("button", { name: /back/i });
      if (await backButton.isVisible().catch(() => false)) {
        await backButton.click();
      } else {
        const backLink = page.locator('a[href="/"]').first();
        await backLink.click();
      }

      // Should navigate to home
      await expect(page).toHaveURL(/\/$/, { timeout: 10_000 });
    });
  });

  test.describe("Comments section", () => {
    test("should display comments section on single post page", async ({
      authedPage: page,
    }) => {
      const postContent = await createPostAndGetId(page);
      await navigateToSinglePost(page, postContent);

      // Comments section should be visible (inline, not in dialog)
      await expect(
        page.getByText(/comment/i).first(),
      ).toBeVisible({ timeout: 15_000 });
    });

    test("should add a comment on single post page", async ({
      authedPage: page,
    }) => {
      const postContent = await createPostAndGetId(page);
      await navigateToSinglePost(page, postContent);

      // Wait for comments section to load
      const commentEditor = page
        .locator('[contenteditable="true"]')
        .last();
      await commentEditor.waitFor({ state: "visible", timeout: 15_000 });
      await commentEditor.click();

      const commentText = `Single page comment ${Date.now()}`;
      await commentEditor.fill(commentText);

      // Submit comment
      const submitButton = page.getByRole("button", {
        name: /comment|submit|post/i,
      });
      await submitButton.click();

      // Comment should appear
      await expect(page.getByText(commentText).first()).toBeVisible({
        timeout: 15_000,
      });
    });
  });

  test.describe("Post interactions on single page", () => {
    test("should upvote post on single post page", async ({
      authedPage: page,
    }) => {
      const postContent = await createPostAndGetId(page);
      await navigateToSinglePost(page, postContent);

      // Find the upvote button
      const upvoteButton = page.getByTitle("Upvote").first();
      await upvoteButton.click();

      // Should show active state
      await expect(upvoteButton).toHaveClass(/text-orange-600/);
    });

    test("should bookmark post on single post page", async ({
      authedPage: page,
    }) => {
      const postContent = await createPostAndGetId(page);
      await navigateToSinglePost(page, postContent);

      // Click bookmark
      const bookmarkButton = page.getByTitle("Save post").first();
      await bookmarkButton.click();

      // Should change to "Remove bookmark"
      await expect(
        page.getByTitle("Remove bookmark").first(),
      ).toBeVisible();
    });
  });
});
