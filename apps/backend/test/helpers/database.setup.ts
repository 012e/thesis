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

    console.log(
      `[Migrations] Found ${sqlFiles.length} migration files in ${migrationsDir}`,
    );

    for (const file of sqlFiles) {
      const migrationPath = join(migrationsDir, file);
      const migrationSql = await readFile(migrationPath, 'utf8');

      if (migrationSql.trim().length > 0) {
        console.log(`[Migrations] Executing ${file}...`);
        try {
          await pool.query(migrationSql);
        } catch (e) {
          console.error(`[Migrations] Error executing ${file}:`, e);
          throw e;
        }
      }
    }
    console.log(`[Migrations] All migrations executed successfully`);
  } finally {
    await pool.end();
  }
}
