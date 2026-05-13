import { Controller, Post, Query } from "@nestjs/common";
import { AllowAnonymous } from "@thallesp/nestjs-better-auth";

import { SeedService } from "./seed.service";

@Controller("seed")
export class SeedController {
  constructor(private readonly seedService: SeedService) {}

  @AllowAnonymous()
  @Post()
  async reseed(@Query("size") size?: string) {
    const seedSize = size === "big" ? "big" : "small";
    return this.seedService.reseed(seedSize);
  }
}
