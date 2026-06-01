import { expect, type Page, type Locator } from "@playwright/test";
import { pathTo } from "@/utils/path";

export class ExplorePage {
  static readonly PATH = pathTo("explore");

  readonly searchInput: Locator;
  readonly clearButton: Locator;
  readonly postsTab: Locator;
  readonly peopleTab: Locator;

  constructor(private readonly page: Page) {
    this.searchInput = page.getByPlaceholder("Search posts and people...");
    this.clearButton = page.getByLabel("Clear search");
    this.postsTab = page.getByRole("button", { name: "Posts" });
    this.peopleTab = page.getByRole("button", { name: "People" });
  }

  async goto() {
    await this.page.goto(ExplorePage.PATH);
  }

  async search(query: string) {
    await this.searchInput.fill(query);
    await this.searchInput.press("Enter");
  }

  async switchToPostsTab() {
    await this.postsTab.click();
  }

  async switchToPeopleTab() {
    await this.peopleTab.click();
  }

  async clearSearch() {
    await this.clearButton.click();
  }

  async expectSearchPromptVisible() {
    await expect(
      this.page.getByText("Search for posts and people"),
    ).toBeVisible();
  }

  async expectNoPostsFound(query: string) {
    await expect(
      this.page.getByText(`No posts found for \u201C${query}\u201D`),
    ).toBeVisible();
  }

  async expectNoPeopleFound(query: string) {
    await expect(
      this.page.getByText(`No people found for \u201C${query}\u201D`),
    ).toBeVisible();
  }
}
