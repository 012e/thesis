import { test, expect } from "@playwright/test";
import { RegisterPage } from "@/models/register-page";
import { HomePage } from "@/models/home-page";

test("Must be able to login", async ({ page }) => {
  const registerPage = new RegisterPage(page);
  await registerPage.goto();
  await registerPage.registerAsRandomUser();

  // Verify redirection to home page
  await expect(page).toHaveURL(HomePage.PATH);
});
