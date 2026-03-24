import { Page } from "@playwright/test";
import { pathTo } from "@/utils/path";

export type UserCredential = {
  name: string;
  email: string;
  password: string;
};

export class HomePage {
  static readonly PATH = pathTo("/");
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto(HomePage.PATH);
  }
}
