import { test as base, expect, type Page } from "@playwright/test";
import { RegisterPage, type UserCredential } from "@/models/register-page";
import { LoginPage } from "@/models/login-page";
import { HomePage } from "@/models/home-page";

/**
 * Custom test fixture that provides an authenticated user context.
 * A fresh user is registered before each test and the session is available.
 */
export type AuthFixtures = {
  /** Credentials of the registered user for this test. */
  userCredentials: UserCredential;
  /** A page that is already authenticated as a freshly registered user. */
  authedPage: Page;
};

export const test = base.extend<AuthFixtures>({
  userCredentials: async ({ page }, use) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();
    const cred = await registerPage.registerAsRandomUser();
    await expect(page).toHaveURL(HomePage.PATH);
    await use(cred);
  },

  authedPage: async ({ page, userCredentials: _cred }, use) => {
    // userCredentials fixture already registers + navigates to home
    await use(page);
  },
});

export { expect };
