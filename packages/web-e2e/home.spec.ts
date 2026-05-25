import { test, expect } from "@/fixtures/auth-fixture";
import { HomePage } from "@/models/home-page";

test.describe("Home Feed", () => {
  test.describe("Feed tabs", () => {
    test("should display For You and Following tabs", async ({
      authedPage: page,
    }) => {
      const forYouTab = page.getByRole("button", { name: "For you" });
      const followingTab = page.getByRole("button", { name: "Following" });

      await expect(forYouTab).toBeVisible();
      await expect(followingTab).toBeVisible();
    });

    test("should show For You tab as active by default", async ({
      authedPage: page,
    }) => {
      const forYouTab = page.getByRole("button", { name: "For you" });
      // The active tab has font-bold class and an indicator span
      await expect(forYouTab).toHaveClass(/font-bold/);
    });

    test("should switch to Following tab when clicked", async ({
      authedPage: page,
    }) => {
      const followingTab = page.getByRole("button", { name: "Following" });
      await followingTab.click();

      await expect(followingTab).toHaveClass(/font-bold/);
    });

    test("should switch back to For You tab when clicked", async ({
      authedPage: page,
    }) => {
      const followingTab = page.getByRole("button", { name: "Following" });
      const forYouTab = page.getByRole("button", { name: "For you" });

      await followingTab.click();
      await expect(followingTab).toHaveClass(/font-bold/);

      await forYouTab.click();
      await expect(forYouTab).toHaveClass(/font-bold/);
    });

    test("should show empty state for Following tab with no follows", async ({
      authedPage: page,
    }) => {
      const followingTab = page.getByRole("button", { name: "Following" });
      await followingTab.click();

      // New user with no follows should see an empty state message
      await expect(
        page.getByText(/no posts from people you follow/i),
      ).toBeVisible({ timeout: 15_000 });
    });
  });

  test.describe("Post composer", () => {
    test("should display the post composer on home page", async ({
      authedPage: page,
    }) => {
      // The post composer has a textarea placeholder
      await expect(
        page.getByText("What's happening").first(),
      ).toBeVisible();
    });

    test("should create a new post", async ({ authedPage: page }) => {
      const postContent = `E2E test post ${Date.now()}`;

      // Click on the composer area to focus it
      await page.getByText("What's happening").first().click();

      // Type in the MDX editor (contenteditable div)
      const editor = page.locator('[contenteditable="true"]').first();
      await editor.fill(postContent);

      // Click the Post button
      const postButton = page.getByRole("button", { name: "Post" });
      await expect(postButton).toBeEnabled();
      await postButton.click();

      // Wait for the post to appear in the feed
      await expect(page.getByText(postContent).first()).toBeVisible({
        timeout: 15_000,
      });
    });

    test("should show Post button disabled when composer is empty", async ({
      authedPage: page,
    }) => {
      const postButton = page.getByRole("button", { name: "Post" });
      await expect(postButton).toBeDisabled();
    });
  });
});
