import { test, expect } from "@/fixtures/auth-fixture";
import { ProfilePage } from "@/models/profile-page";

test.describe("Profile", () => {
  test.describe("Own profile", () => {
    test("should display current user profile page", async ({
      authedPage: page,
      userCredentials,
    }) => {
      const profilePage = new ProfilePage(page);
      await profilePage.goto();

      // Should show the user's name from registration
      await profilePage.expectProfileNameVisible(userCredentials.name);
    });

    test("should display user email", async ({
      authedPage: page,
      userCredentials,
    }) => {
      const profilePage = new ProfilePage(page);
      await profilePage.goto();

      await profilePage.expectEmailVisible(userCredentials.email);
    });

    test("should display profile stats (posts, following, followers)", async ({
      authedPage: page,
    }) => {
      const profilePage = new ProfilePage(page);
      await profilePage.goto();

      await profilePage.expectStatsVisible();
    });

    test("should show created date", async ({ authedPage: page }) => {
      const profilePage = new ProfilePage(page);
      await profilePage.goto();

      // Should show "Joined" date
      await expect(page.getByText(/joined/i).first()).toBeVisible();
    });

    test("should show edit profile option for own profile", async ({
      authedPage: page,
    }) => {
      const profilePage = new ProfilePage(page);
      await profilePage.goto();

      // Should show edit button or avatar click to edit
      await expect(
        page.getByText(/edit/i).first(),
      ).toBeVisible({ timeout: 10_000 });
    });
  });

  test.describe("Profile posts", () => {
    test("should show posts on profile after creating one", async ({
      authedPage: page,
    }) => {
      // Create a post first
      const postContent = `Profile post ${Date.now()}`;
      await page.goto("/");
      await page.getByText("What's happening").first().click();
      const editor = page.locator('[contenteditable="true"]').first();
      await editor.fill(postContent);
      await page.getByRole("button", { name: "Post" }).click();
      await expect(page.getByText(postContent).first()).toBeVisible({
        timeout: 15_000,
      });

      // Go to profile
      const profilePage = new ProfilePage(page);
      await profilePage.goto();

      // Post should appear on profile
      await expect(page.getByText(postContent).first()).toBeVisible({
        timeout: 15_000,
      });
    });
  });

  test.describe("Followers and Following", () => {
    test("should navigate to followers page", async ({
      authedPage: page,
    }) => {
      const profilePage = new ProfilePage(page);
      await profilePage.goto();

      // Click on followers count/link
      await page.getByText(/followers/i).first().click();

      // Should show followers page
      await expect(page).toHaveURL(/followers/);
    });

    test("should navigate to following page", async ({
      authedPage: page,
    }) => {
      const profilePage = new ProfilePage(page);
      await profilePage.goto();

      // Click on following count/link
      await page.getByText(/following/i).first().click();

      // Should show following page
      await expect(page).toHaveURL(/following/);
    });
  });
});
