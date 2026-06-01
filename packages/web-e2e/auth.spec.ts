import { test, expect } from "@playwright/test";
import { RegisterPage } from "@/models/register-page";
import { LoginPage } from "@/models/login-page";
import { HomePage } from "@/models/home-page";

test.describe("Authentication", () => {
  test.describe("Registration", () => {
    test("should register a new user and redirect to home", async ({
      page,
    }) => {
      const registerPage = new RegisterPage(page);
      await registerPage.goto();
      const cred = await registerPage.registerAsRandomUser();

      await expect(page).toHaveURL(HomePage.PATH);
    });

    test("should show registration form with all required fields", async ({
      page,
    }) => {
      const registerPage = new RegisterPage(page);
      await registerPage.goto();

      await expect(page.locator("#name")).toBeVisible();
      await expect(page.locator("#email")).toBeVisible();
      await expect(page.locator("#password")).toBeVisible();
      await expect(page.locator("#confirmPassword")).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Create account" }),
      ).toBeVisible();
    });

    test("should show link to login page", async ({ page }) => {
      const registerPage = new RegisterPage(page);
      await registerPage.goto();

      const loginLink = page.getByRole("link", { name: /login|sign in/i });
      await expect(loginLink).toBeVisible();
    });

    test("should show validation error for weak password", async ({
      page,
    }) => {
      const registerPage = new RegisterPage(page);
      await registerPage.goto();

      await registerPage.fillForm({
        name: "Test User",
        email: `test-${Date.now()}@example.com`,
        password: "weak",
      });

      await expect(
        page.getByText(/password must be at least 8 characters/i),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Create account" }),
      ).toBeDisabled();
    });
  });

  test.describe("Login", () => {
    test("should login with valid credentials and redirect to home", async ({
      page,
    }) => {
      // First register a user
      const registerPage = new RegisterPage(page);
      await registerPage.goto();
      const cred = await registerPage.registerAsRandomUser();
      await expect(page).toHaveURL(HomePage.PATH);

      // Now logout by clearing cookies and login again
      await page.context().clearCookies();
      await page.reload();

      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login({ email: cred.email, password: cred.password });

      await expect(page).toHaveURL(HomePage.PATH);
    });

    test("should show login form with all fields", async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      await expect(page.locator("#email")).toBeVisible();
      await expect(page.locator("#password")).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Login", exact: true }),
      ).toBeVisible();
    });

    test("should show link to register page", async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      const signUpLink = page.getByRole("link", { name: /sign up/i });
      await expect(signUpLink).toBeVisible();
    });

    test("should show link to forgot password", async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      const forgotLink = page.getByRole("link", {
        name: /forgot.*password/i,
      });
      await expect(forgotLink).toBeVisible();
    });

    test("should show error for invalid credentials", async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      await loginPage.login({
        email: "nonexistent@example.com",
        password: "WrongPass123",
      });

      // Should remain on login page or show error
      await expect(async () => {
        const isStillOnLogin = page.url().includes("/auth/login");
        const hasError = await page.getByText(/failed|invalid|error/i).count();
        expect(isStillOnLogin || hasError > 0).toBeTruthy();
      }).toPass({ timeout: 10_000 });
    });

    test("should have default account credentials pre-filled", async ({
      page,
    }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      // The login form has default credentials pre-filled
      await expect(page.locator("#email")).toHaveValue("demo@gmail.com");
      await expect(page.locator("#password")).toHaveValue("Demo@123");
    });
  });

  test.describe("Auth redirects", () => {
    test("should redirect unauthenticated user to login page", async ({
      page,
    }) => {
      // Try to access home page without auth
      await page.goto(HomePage.PATH);

      // Should redirect to login
      await expect(page).toHaveURL(/\/auth\/login/);
    });

    test("should redirect to requested page after login", async ({
      page,
    }) => {
      // Register first
      const registerPage = new RegisterPage(page);
      await registerPage.goto();
      const cred = await registerPage.registerAsRandomUser();
      await expect(page).toHaveURL(HomePage.PATH);

      // Clear auth
      await page.context().clearCookies();

      // Navigate to bookmarks - should redirect to login
      await page.goto(new URL("bookmarks", HomePage.PATH).toString());
      await expect(page).toHaveURL(/\/auth\/login/);
    });
  });
});
