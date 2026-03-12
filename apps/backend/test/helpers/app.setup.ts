import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import type { TestContainersContext } from './testcontainers.setup';

export interface TestAppContext {
  app: INestApplication;
  module: TestingModule;
}

/**
 * Bootstrap the NestJS application for testing
 * Overrides environment variables to use test containers
 */
export async function createTestApp(
  containers: TestContainersContext,
): Promise<TestAppContext> {
  // Override environment variables for testing
  process.env.DATABASE_URL = containers.databaseUrl;
  process.env.RABBITMQ_URL = containers.rabbitmqUrl;
  process.env.BETTER_AUTH_SECRET = 'test-secret-key-for-testing-only';
  process.env.BETTER_AUTH_URL = 'http://localhost:3001';
  process.env.NODE_ENV = 'test';
  process.env.PORT = '3001';

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication({
    bodyParser: false, // Required for Better Auth
  });

  app.enableCors({
    credentials: true,
    origin: '*',
  });

  await app.init();

  return {
    app,
    module: moduleFixture,
  };
}

/**
 * Close the test application
 */
export async function closeTestApp(context: TestAppContext): Promise<void> {
  await context.app.close();
}
