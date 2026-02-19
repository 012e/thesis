import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RabbitMQService } from '../../src/events/rabbitmq.service';
import {
  userCreatedEventSchema,
  userUpdatedEventSchema,
  userDeletedEventSchema,
  type UserCreatedEvent,
  type UserUpdatedEvent,
  type UserDeletedEvent,
} from '../../src/events/schemas';

describe('RabbitMQ Service Unit Tests', () => {
  let service: RabbitMQService;
  let mockPublish: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    service = new RabbitMQService();

    // Mock the internal channel and publishUserEvent method
    mockPublish = vi.fn().mockResolvedValue(undefined);
    (service as any).channel = {
      publish: vi.fn().mockReturnValue(true),
      assertExchange: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    };

    // Spy on publishUserEvent
    vi.spyOn(service as any, 'publishUserEvent').mockImplementation(
      mockPublish,
    );
  });

  describe('publishUserCreated', () => {
    it('should publish user.created event with correct structure', async () => {
      const userId = 'test-user-123';
      const userData = {
        email: 'test@example.com',
        username: 'testuser',
        name: 'Test User',
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await service.publishUserCreated(userId, userData);

      expect(mockPublish).toHaveBeenCalledTimes(1);
      const [event, routingKey] = mockPublish.mock.calls[0];

      // Verify routing key
      expect(routingKey).toBe('user.created');

      // Verify event structure
      expect(event.eventType).toBe('user.created');
      expect(event.eventVersion).toBe('1.0.0');
      expect(event.source).toBe('auth-service');
      expect(event.eventId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
      expect(event.timestamp).toBeDefined();

      // Verify user data
      expect(event.data.id).toBe(userId);
      expect(event.data.email).toBe(userData.email);
      expect(event.data.username).toBe(userData.username);
      expect(event.data.name).toBe(userData.name);
      expect(event.data.emailVerified).toBe(false);

      // Validate against schema
      const validationResult = userCreatedEventSchema.safeParse(event);
      expect(validationResult.success).toBe(true);
    });

    it('should handle user creation with minimal data', async () => {
      const userId = 'test-user-456';
      const userData = {
        email: 'minimal@example.com',
      };

      await service.publishUserCreated(userId, userData);

      expect(mockPublish).toHaveBeenCalledTimes(1);
      const [event] = mockPublish.mock.calls[0];

      expect(event.data.id).toBe(userId);
      expect(event.data.email).toBe(userData.email);
      expect(event.data.emailVerified).toBe(false);
      expect(event.data.username).toBeUndefined();
      expect(event.data.name).toBeUndefined();
    });

    it('should include ISO timestamps', async () => {
      const userId = 'test-user-789';
      const userData = {
        email: 'time@example.com',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-02T00:00:00Z'),
      };

      await service.publishUserCreated(userId, userData);

      const [event] = mockPublish.mock.calls[0];

      expect(event.data.createdAt).toBe('2024-01-01T00:00:00.000Z');
      expect(event.data.updatedAt).toBe('2024-01-02T00:00:00.000Z');
      expect(event.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('publishUserUpdated', () => {
    it('should publish user.updated event with correct structure', async () => {
      const userId = 'test-user-update-123';
      const userData = {
        email: 'updated@example.com',
        username: 'updateduser',
        name: 'Updated User',
        emailVerified: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date(),
      };

      await service.publishUserUpdated(userId, userData);

      expect(mockPublish).toHaveBeenCalledTimes(1);
      const [event, routingKey] = mockPublish.mock.calls[0];

      // Verify routing key
      expect(routingKey).toBe('user.updated');

      // Verify event structure
      expect(event.eventType).toBe('user.updated');
      expect(event.eventVersion).toBe('1.0.0');
      expect(event.source).toBe('auth-service');

      // Verify user data
      expect(event.data.id).toBe(userId);
      expect(event.data.email).toBe(userData.email);
      expect(event.data.emailVerified).toBe(true);

      // Validate against schema
      const validationResult = userUpdatedEventSchema.safeParse(event);
      expect(validationResult.success).toBe(true);
    });

    it('should include previousVersion when provided', async () => {
      const userId = 'test-user-update-456';
      const userData = {
        email: 'new@example.com',
        name: 'New Name',
        emailVerified: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date(),
      };
      const previousData = {
        email: 'old@example.com',
        name: 'Old Name',
        emailVerified: false,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      };

      await service.publishUserUpdated(userId, userData, previousData);

      const [event] = mockPublish.mock.calls[0];

      expect(event.data.previousVersion).toBeDefined();
      expect(event.data.previousVersion.email).toBe('old@example.com');
      expect(event.data.previousVersion.name).toBe('Old Name');
      expect(event.data.previousVersion.emailVerified).toBe(false);
    });

    it('should work without previousVersion', async () => {
      const userId = 'test-user-update-789';
      const userData = {
        email: 'solo@example.com',
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await service.publishUserUpdated(userId, userData);

      const [event] = mockPublish.mock.calls[0];

      expect(event.data.previousVersion).toBeUndefined();
      expect(event.data.email).toBe('solo@example.com');
    });
  });

  describe('publishUserDeleted', () => {
    it('should publish user.deleted event with correct structure', async () => {
      const userId = 'test-user-delete-123';

      await service.publishUserDeleted(userId);

      expect(mockPublish).toHaveBeenCalledTimes(1);
      const [event, routingKey] = mockPublish.mock.calls[0];

      // Verify routing key
      expect(routingKey).toBe('user.deleted');

      // Verify event structure
      expect(event.eventType).toBe('user.deleted');
      expect(event.eventVersion).toBe('1.0.0');
      expect(event.source).toBe('auth-service');

      // Verify data contains only id and deletedAt
      expect(event.data.id).toBe(userId);
      expect(event.data.deletedAt).toBeDefined();
      expect(event.data.deletedAt).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
      );

      // Should not contain sensitive data
      expect(event.data).not.toHaveProperty('email');
      expect(event.data).not.toHaveProperty('name');

      // Validate against schema
      const validationResult = userDeletedEventSchema.safeParse(event);
      expect(validationResult.success).toBe(true);
    });

    it('should generate unique event IDs for multiple deletions', async () => {
      await service.publishUserDeleted('user-1');
      await service.publishUserDeleted('user-2');
      await service.publishUserDeleted('user-3');

      expect(mockPublish).toHaveBeenCalledTimes(3);

      const eventIds = mockPublish.mock.calls.map(([event]) => event.eventId);
      const uniqueIds = new Set(eventIds);

      expect(uniqueIds.size).toBe(3);
    });
  });

  describe('Event metadata', () => {
    it('should generate unique event IDs for each event', async () => {
      await service.publishUserCreated('user-1', {
        email: 'test1@example.com',
      });
      await service.publishUserCreated('user-2', {
        email: 'test2@example.com',
      });
      await service.publishUserUpdated('user-3', {
        email: 'test3@example.com',
      });
      await service.publishUserDeleted('user-4');

      const eventIds = mockPublish.mock.calls.map(([event]) => event.eventId);
      const uniqueIds = new Set(eventIds);

      expect(uniqueIds.size).toBe(4);
      eventIds.forEach((id) => {
        expect(id).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
        );
      });
    });

    it('should use correct event versions', async () => {
      await service.publishUserCreated('user-1', { email: 'test@example.com' });
      await service.publishUserUpdated('user-2', { email: 'test@example.com' });
      await service.publishUserDeleted('user-3');

      mockPublish.mock.calls.forEach(([event]) => {
        expect(event.eventVersion).toBe('1.0.0');
      });
    });

    it('should use correct event source', async () => {
      await service.publishUserCreated('user-1', { email: 'test@example.com' });
      await service.publishUserUpdated('user-2', { email: 'test@example.com' });
      await service.publishUserDeleted('user-3');

      mockPublish.mock.calls.forEach(([event]) => {
        expect(event.source).toBe('auth-service');
      });
    });

    it('should include timestamps in ISO format', async () => {
      await service.publishUserCreated('user-1', { email: 'test@example.com' });
      await service.publishUserUpdated('user-2', { email: 'test@example.com' });
      await service.publishUserDeleted('user-3');

      mockPublish.mock.calls.forEach(([event]) => {
        expect(event.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
        expect(() => new Date(event.timestamp)).not.toThrow();
      });
    });
  });

  describe('Schema validation', () => {
    it('should produce valid user.created events', async () => {
      await service.publishUserCreated('user-1', {
        email: 'test@example.com',
        username: 'testuser',
        name: 'Test User',
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const [event] = mockPublish.mock.calls[0];
      const validationResult = userCreatedEventSchema.safeParse(event);

      expect(validationResult.success).toBe(true);
    });

    it('should produce valid user.updated events', async () => {
      await service.publishUserUpdated('user-1', {
        email: 'test@example.com',
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const [event] = mockPublish.mock.calls[0];
      const validationResult = userUpdatedEventSchema.safeParse(event);

      expect(validationResult.success).toBe(true);
    });

    it('should produce valid user.deleted events', async () => {
      await service.publishUserDeleted('user-1');

      const [event] = mockPublish.mock.calls[0];
      const validationResult = userDeletedEventSchema.safeParse(event);

      expect(validationResult.success).toBe(true);
    });
  });
});
