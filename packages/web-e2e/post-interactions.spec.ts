import { test, expect } from "@/fixtures/auth-fixture";
import { createPost } from "@/utils/posts";

const activeUpvoteClass = /(^|\s)text-orange-600(\s|$)/;
const activeDownvoteClass = /(^|\s)text-blue-600(\s|$)/;

test.describe("Post Interactions", () => {
  test.describe("Voting", () => {
    test("should upvote a post", async ({ authedPage: page }) => {
      const postContent = await createPost(page);

      // Find the post article containing our content
      const article = page
        .locator("article")
        .filter({ hasText: postContent })
        .first();

      // Click the upvote button
      const upvoteButton = article.getByTitle("Upvote");
      await upvoteButton.click();

      // The upvote button should now have the active style (orange)
      await expect(upvoteButton).toHaveClass(activeUpvoteClass);
    });

    test("should downvote a post", async ({ authedPage: page }) => {
      const postContent = await createPost(page);

      const article = page
        .locator("article")
        .filter({ hasText: postContent })
        .first();

      const downvoteButton = article.getByTitle("Downvote");
      await downvoteButton.click();

      await expect(downvoteButton).toHaveClass(activeDownvoteClass);
    });

    test("should toggle upvote off when clicked again", async ({
      authedPage: page,
    }) => {
      const postContent = await createPost(page);

      const article = page
        .locator("article")
        .filter({ hasText: postContent })
        .first();

      const upvoteButton = article.getByTitle("Upvote");

      // Click to upvote
      await upvoteButton.click();
      await expect(upvoteButton).toHaveClass(activeUpvoteClass);

      // Click again to remove upvote
      await upvoteButton.click();
      await expect(upvoteButton).not.toHaveClass(activeUpvoteClass);
    });

    test("should switch from upvote to downvote", async ({
      authedPage: page,
    }) => {
      const postContent = await createPost(page);

      const article = page
        .locator("article")
        .filter({ hasText: postContent })
        .first();

      const upvoteButton = article.getByTitle("Upvote");
      const downvoteButton = article.getByTitle("Downvote");

      // Upvote first
      await upvoteButton.click();
      await expect(upvoteButton).toHaveClass(activeUpvoteClass);

      // Then downvote - should switch
      await downvoteButton.click();
      await expect(downvoteButton).toHaveClass(activeDownvoteClass);
      await expect(upvoteButton).not.toHaveClass(activeUpvoteClass);
    });
  });

  test.describe("Bookmark", () => {
    test("should bookmark a post", async ({ authedPage: page }) => {
      const postContent = await createPost(page);

      const article = page
        .locator("article")
        .filter({ hasText: postContent })
        .first();

      // Click bookmark button (initially has title "Save post")
      const bookmarkButton = article.getByTitle("Save post");
      await bookmarkButton.click();

      // After bookmarking, the title changes to "Remove bookmark"
      await expect(
        article.getByTitle("Remove bookmark"),
      ).toBeVisible();
    });

    test("should unbookmark a post", async ({ authedPage: page }) => {
      const postContent = await createPost(page);

      const article = page
        .locator("article")
        .filter({ hasText: postContent })
        .first();

      // Bookmark first
      await article.getByTitle("Save post").click();
      await expect(article.getByTitle("Remove bookmark")).toBeVisible();

      // Unbookmark
      await article.getByTitle("Remove bookmark").click();
      await expect(article.getByTitle("Save post")).toBeVisible();
    });
  });

  test.describe("Comments", () => {
    test("should open comments dialog", async ({ authedPage: page }) => {
      const postContent = await createPost(page);

      const article = page
        .locator("article")
        .filter({ hasText: postContent })
        .first();

      const commentButton = article
        .locator('button:has(svg.tabler-icon-message-circle)')
        .first();

      await commentButton.click();

      // Wait for the comments dialog
      await expect(
        page.getByRole("heading", { name: "Comments" }),
      ).toBeVisible({ timeout: 10_000 });
    });

    test("should add a comment to a post", async ({ authedPage: page }) => {
      const postContent = await createPost(page);

      const article = page
        .locator("article")
        .filter({ hasText: postContent })
        .first();

      // Open comments dialog - click the first button in the action bar (comment button)
      const actionButtons = article.locator(
        ".flex.justify-between.items-center button",
      );
      await actionButtons.first().click();

      await expect(
        page.getByRole("heading", { name: "Comments" }),
      ).toBeVisible({ timeout: 10_000 });

      // Type a comment in the comment editor
      const commentText = `E2E comment ${Date.now()}`;
      const commentEditor = page.getByPlaceholder("Write a comment...");

      // The comment editor is a contenteditable MDX editor
      const editorArea = page
        .locator('[role="dialog"]')
        .locator('[contenteditable="true"]')
        .first();
      await editorArea.click();
      await editorArea.fill(commentText);

      // Submit comment
      const submitButton = page
        .locator('[role="dialog"]')
        .getByRole("button", { name: /comment|submit|post/i });
      await submitButton.click();

      // The comment should appear in the dialog
      await expect(
        page.locator('[role="dialog"]').getByText(commentText),
      ).toBeVisible({ timeout: 10_000 });
    });
  });

  test.describe("Post menu (own post)", () => {
    test("should show edit and delete options for own post", async ({
      authedPage: page,
    }) => {
      const postContent = await createPost(page);

      const article = page
        .locator("article")
        .filter({ hasText: postContent })
        .first();

      // Click the three-dot menu
      const menuTrigger = article.locator(
        'button:has(svg.tabler-icon-dots)',
      );
      await menuTrigger.click();

      // Should show Edit and Delete options
      await expect(page.getByText("Edit").first()).toBeVisible();
      await expect(page.getByText("Delete").first()).toBeVisible();
    });

    test("should delete own post", async ({ authedPage: page }) => {
      const postContent = await createPost(page);

      const article = page
        .locator("article")
        .filter({ hasText: postContent })
        .first();

      // Click three-dot menu
      const menuTrigger = article.locator(
        'button:has(svg.tabler-icon-dots)',
      );
      await menuTrigger.click();

      // Click Delete
      await page.getByRole("menuitem", { name: /^Delete/ }).click();

      // Confirm deletion in the dialog
      const deleteConfirmButton = page
        .getByRole("dialog", { name: /delete/i })
        .getByRole("button", { name: /delete/i });
      await deleteConfirmButton.click();

      await expect(
        page.getByText(/post deleted successfully/i),
      ).toBeVisible({ timeout: 10_000 });
      await page.reload();
      await expect(article).not.toBeVisible({ timeout: 10_000 });
    });

    test("should edit own post", async ({ authedPage: page }) => {
      const postContent = await createPost(page);

      const article = page
        .locator("article")
        .filter({ hasText: postContent })
        .first();

      // Click three-dot menu
      const menuTrigger = article.locator(
        'button:has(svg.tabler-icon-dots)',
      );
      await menuTrigger.click();

      // Click Edit
      await page.getByRole("menuitem", { name: /^Edit/ }).click();

      // Edit dialog should open
      await expect(
        page.getByRole("dialog", { name: "Edit post" }),
      ).toBeVisible({ timeout: 10_000 });
    });
  });

  test.describe("Share", () => {
    test("should copy post link to clipboard", async ({
      authedPage: page,
    }) => {
      const postContent = await createPost(page);

      const article = page
        .locator("article")
        .filter({ hasText: postContent })
        .first();

      // Grant clipboard permissions
      await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);

      // Click share button (has title "Share via link")
      const shareButton = article.getByTitle("Share via link");
      await shareButton.click();

      // Should show a toast with success message
      await expect(
        page.getByText(/link copied/i).first(),
      ).toBeVisible({ timeout: 5_000 });
    });
  });
});
