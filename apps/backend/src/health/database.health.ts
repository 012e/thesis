import { Injectable } from "@nestjs/common";
import { HealthIndicatorService } from "@nestjs/terminus";
import { DatabaseService } from "@/db/database.service";

@Injectable()
export class DatabaseHealthIndicator {
  constructor(
    private readonly healthIndicatorService: HealthIndicatorService,
    private readonly databaseService: DatabaseService,
  ) {}

  async isHealthy(key: string) {
    const indicator = this.healthIndicatorService.check(key);
    try {
      // Execute a simple query to verify database connectivity
      await this.databaseService.db.execute("SELECT NOW()");
      return indicator.up();
    } catch (error) {
      return indicator.down({
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
}
