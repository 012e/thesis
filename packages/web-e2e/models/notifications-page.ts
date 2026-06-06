import { expect, type Page, type Locator } from "@playwright/test";
import { pathTo } from "@/utils/path";

export class NotificationsPage {
  static readonly PATH = pathTo("notifications");

  readonly heading: Locator;
  readonly markAllReadButton: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole("heading", { name: "Notifications" });
    this.markAllReadButton = page.getByRole("button", {
      name: "Mark all as read",
    });
  }

  async goto() {
    await this.page.goto(NotificationsPage.PATH);
  }

  async expectEmpty() {
    await expect(this.page.getByText("No notifications yet")).toBeVisible();
  }

  async markAllAsRead() {
    await this.markAllReadButton.click();
  }
}
