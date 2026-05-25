import { expect, type Page, type Locator } from "@playwright/test";
import { pathTo } from "@/utils/path";

export class ProfilePage {
  static readonly PATH = pathTo("profile");

  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto(ProfilePage.PATH);
  }

  async gotoFollowers() {
    await this.page.goto(pathTo("profile", "followers"));
  }

  async gotoFollowing() {
    await this.page.goto(pathTo("profile", "following"));
  }

  async expectProfileNameVisible(name: string) {
    await expect(this.page.getByText(name).first()).toBeVisible();
  }

  async expectEmailVisible(email: string) {
    await expect(this.page.getByText(email).first()).toBeVisible();
  }

  async expectStatsVisible() {
    await expect(this.page.getByText(/posts/i).first()).toBeVisible();
    await expect(this.page.getByText(/following/i).first()).toBeVisible();
    await expect(this.page.getByText(/followers/i).first()).toBeVisible();
  }
}
