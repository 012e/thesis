import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { closeTestApp, createTestApp } from '../helpers/app.setup';
import { runBetterAuthMigrations } from '../helpers/database.setup';
import {
  createTestAuthClient,
  TestAuthClient,
} from 'test/helpers/auth-client.helper';
import { createRabbitMQTestHelper } from '../helpers/rabbitmq-test.helper';
import {
  startTestContainers,
  stopTestContainers,
  type TestContainersContext,
} from '../helpers/testcontainers.setup';
import { userCreatedEventSchema } from '../../src/events/schemas';

describe('Auth Integration with RabbitMQ', () => {
  let testApp: Awaited<ReturnType<typeof createTestApp>>;
  let containers: TestContainersContext;
  let authClient: TestAuthClient;

  beforeAll(async () => {
    containers = await startTestContainers();
    await runBetterAuthMigrations(containers.databaseUrl);

    testApp = await createTestApp(containers);
    authClient = createTestAuthClient(testApp.app);
  }, 120000);

  afterAll(async () => {
    await closeTestApp(testApp);
    await stopTestContainers(containers);
  });

  it('publishes a user.created event after registration', async () => {
    const rabbitmq = await createRabbitMQTestHelper(
      containers.rabbitmqUrl,
      'user-events',
      ['user.created'],
    );

    try {
      const email = `test-created-${Date.now()}@example.com`;
      const name = 'Test User';
      const { data, error } = await authClient.register({
        email,
        username: `testuser-${Date.now()}`,
        password: 'TestPassword123!',
        name,
      });

      if (error) throw new Error('Registration failed');

      await rabbitmq.waitForMessages(1, 10000);

      const [message] = rabbitmq.messages;
      const payload = JSON.parse(message.content.toString('utf8'));
      const parsedEvent = userCreatedEventSchema.parse(payload);

      expect(message.fields.routingKey).toBe('user.created');
      expect(parsedEvent.data.id).toBe(data.user.id);
      expect(parsedEvent.data.email).toBe(email);
      expect(parsedEvent.data.name).toBe(name);
      expect(parsedEvent.data.emailVerified).toBe(false);
    } finally {
      await rabbitmq.disconnect();
    }
  });

  it('publishes one message per successful registration', async () => {
    const rabbitmq = await createRabbitMQTestHelper(
      containers.rabbitmqUrl,
      'user-events',
      ['user.created'],
    );

    try {
      await Promise.all([
        authClient.register({
          email: `multi-${Date.now()}-1@example.com`,
          username: `multi-${Date.now()}-1`,
          password: 'TestPassword123!',
          name: 'User One',
        }),
        authClient.register({
          email: `multi-${Date.now()}-2@example.com`,
          username: `multi-${Date.now()}-2`,
          password: 'TestPassword123!',
          name: 'User Two',
        }),
      ]);

      await rabbitmq.waitForMessages(2, 10000);

      expect(rabbitmq.messages).toHaveLength(2);
      const eventIds = rabbitmq.messages.map((message) => {
        const payload = JSON.parse(message.content.toString('utf8'));
        return userCreatedEventSchema.parse(payload).eventId;
      });

      expect(new Set(eventIds).size).toBe(2);
      expect(
        rabbitmq.messages.every(
          (message) => message.fields.routingKey === 'user.created',
        ),
      ).toBe(true);
    } finally {
      await rabbitmq.disconnect();
    }
  });
});
