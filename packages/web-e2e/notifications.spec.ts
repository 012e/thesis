import { test, expect } from "@/fixtures/auth-fixture";
import { NotificationsPage } from "@/models/notifications-page";

test.describe("Notifications", () => {
  test.describe("Page layout", () => {
    test("should display notifications heading", async ({
      authedPage: page,
    }) => {
      const notificationsPage = new NotificationsPage(page);
      await notificationsPage.goto();

      await expect(notificationsPage.heading).toBeVisible();
    });

    test("should show mark all as read button", async ({
      authedPage: page,
    }) => {
      const notificationsPage = new NotificationsPage(page);
      await notificationsPage.goto();

      await expect(notificationsPage.markAllReadButton).toBeVisible();
    });

    test("should show empty state for new user with no notifications", async ({
      authedPage: page,
    }) => {
      const notificationsPage = new NotificationsPage(page);
      await notificationsPage.goto();

      await notificationsPage.expectEmpty();
    });
  });

  test.describe("Mark all as read", () => {
    test("should click mark all as read without errors", async ({
      authedPage: page,
    }) => {
      const notificationsPage = new NotificationsPage(page);
      await notificationsPage.goto();

      // Click the mark all as read button - should not throw
      await notificationsPage.markAllAsRead();

      // Page should still be functional
      await expect(notificationsPage.heading).toBeVisible();
    });
  });
});
