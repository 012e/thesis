import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { createRabbitMQTestHelper } from '../helpers/rabbitmq-test.helper';
import {
  startRabbitMQContainer,
  stopRabbitMQContainer,
  type RabbitMQContainerContext,
} from '../helpers/testcontainers.setup';

import {
  userCreatedEventSchema,
  userDeletedEventSchema,
  userUpdatedEventSchema,
} from '../../src/events/schemas';

type RabbitMqServiceLike = {
  onModuleInit: () => Promise<void>;
  onModuleDestroy: () => Promise<void>;
  publishUserCreated: (
    userId: string,
    userData: {
      email?: string;
      username?: string;
      name?: string;
      emailVerified?: boolean;
      createdAt?: Date;
      updatedAt?: Date;
    },
  ) => Promise<void>;
  publishUserUpdated: (
    userId: string,
    userData: {
      email?: string;
      username?: string;
      name?: string;
      emailVerified?: boolean;
      createdAt?: Date;
      updatedAt?: Date;
    },
    previousData?: {
      email?: string;
      username?: string;
      name?: string;
      emailVerified?: boolean;
      createdAt?: Date;
      updatedAt?: Date;
    },
  ) => Promise<void>;
  publishUserDeleted: (userId: string) => Promise<void>;
};

describe('RabbitMQService integration', () => {
  let containers: RabbitMQContainerContext;
  let service: RabbitMqServiceLike;

  beforeAll(async () => {
    containers = await startRabbitMQContainer();
    process.env.RABBITMQ_URL = containers.rabbitmqUrl;

    vi.resetModules();
    const modulePath = '../../src/events/rabbitmq.service';
    const module = (await import(modulePath)) as {
      RabbitMQService: new () => RabbitMqServiceLike;
    };
    service = new module.RabbitMQService();
    await service.onModuleInit();
  }, 120000);

  afterAll(async () => {
    if (service) {
      await service.onModuleDestroy();
    }
    await stopRabbitMQContainer(containers);
  });

  it('publishes user.created events to RabbitMQ with headers and payload', async () => {
    const rabbitmq = await createRabbitMQTestHelper(
      containers.rabbitmqUrl,
      'user-events',
      ['user.created'],
    );

    try {
      await service.publishUserCreated('user-created-1', {
        email: 'created@example.com',
        username: 'created-user',
        name: 'Created User',
        emailVerified: true,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-02T00:00:00.000Z'),
      });

      await rabbitmq.waitForMessages(1, 10000);

      const [message] = rabbitmq.messages;
      const headers = message.properties.headers ?? {};
      const payload = userCreatedEventSchema.parse(
        JSON.parse(message.content.toString('utf8')),
      );

      expect(message.fields.routingKey).toBe('user.created');
      expect(message.properties.contentType).toBe('application/json');
      expect(headers['event-type']).toBe('user.created');
      expect(headers['event-version']).toBe('1.0.0');
      expect(headers['event-id']).toBe(payload.eventId);
      expect(payload.data).toMatchObject({
        id: 'user-created-1',
        email: 'created@example.com',
        username: 'created-user',
        name: 'Created User',
        emailVerified: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
      });
    } finally {
      await rabbitmq.disconnect();
    }
  });

  it('publishes user.updated events with the previous version snapshot', async () => {
    const rabbitmq = await createRabbitMQTestHelper(
      containers.rabbitmqUrl,
      'user-events',
      ['user.updated'],
    );

    try {
      await service.publishUserUpdated(
        'user-updated-1',
        {
          email: 'new@example.com',
          username: 'new-user',
          name: 'New Name',
          emailVerified: true,
          createdAt: new Date('2024-01-01T00:00:00.000Z'),
        },
        {
          email: 'old@example.com',
          username: 'old-user',
          name: 'Old Name',
          emailVerified: false,
          createdAt: new Date('2024-01-01T00:00:00.000Z'),
          updatedAt: new Date('2024-01-03T00:00:00.000Z'),
        },
      );

      await rabbitmq.waitForMessages(1, 10000);

      const [message] = rabbitmq.messages;
      const payload = userUpdatedEventSchema.parse(
        JSON.parse(message.content.toString('utf8')),
      );

      expect(message.fields.routingKey).toBe('user.updated');
      expect(payload.data).toMatchObject({
        id: 'user-updated-1',
        email: 'new@example.com',
        username: 'new-user',
        name: 'New Name',
        emailVerified: true,
      });
      expect(payload.data.previousVersion).toMatchObject({
        id: 'user-updated-1',
        email: 'old@example.com',
        username: 'old-user',
        name: 'Old Name',
        emailVerified: false,
        updatedAt: '2024-01-03T00:00:00.000Z',
      });
    } finally {
      await rabbitmq.disconnect();
    }
  });

  it('publishes user.deleted events without leaking user profile fields', async () => {
    const rabbitmq = await createRabbitMQTestHelper(
      containers.rabbitmqUrl,
      'user-events',
      ['user.deleted'],
    );

    try {
      await service.publishUserDeleted('user-deleted-1');

      await rabbitmq.waitForMessages(1, 10000);

      const [message] = rabbitmq.messages;
      const headers = message.properties.headers ?? {};
      const payload = userDeletedEventSchema.parse(
        JSON.parse(message.content.toString('utf8')),
      );

      expect(message.fields.routingKey).toBe('user.deleted');
      expect(payload.data.id).toBe('user-deleted-1');
      expect(payload.data).not.toHaveProperty('email');
      expect(payload.data).not.toHaveProperty('name');
      expect(headers['event-type']).toBe('user.deleted');
    } finally {
      await rabbitmq.disconnect();
    }
  });
});
