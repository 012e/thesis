import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import {
  RabbitMQContainer,
  StartedRabbitMQContainer,
} from '@testcontainers/rabbitmq';
import { NestExpressApplication } from '@nestjs/platform-express';
import { runBetterAuthMigrations } from '../helpers/database.setup';
import {
  createTestAuthClient,
  TestAuthClient,
} from 'test/helpers/auth-client.helper';
import getPort from 'get-port';

describe('Auth Integration Tests (Simple)', () => {
  let app: NestExpressApplication;
  let postgres: StartedPostgreSqlContainer;
  let rabbitmq: StartedRabbitMQContainer;
  let authClient: TestAuthClient;

  beforeAll(async () => {
    // Containers
    postgres = await new PostgreSqlContainer('postgres:18.1-alpine')
      .withUsername('testuser')
      .withPassword('testpass')
      .withDatabase('testdb')
      .start();

    rabbitmq = await new RabbitMQContainer(
      'rabbitmq:4.1-management-alpine',
    ).start();

    const databaseUrl = postgres.getConnectionUri();
    const rabbitmqUrl = rabbitmq.getAmqpUrl();

    await runBetterAuthMigrations(databaseUrl);

    // Environment Injection
    const randomPort = await getPort();
    process.env.DATABASE_URL = databaseUrl;
    process.env.RABBITMQ_URL = rabbitmqUrl;
    process.env.BETTER_AUTH_SECRET = 'test-secret-key';
    process.env.BETTER_AUTH_URL = `http://localhost:${randomPort}`;
    process.env.NODE_ENV = 'test';
    process.env.PORT = randomPort.toString();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    // 2. Explicitly cast the application instance
    app = moduleFixture.createNestApplication<NestExpressApplication>({
      bodyParser: false,
    });

    app.enableCors({ credentials: true, origin: '*' });

    await app.listen(randomPort);
    authClient = createTestAuthClient(app);
  }, 120000);

  afterAll(async () => {
    // Optional chaining/checks ensure we don't call methods on undefined if beforeAll fails
    await app?.close();
    await rabbitmq?.stop();
    await postgres?.stop();
  });

  describe('Better Auth endpoints', () => {
    // ... Note: authClient is already type-safe via TestAuthClient import
    it('should create a new user', async () => {
      const email = `test-${Date.now()}@example.com`;

      // authClient methods are typed based on your helper
      const { data, error } = await authClient.register({
        email,
        username: 'test username',
        password: 'TestPassword123!',
        name: 'Test User',
      });

      if (error) throw new Error('Registration failed');

      expect(data.user).toBeDefined();
      expect(data.user.email).toBe(email);
    });
  });
});
