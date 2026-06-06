import { expect, Page } from "@playwright/test";
import { faker } from "@faker-js/faker";
import { pathTo } from "@/utils/path";

export type UserCredential = {
  name: string;
  username: string;
  email: string;
  password: string;
};

export class RegisterPage {
  static readonly PATH = pathTo("auth", "register");
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto(RegisterPage.PATH);
  }

  private getRandomCred(): UserCredential {
    const firstName = faker.person
      .firstName()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
    const timestamp = Date.now();

    return {
      // Result: john-1711206292000@example.com
      email: `${firstName}-${timestamp}@example.com`,
      password: "Test@" + faker.string.alphanumeric(8) + "1",
      name: faker.person.fullName(),
      username: `${firstName}${timestamp}`,
    };
  }

  async fillForm(cred: UserCredential) {
    await this.page.locator("#name").fill(cred.name);
    await this.page.locator("#username").fill(cred.username);
    await this.page.locator("#email").fill(cred.email);
    await this.page.locator("#password").fill(cred.password);
    await this.page.locator("#confirmPassword").fill(cred.password);
  }

  async submit() {
    const submitButton = this.page.getByRole("button", {
      name: "Create account",
    });
    await expect(submitButton).toBeEnabled();
    await submitButton.click();
  }

  async register(cred: UserCredential) {
    await this.fillForm(cred);
    await this.submit();
  }

  async registerAsRandomUser(): Promise<UserCredential> {
    const cred = this.getRandomCred();
    await this.register(cred);
    return cred;
  }
}
