import { Inject, Injectable, Logger } from "@nestjs/common";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import * as path from "path";

import { DATABASE_POOL } from "@/db/tokens";

@Injectable()
export class MigrateService {
  private readonly logger = new Logger(MigrateService.name);

  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async run(): Promise<{ ok: boolean; message: string }> {
    // __dirname resolves to dist/migrate at runtime; drizzle/ sits two levels up
    const migrationsFolder = path.join(__dirname, "../../drizzle");

    this.logger.log(`Applying migrations from ${migrationsFolder}`);

    const db = drizzle({ client: this.pool });
    await migrate(db, { migrationsFolder });

    this.logger.log("Migrations completed successfully");

    return { ok: true, message: "Migrations applied successfully" };
  }
}
