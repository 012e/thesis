import { test, expect } from "@/fixtures/auth-fixture";
import { ExplorePage } from "@/models/explore-page";
import { createPost } from "@/utils/posts";

test.describe("Explore & Search", () => {
  test.describe("Page layout", () => {
    test("should display search input", async ({ authedPage: page }) => {
      const explorePage = new ExplorePage(page);
      await explorePage.goto();

      await expect(explorePage.searchInput).toBeVisible();
    });

    test("should show search prompt when no query is entered", async ({
      authedPage: page,
    }) => {
      const explorePage = new ExplorePage(page);
      await explorePage.goto();

      await explorePage.expectSearchPromptVisible();
    });

    test("should not show tabs when no query is entered", async ({
      authedPage: page,
    }) => {
      const explorePage = new ExplorePage(page);
      await explorePage.goto();

      await expect(explorePage.postsTab).not.toBeVisible();
      await expect(explorePage.peopleTab).not.toBeVisible();
    });
  });

  test.describe("Search functionality", () => {
    test("should show tabs after searching", async ({
      authedPage: page,
    }) => {
      const explorePage = new ExplorePage(page);
      await explorePage.goto();

      await explorePage.search("test");

      await expect(explorePage.postsTab).toBeVisible();
      await expect(explorePage.peopleTab).toBeVisible();
    });

    test("should search for posts", async ({ authedPage: page }) => {
      const postContent = `search-posts-${Date.now()}`;
      await createPost(page, postContent);

      const explorePage = new ExplorePage(page);
      await explorePage.goto();

      await explorePage.search(postContent);

      await expect(page.getByText(postContent).first()).toBeVisible({
        timeout: 30_000,
      });
    });

    test("should switch to People tab and search", async ({
      authedPage: page,
    }) => {
      const explorePage = new ExplorePage(page);
      await explorePage.goto();

      const randomQuery = `nonexistent_user_${Date.now()}`;
      await explorePage.search(randomQuery);

      await explorePage.switchToPeopleTab();

      // Should show no people found
      await explorePage.expectNoPeopleFound(randomQuery);
    });

    test("should clear search input", async ({ authedPage: page }) => {
      const explorePage = new ExplorePage(page);
      await explorePage.goto();

      await explorePage.search("test query");

      // Clear the search
      await explorePage.clearSearch();

      // Should go back to the search prompt state
      await explorePage.expectSearchPromptVisible();
    });

    test("should update URL with search query", async ({
      authedPage: page,
    }) => {
      const explorePage = new ExplorePage(page);
      await explorePage.goto();

      await explorePage.search("hello world");

      // URL should contain the query parameter
      await expect(page).toHaveURL(/q=hello/);
    });

    test("should update URL when switching tabs", async ({
      authedPage: page,
    }) => {
      const explorePage = new ExplorePage(page);
      await explorePage.goto();

      await explorePage.search("test");
      await explorePage.switchToPeopleTab();

      await expect(page).toHaveURL(/tab=people/);
    });
  });

  test.describe("Search with existing content", () => {
    test("should find a post that was just created", async ({
      authedPage: page,
    }) => {
      const uniqueContent = `searchable-e2e-${Date.now()}`;
      await createPost(page, uniqueContent);

      // Now search for it
      const explorePage = new ExplorePage(page);
      await explorePage.goto();
      await explorePage.search(uniqueContent);

      // Wait for search results - the post should appear
      // Note: Search might use BM25 indexing which could have a delay
      await expect(
        page.getByText(uniqueContent).first(),
      ).toBeVisible({ timeout: 30_000 });
    });
  });
});
