import { test, expect } from "@/fixtures/auth-fixture";
import { BookmarksPage } from "@/models/bookmarks-page";
import { createPost } from "@/utils/posts";

test.describe("Bookmarks", () => {
  test.describe("Empty state", () => {
    test("should display bookmarks page heading", async ({
      authedPage: page,
    }) => {
      const bookmarksPage = new BookmarksPage(page);
      await bookmarksPage.goto();

      await expect(bookmarksPage.heading).toBeVisible();
    });

    test("should show empty state for new user", async ({
      authedPage: page,
    }) => {
      const bookmarksPage = new BookmarksPage(page);
      await bookmarksPage.goto();

      await bookmarksPage.expectEmpty();
    });
  });

  test.describe("Bookmark flow", () => {
    test("should show bookmarked post on bookmarks page", async ({
      authedPage: page,
    }) => {
      const postContent = `Bookmark test ${Date.now()}`;
      await createPost(page, postContent);

      // Bookmark the post
      const article = page
        .locator("article")
        .filter({ hasText: postContent })
        .first();
      await article.getByTitle("Save post").click();
      await expect(article.getByTitle("Remove bookmark")).toBeVisible();

      // Navigate to bookmarks page
      const bookmarksPage = new BookmarksPage(page);
      await bookmarksPage.goto();

      // The bookmarked post should appear
      await expect(page.getByText(postContent).first()).toBeVisible({
        timeout: 15_000,
      });
    });

    test("should remove post from bookmarks page after unbookmarking", async ({
      authedPage: page,
    }) => {
      const postContent = `Unbookmark test ${Date.now()}`;
      await createPost(page, postContent);

      // Bookmark it
      const article = page
        .locator("article")
        .filter({ hasText: postContent })
        .first();
      await article.getByTitle("Save post").click();
      await expect(article.getByTitle("Remove bookmark")).toBeVisible();

      // Go to bookmarks
      const bookmarksPage = new BookmarksPage(page);
      await bookmarksPage.goto();

      // Verify it's there
      await expect(page.getByText(postContent).first()).toBeVisible({
        timeout: 15_000,
      });

      // Unbookmark from the bookmarks page
      const bookmarkedArticle = page
        .locator("article")
        .filter({ hasText: postContent })
        .first();
      await bookmarkedArticle.getByTitle("Remove bookmark").click();

      // Reload the page
      await bookmarksPage.goto();

      // The post should no longer be there
      await expect(page.getByText(postContent).first()).not.toBeVisible({
        timeout: 10_000,
      });
    });
  });
});
