import { test, expect } from "@/fixtures/auth-fixture";
import { ExplorePage } from "@/models/explore-page";

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
      const explorePage = new ExplorePage(page);
      await explorePage.goto();

      // Search for a random string that likely won't match
      const randomQuery = `nonexistent_${Date.now()}`;
      await explorePage.search(randomQuery);

      // Should show no results for the random query
      await explorePage.expectNoPostsFound(randomQuery);
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
      // First create a post on the home page
      const uniqueContent = `searchable-e2e-${Date.now()}`;
      await page.goto("/");

      await page.getByText("What's happening").first().click();
      const editor = page.locator('[contenteditable="true"]').first();
      await editor.fill(uniqueContent);
      await page.getByRole("button", { name: "Post" }).click();

      // Wait for post to be created
      await expect(page.getByText(uniqueContent).first()).toBeVisible({
        timeout: 15_000,
      });

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
