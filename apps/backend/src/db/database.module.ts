import { Global, Module } from "@nestjs/common";

import { DatabaseService } from "./database.service";
import { databasePool } from "./pool";
import { DATABASE_POOL } from "./tokens";

@Global()
@Module({
  providers: [
    {
      provide: DATABASE_POOL,
      useValue: databasePool,
    },
    DatabaseService,
  ],
  exports: [DATABASE_POOL, DatabaseService],
})
export class DatabaseModule {}
