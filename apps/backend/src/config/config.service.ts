import { Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DatabaseService } from "@/db/database.service";
import { appConfig } from "@/db/schema";
import { AppConfigSchema } from "./config.registry";
import type { AppConfig, AppConfigNamespace } from "./config.registry";

@Injectable()
export class ConfigService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getAll(): Promise<AppConfig> {
    const rows = await this.databaseService.db
      .select()
      .from(appConfig);

    const partial: Record<string, unknown> = {};
    for (const row of rows) {
      partial[row.namespace] = row.value;
    }

    return AppConfigSchema.parse(partial);
  }

  async get<K extends AppConfigNamespace>(namespace: K): Promise<AppConfig[K]> {
    const [row] = await this.databaseService.db
      .select()
      .from(appConfig)
      .where(eq(appConfig.namespace, namespace))
      .limit(1);

    const namespaceSchema = AppConfigSchema.shape[namespace];
    return namespaceSchema.parse(row?.value ?? {}) as AppConfig[K];
  }

  async set<K extends AppConfigNamespace>(
    namespace: K,
    value: AppConfig[K],
  ): Promise<void> {
    const namespaceSchema = AppConfigSchema.shape[namespace];
    const validated = namespaceSchema.parse(value);

    await this.databaseService.db
      .insert(appConfig)
      .values({ namespace, value: validated })
      .onConflictDoUpdate({
        target: appConfig.namespace,
        set: {
          value: validated,
          updatedAt: new Date(),
        },
      });
  }
}
