import { expect, type Page, type Locator } from "@playwright/test";
import { pathTo } from "@/utils/path";

export class BookmarksPage {
  static readonly PATH = pathTo("bookmarks");

  readonly heading: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole("heading", { name: "Bookmarks" });
  }

  async goto() {
    await this.page.goto(BookmarksPage.PATH);
  }

  async expectEmpty() {
    await expect(this.page.getByText("No bookmarks yet")).toBeVisible();
  }

  async expectExploreLink() {
    await expect(
      this.page.getByRole("link", { name: "Explore posts" }),
    ).toBeVisible();
  }
}
