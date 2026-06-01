import { expect, type Page, type Locator } from "@playwright/test";
import { pathTo } from "@/utils/path";

export class SettingsPage {
  static readonly PATH = pathTo("settings");

  readonly heading: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole("heading", { name: "Settings" });
  }

  async goto() {
    await this.page.goto(SettingsPage.PATH);
  }

  async expectAccountOverviewVisible() {
    await expect(
      this.page.getByText("Account Overview"),
    ).toBeVisible();
  }

  async updateDisplayName(newName: string) {
    const nameInput = this.page.locator("#name");
    await nameInput.clear();
    await nameInput.fill(newName);
    // Find the save button in the Profile Identity card
    const profileCard = this.page
      .locator("form")
      .filter({ has: nameInput });
    await profileCard.getByRole("button", { name: /save/i }).click();
  }

  async changePassword(
    currentPassword: string,
    newPassword: string,
    confirmPassword: string,
  ) {
    await this.page.locator("#currentPassword").fill(currentPassword);
    await this.page.locator("#newPassword").fill(newPassword);
    await this.page.locator("#confirmPassword").fill(confirmPassword);

    const submitButton = this.page.getByRole("button", {
      name: /change password/i,
    });
    await expect(submitButton).toBeEnabled();
    await submitButton.click({ force: true });
  }
}
