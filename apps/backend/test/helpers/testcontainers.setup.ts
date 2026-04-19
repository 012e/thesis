import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { GenericContainer, StartedTestContainer } from "testcontainers";

export interface PostgresContainerContext {
  postgres: StartedPostgreSqlContainer;
  databaseUrl: string;
}

export interface MinioContainerContext {
  container: StartedTestContainer;
  endpoint: string;
  port: number;
  consolePort: number;
  accessKey: string;
  secretKey: string;
  publicUrl: string;
}

export async function startPostgresContainer(): Promise<PostgresContainerContext> {
  console.log("Starting ParadeDB container...");
  const postgres = await new PostgreSqlContainer("paradedb/paradedb:latest")
    .withUsername("testuser")
    .withPassword("testpass")
    .withDatabase("testdb")
    .withExposedPorts(5432)
    .start();

  const databaseUrl = postgres.getConnectionUri();
  console.log(`ParadeDB started at ${databaseUrl}`);

  return {
    postgres,
    databaseUrl,
  };
}

export async function stopPostgresContainer(
  context: PostgresContainerContext,
): Promise<void> {
  console.log("Stopping PostgreSQL container...");
  await context.postgres.stop();
  console.log("PostgreSQL container stopped");
}

export async function startMinioContainer(): Promise<MinioContainerContext> {
  console.log("Starting MinIO container...");

  const accessKey = "minioadmin";
  const secretKey = "minioadmin";

  const container = await new GenericContainer("minio/minio:latest")
    .withCommand(["server", "/data", "--console-address", ":9001"])
    .withEnvironment({
      MINIO_ROOT_USER: accessKey,
      MINIO_ROOT_PASSWORD: secretKey,
    })
    .withExposedPorts(9000, 9001)
    .start();

  const port = container.getMappedPort(9000);
  const consolePort = container.getMappedPort(9001);
  const host = container.getHost();
  const endpoint = `${host}:${port}`;
  const publicUrl = `http://${host}:${port}`;

  console.log(`MinIO started at ${endpoint} (console: ${consolePort})`);

  return {
    container,
    endpoint,
    port,
    consolePort,
    accessKey,
    secretKey,
    publicUrl,
  };
}

export async function stopMinioContainer(
  context: MinioContainerContext,
): Promise<void> {
  console.log("Stopping MinIO container...");
  await context.container.stop();
  console.log("MinIO container stopped");
}
