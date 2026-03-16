import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';

export interface PostgresContainerContext {
  postgres: StartedPostgreSqlContainer;
  databaseUrl: string;
}

export async function startPostgresContainer(): Promise<PostgresContainerContext> {
  console.log('Starting PostgreSQL container...');
  const postgres = await new PostgreSqlContainer('postgres:18.1-alpine')
    .withUsername('testuser')
    .withPassword('testpass')
    .withDatabase('testdb')
    .withExposedPorts(5432)
    .start();

  const databaseUrl = postgres.getConnectionUri();
  console.log(`PostgreSQL started at ${databaseUrl}`);

  return {
    postgres,
    databaseUrl,
  };
}

export async function stopPostgresContainer(
  context: PostgresContainerContext,
): Promise<void> {
  console.log('Stopping PostgreSQL container...');
  await context.postgres.stop();
  console.log('PostgreSQL container stopped');
}
