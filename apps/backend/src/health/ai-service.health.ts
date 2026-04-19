import { Injectable } from "@nestjs/common";
import { HttpHealthIndicator, HealthIndicatorService } from "@nestjs/terminus";
import { env } from "@/env";

@Injectable()
export class AiServiceHealthIndicator {
  constructor(
    private readonly healthIndicatorService: HealthIndicatorService,
    private readonly http: HttpHealthIndicator,
  ) {}

  async isHealthy(key: string) {
    try {
      // Try to ping the AI service health endpoint or root endpoint
      return await this.http.pingCheck(key, `${env.AI_SERVICE_URL}/health`);
    } catch {
      // If health endpoint doesn't exist, try the root
      try {
        return await this.http.pingCheck(key, env.AI_SERVICE_URL);
      } catch (fallbackError) {
        const indicator = this.healthIndicatorService.check(key);
        return indicator.down({
          message:
            fallbackError instanceof Error
              ? fallbackError.message
              : "Unknown error",
        });
      }
    }
  }
}
