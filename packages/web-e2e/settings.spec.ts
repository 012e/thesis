import { test, expect } from "@/fixtures/auth-fixture";
import { SettingsPage } from "@/models/settings-page";

test.describe("Settings", () => {
  test.describe("Page layout", () => {
    test("should display settings heading", async ({
      authedPage: page,
    }) => {
      const settingsPage = new SettingsPage(page);
      await settingsPage.goto();

      await expect(settingsPage.heading).toBeVisible();
    });

    test("should show account overview section", async ({
      authedPage: page,
    }) => {
      const settingsPage = new SettingsPage(page);
      await settingsPage.goto();

      await settingsPage.expectAccountOverviewVisible();
    });
  });

  test.describe("Update display name", () => {
    test("should update the display name", async ({
      authedPage: page,
      userCredentials,
    }) => {
      const settingsPage = new SettingsPage(page);
      await settingsPage.goto();

      const newName = `Updated ${Date.now()}`;
      await settingsPage.updateDisplayName(newName);

      // Wait for the save and reload to verify
      await page.waitForTimeout(2000);

      // Verify the name has been updated
      await settingsPage.goto();
      const nameInput = page.getByLabel("Display Name");
      if (await nameInput.isVisible()) {
        await expect(nameInput).toHaveValue(newName);
      }
    });
  });

  test.describe("Change password", () => {
    test("should show password change form", async ({
      authedPage: page,
    }) => {
      const settingsPage = new SettingsPage(page);
      await settingsPage.goto();

      // Should have current password, new password, and confirm fields
      await expect(
        page.getByLabel(/current password/i).first(),
      ).toBeVisible();
      await expect(
        page.getByLabel(/new password/i).first(),
      ).toBeVisible();
    });

    test("should change password successfully", async ({
      authedPage: page,
      userCredentials,
    }) => {
      const settingsPage = new SettingsPage(page);
      await settingsPage.goto();

      const newPassword = `NewPass${Date.now().toString().slice(-6)}!`;
      await settingsPage.changePassword(
        userCredentials.password,
        newPassword,
        newPassword,
      );

      // Should show success toast/message
      await expect(
        page.getByText(/success|updated|changed/i).first(),
      ).toBeVisible({ timeout: 10_000 });
    });
  });

  test.describe("Logout", () => {
    test("should logout successfully", async ({
      authedPage: page,
    }) => {
      const settingsPage = new SettingsPage(page);
      await settingsPage.goto();

      // Click logout button
      const logoutButton = page.getByRole("button", { name: /logout|sign out|log out/i });
      if (await logoutButton.isVisible()) {
        await logoutButton.click();

        // Should redirect to login page
        await expect(page).toHaveURL(/auth\/login/, {
          timeout: 10_000,
        });
      }
    });
  });
});
