import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Pool } from 'pg';

import { getMigrations } from 'better-auth/db';
import { jwt, username } from 'better-auth/plugins';

const appMigrationPaths = [
  resolve(__dirname, '../../drizzle/0000_nifty_spectrum.sql'),
  resolve(__dirname, '../../drizzle/0001_add_users_view.sql'),
];

/**
 * Run Better Auth and application migrations on the test database.
 */
export async function runBetterAuthMigrations(
  databaseUrl: string,
): Promise<void> {
  const pool = new Pool({ connectionString: databaseUrl });
  const { compileMigrations } = await getMigrations({
    database: pool,
    trustedOrigins: ['*'],
    secret: 'test-secret-key-for-testing-only',
    baseURL: 'http://localhost:3000',
    emailAndPassword: {
      enabled: true,
    },
    plugins: [username(), jwt()],
  });

  const sql = await compileMigrations();

  try {
    await pool.query(sql);

    for (const migrationPath of appMigrationPaths) {
      const migrationSql = await readFile(migrationPath, 'utf8');

      if (migrationSql.trim().length > 0) {
        await pool.query(migrationSql);
      }
    }
  } finally {
    await pool.end();
  }
}
