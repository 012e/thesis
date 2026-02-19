import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { NestExpressApplication } from '@nestjs/platform-express';
import { runBetterAuthMigrations } from '../helpers/database.setup';
import {
  createTestAuthClient,
  TestAuthClient,
} from 'test/helpers/auth-client.helper';
import { RabbitMQService } from '../../src/events/rabbitmq.service';

describe('Auth Integration with RabbitMQ (Mocked)', () => {
  let app: NestExpressApplication;
  let postgres: StartedPostgreSqlContainer;
  let authClient: TestAuthClient;
  let rabbitMQService: RabbitMQService;
  let publishUserCreatedSpy: ReturnType<typeof vi.spyOn>;
  let publishUserUpdatedSpy: ReturnType<typeof vi.spyOn>;
  let publishUserDeletedSpy: ReturnType<typeof vi.spyOn>;

  beforeAll(async () => {
    // Start PostgreSQL container
    postgres = await new PostgreSqlContainer('postgres:18.1-alpine')
      .withUsername('testuser')
      .withPassword('testpass')
      .withDatabase('testdb')
      .start();

    const databaseUrl = postgres.getConnectionUri();
    await runBetterAuthMigrations(databaseUrl);

    // Environment Injection
    process.env.DATABASE_URL = databaseUrl;
    process.env.RABBITMQ_URL = 'amqp://mock:mock@localhost:5672'; // Mock URL
    process.env.BETTER_AUTH_SECRET = 'test-secret-key';
    process.env.BETTER_AUTH_URL = 'http://localhost:3004';
    process.env.NODE_ENV = 'test';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>({
      bodyParser: false,
    });

    // Get RabbitMQ service and mock its methods
    rabbitMQService = app.get<RabbitMQService>(RabbitMQService);

    // Spy on RabbitMQ methods
    publishUserCreatedSpy = vi
      .spyOn(rabbitMQService, 'publishUserCreated')
      .mockResolvedValue(undefined);
    publishUserUpdatedSpy = vi
      .spyOn(rabbitMQService, 'publishUserUpdated')
      .mockResolvedValue(undefined);
    publishUserDeletedSpy = vi
      .spyOn(rabbitMQService, 'publishUserDeleted')
      .mockResolvedValue(undefined);

    app.enableCors({ credentials: true, origin: '*' });

    await app.listen(3004);
    authClient = createTestAuthClient(app);
  }, 120000);

  afterAll(async () => {
    await app?.close();
    await postgres?.stop();
  });

  describe('User Registration', () => {
    it('should call publishUserCreated when a new user registers', async () => {
      const email = `test-created-${Date.now()}@example.com`;
      const username = `testuser${Date.now()}`;
      const name = 'Test User';

      const { data, error } = await authClient.register({
        email,
        username,
        password: 'TestPassword123!',
        name,
      });

      if (error) throw new Error('Registration failed');
      expect(data.user).toBeDefined();

      // Verify RabbitMQ service was called
      expect(publishUserCreatedSpy).toHaveBeenCalledTimes(1);

      // Verify it was called with correct user ID and data
      const [userId, userData] = publishUserCreatedSpy.mock.calls[0];
      expect(userId).toBe(data.user.id);
      expect(userData.email).toBe(email);
      expect(userData.name).toBe(name);

      // Reset spy for next test
      publishUserCreatedSpy.mockClear();
    });

    it('should call publishUserCreated with correct user data structure', async () => {
      const email = `test-structure-${Date.now()}@example.com`;
      const username = `user${Date.now()}`;
      const name = 'Structure Test';

      const { data, error } = await authClient.register({
        email,
        username,
        password: 'TestPassword123!',
        name,
      });

      if (error) throw new Error('Registration failed');

      expect(publishUserCreatedSpy).toHaveBeenCalledTimes(1);

      const [userId, userData] = publishUserCreatedSpy.mock.calls[0];

      // Verify user data structure
      expect(userId).toBeDefined();
      expect(typeof userId).toBe('string');

      expect(userData).toHaveProperty('email');
      expect(userData).toHaveProperty('name');
      expect(userData).toHaveProperty('emailVerified');
      expect(userData).toHaveProperty('createdAt');
      expect(userData).toHaveProperty('updatedAt');

      expect(userData.email).toBe(email);
      expect(userData.name).toBe(name);

      publishUserCreatedSpy.mockClear();
    });

    it('should call publishUserCreated for multiple user registrations', async () => {
      for (let i = 0; i < 3; i++) {
        const email = `test-multi-${Date.now()}-${i}@example.com`;
        await authClient.register({
          email,
          username: `user${Date.now()}${i}`,
          password: 'TestPassword123!',
          name: `User ${i}`,
        });
      }

      // Should have been called 3 times
      expect(publishUserCreatedSpy).toHaveBeenCalledTimes(3);

      // Verify each call had unique user IDs
      const userIds = publishUserCreatedSpy.mock.calls.map(
        ([userId]) => userId,
      );
      const uniqueIds = new Set(userIds);
      expect(uniqueIds.size).toBe(3);

      publishUserCreatedSpy.mockClear();
    });
  });

  describe('User Data Validation', () => {
    it('should pass email verification status correctly', async () => {
      const email = `test-verified-${Date.now()}@example.com`;

      const { data, error } = await authClient.register({
        email,
        username: `user${Date.now()}`,
        password: 'TestPassword123!',
        name: 'Verified Test',
      });

      if (error) throw new Error('Registration failed');

      const [, userData] = publishUserCreatedSpy.mock.calls[0];

      // New users should not be verified by default
      expect(userData.emailVerified).toBe(false);

      publishUserCreatedSpy.mockClear();
    });

    it('should include timestamps in user data', async () => {
      const email = `test-timestamps-${Date.now()}@example.com`;

      const { data, error } = await authClient.register({
        email,
        username: `user${Date.now()}`,
        password: 'TestPassword123!',
        name: 'Timestamp Test',
      });

      if (error) throw new Error('Registration failed');

      const [, userData] = publishUserCreatedSpy.mock.calls[0];

      expect(userData.createdAt).toBeDefined();
      expect(userData.updatedAt).toBeDefined();

      // Verify they are valid dates
      expect(() => new Date(userData.createdAt)).not.toThrow();
      expect(() => new Date(userData.updatedAt)).not.toThrow();

      publishUserCreatedSpy.mockClear();
    });
  });

  describe('Event Publishing Guarantee', () => {
    it('should call publishUserCreated exactly once per registration', async () => {
      const email = `test-once-${Date.now()}@example.com`;

      await authClient.register({
        email,
        username: `user${Date.now()}`,
        password: 'TestPassword123!',
        name: 'Once Test',
      });

      // Should be called exactly once, not zero or multiple times
      expect(publishUserCreatedSpy).toHaveBeenCalledTimes(1);

      publishUserCreatedSpy.mockClear();
    });

    it('should not call other event methods during registration', async () => {
      const email = `test-isolation-${Date.now()}@example.com`;

      await authClient.register({
        email,
        username: `user${Date.now()}`,
        password: 'TestPassword123!',
        name: 'Isolation Test',
      });

      // Only publishUserCreated should be called
      expect(publishUserCreatedSpy).toHaveBeenCalledTimes(1);
      expect(publishUserUpdatedSpy).not.toHaveBeenCalled();
      expect(publishUserDeletedSpy).not.toHaveBeenCalled();

      publishUserCreatedSpy.mockClear();
    });
  });
});
