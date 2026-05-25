import { expect, type Page } from "@playwright/test";
import { pathTo } from "@/utils/path";

export class PostPage {
  constructor(private readonly page: Page) {}

  static pathFor(postId: string) {
    return pathTo("posts", postId);
  }

  async goto(postId: string) {
    await this.page.goto(PostPage.pathFor(postId));
  }

  async expectPostHeading() {
    await expect(
      this.page.getByRole("heading", { name: "Post" }),
    ).toBeVisible();
  }

  async expectCommentsSection() {
    await expect(
      this.page.getByRole("heading", { name: "Comments" }),
    ).toBeVisible();
  }

  async expectBackButton() {
    await expect(
      this.page.getByRole("link", { name: "" }).first(),
    ).toBeVisible();
  }

  async expectPostContent(text: string) {
    await expect(this.page.getByText(text).first()).toBeVisible();
  }
}
