import { readFile, readdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { Pool } from 'pg';

export async function runBetterAuthMigrations(
  databaseUrl: string,
): Promise<void> {
  const pool = new Pool({ connectionString: databaseUrl });

  const migrationsDir = resolve(__dirname, '../../drizzle');

  try {
    const files = await readdir(migrationsDir);
    const sqlFiles = files.filter((file) => file.endsWith('.sql')).sort();

    for (const file of sqlFiles) {
      const migrationPath = join(migrationsDir, file);
      const migrationSql = await readFile(migrationPath, 'utf8');

      if (migrationSql.trim().length > 0) {
        await pool.query(migrationSql);
      }
    }
  } finally {
    await pool.end();
  }
}
