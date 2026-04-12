import { Controller, Post } from '@nestjs/common';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';

import { SeedService } from './seed.service';

@Controller('seed')
export class SeedController {
  constructor(private readonly seedService: SeedService) {}

  @AllowAnonymous()
  @Post()
  async reseed() {
    return this.seedService.reseed();
  }
}
