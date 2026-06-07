import { Test, TestingModule, TestingModuleBuilder } from "@nestjs/testing";
import { NestExpressApplication } from "@nestjs/platform-express";
import { IoAdapter } from "@nestjs/platform-socket.io";
import { PgBossService } from "@wavezync/nestjs-pgboss";
import { PGBOSS_TOKEN } from "@wavezync/nestjs-pgboss/dist/utils/consts";
import getPort from "get-port";

import type {
  PostgresContainerContext,
  MinioContainerContext,
} from "./testcontainers.setup";

export interface TestAppContext {
  app: NestExpressApplication;
  module: TestingModule;
  baseUrl: string;
}

/**
 * Bootstrap the NestJS application for testing.
 * Overrides environment variables to use the test Postgres container.
 */
export async function createTestApp(
  containers: PostgresContainerContext,
  overrides?: (builder: TestingModuleBuilder) => TestingModuleBuilder,
  minioContainer?: MinioContainerContext,
): Promise<TestAppContext> {
  const appModulePath = "../../src/app.module";
  const port = await getPort();

  process.env.DATABASE_URL = containers.databaseUrl;
  process.env.BETTER_AUTH_SECRET = "test-secret-key-for-testing-only";
  process.env.BETTER_AUTH_URL = `http://localhost:${port}`;
  process.env.NODE_ENV = "test";
  process.env.PORT = port.toString();

  // Configure MinIO if provided
  if (minioContainer) {
    process.env.MINIO_ENDPOINT = minioContainer.endpoint.split(":")[0];
    process.env.MINIO_PORT = minioContainer.port.toString();
    process.env.MINIO_ACCESS_KEY = minioContainer.accessKey;
    process.env.MINIO_SECRET_KEY = minioContainer.secretKey;
    process.env.MINIO_BUCKET = "test-bucket";
    process.env.MINIO_PUBLIC_URL = minioContainer.publicUrl;
    process.env.MINIO_USE_SSL = "false";
  }

  const { AppModule } = await import(appModulePath);

  let moduleBuilder: TestingModuleBuilder = Test.createTestingModule({
    imports: [AppModule],
  });

  moduleBuilder = moduleBuilder
    .overrideProvider(PGBOSS_TOKEN)
    .useValue({ on: () => undefined, stop: async () => undefined })
    .overrideProvider(PgBossService)
    .useValue({
      scheduleJob: async () => undefined,
      scheduleCronJob: async () => undefined,
      registerJob: async () => undefined,
      registerCronJob: async () => undefined,
    });

  if (overrides) {
    moduleBuilder = overrides(moduleBuilder);
  }

  const moduleFixture: TestingModule = await moduleBuilder.compile();

  const app = moduleFixture.createNestApplication<NestExpressApplication>({
    bodyParser: false, // Required for Better Auth
  });

  app.enableCors({
    credentials: true,
    origin: "*",
  });

  // Enable Socket.IO WebSocket adapter (required for MessagesGateway)
  app.useWebSocketAdapter(new IoAdapter(app));

  await app.listen(port);

  return {
    app,
    module: moduleFixture,
    baseUrl: `http://localhost:${port}`,
  };
}

/**
 * Close the test application
 */
export async function closeTestApp(context: TestAppContext): Promise<void> {
  await context.app.close();
}
