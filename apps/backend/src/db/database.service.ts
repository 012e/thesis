import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { DATABASE_POOL } from './tokens';
import * as schema from './schema';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  public readonly db: NodePgDatabase<typeof schema>;

  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {
    this.db = drizzle({ client: pool, schema });
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
