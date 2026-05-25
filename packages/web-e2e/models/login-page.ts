import { Page } from "@playwright/test";
import { pathTo } from "@/utils/path";

export type LoginCredential = {
  email: string;
  password: string;
};

export class LoginPage {
  static readonly PATH = pathTo("auth", "login");
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto(LoginPage.PATH);
  }

  async login(cred: LoginCredential) {
    await this.page.locator("#email").fill(cred.email);
    await this.page.locator("#password").fill(cred.password);
    await this.page.getByRole("button", { name: "Login" }).click();
  }
}
