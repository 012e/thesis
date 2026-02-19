import { Pool } from 'pg';

import { getMigrations } from 'better-auth/db';
import { authConfigurtion } from '@/auth';

/**
 * Run Better Auth migrations on the test database
 * This will create the necessary tables and apply all migrations
 */
export async function runBetterAuthMigrations(
  databaseUrl: string,
): Promise<void> {
  const pool = new Pool({ connectionString: databaseUrl });
  const { compileMigrations } = await getMigrations(authConfigurtion);

  const sql = await compileMigrations();

  try {
    await pool.query(sql);
  } finally {
    await pool.end();
  }
}
