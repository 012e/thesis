import { Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { AllowAnonymous } from "@thallesp/nestjs-better-auth";

import { MigrateService } from "./migrate.service";

@Controller("migrate")
@AllowAnonymous()
export class MigrateController {
  constructor(private readonly migrateService: MigrateService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  run() {
    return this.migrateService.run();
  }
}
