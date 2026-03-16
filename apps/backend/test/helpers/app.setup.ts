import { Test, TestingModule } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
import getPort from 'get-port';

import type { TestContainersContext } from './testcontainers.setup';

export interface TestAppContext {
  app: NestExpressApplication;
  module: TestingModule;
  baseUrl: string;
}

/**
 * Bootstrap the NestJS application for testing
 * Overrides environment variables to use test containers
 */
export async function createTestApp(
  containers: TestContainersContext,
): Promise<TestAppContext> {
  const appModulePath = '../../src/app.module';
  const port = await getPort();

  process.env.DATABASE_URL = containers.databaseUrl;
  process.env.RABBITMQ_URL = containers.rabbitmqUrl;
  process.env.BETTER_AUTH_SECRET = 'test-secret-key-for-testing-only';
  process.env.BETTER_AUTH_URL = `http://localhost:${port}`;
  process.env.NODE_ENV = 'test';
  process.env.PORT = port.toString();

  const { AppModule } = await import(appModulePath);

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication<NestExpressApplication>({
    bodyParser: false, // Required for Better Auth
  });

  app.enableCors({
    credentials: true,
    origin: '*',
  });

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
