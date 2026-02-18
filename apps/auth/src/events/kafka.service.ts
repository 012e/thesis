import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Kafka, Producer, logLevel } from 'kafkajs';
import { env } from '@/env';
import type { UserEvent } from './schemas';
import type { BetterAuthUser } from '@/types/user.types';

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private kafka: Kafka;
  private producer: Producer;
  private readonly topics = {
    userEvents: 'user-events',
  };

  constructor() {
    this.kafka = new Kafka({
      clientId: env.KAFKA_CLIENT_ID,
      brokers: [env.KAFKA_BROKER],
      logLevel: logLevel.ERROR,
      retry: {
        retries: 5,
        initialRetryTime: 300,
        factor: 2,
      },
    });

    this.producer = this.kafka.producer({
      allowAutoTopicCreation: true,
      transactionTimeout: 30000,
    });
  }

  async onModuleInit() {
    try {
      await this.producer.connect();
      console.log('Kafka producer connected successfully');
    } catch (error) {
      console.error('Failed to connect Kafka producer:', error);
      // Don't throw to prevent app from crashing if Kafka is temporarily unavailable
    }
  }

  async onModuleDestroy() {
    try {
      await this.producer.disconnect();
      console.log('Kafka producer disconnected');
    } catch (error) {
      console.error('Error disconnecting Kafka producer:', error);
    }
  }

  async publishUserEvent(event: UserEvent): Promise<void> {
    try {
      await this.producer.send({
        topic: this.topics.userEvents,
        messages: [
          {
            key: event.data.id,
            value: JSON.stringify(event),
            headers: {
              'event-type': event.eventType,
              'event-version': event.eventVersion,
              'event-id': event.eventId,
              'content-type': 'application/json',
            },
          },
        ],
      });

      console.log(
        `Published ${event.eventType} event for user ${event.data.id}`,
      );
    } catch (error) {
      console.error(`Failed to publish ${event.eventType} event:`, error);
      // Consider implementing a dead letter queue or retry mechanism
      throw error;
    }
  }

  async publishUserCreated(
    userId: string,
    userData: Partial<BetterAuthUser>,
  ): Promise<void> {
    const now = new Date().toISOString();
    const event: UserEvent = {
      eventId: crypto.randomUUID(),
      eventType: 'user.created',
      eventVersion: '1.0.0',
      source: 'auth-service',
      timestamp: now,
      data: {
        id: userId,
        email: userData.email ?? '',
        username: userData.username ?? undefined,
        name: userData.name ?? undefined,
        emailVerified: userData.emailVerified ?? false,
        createdAt: userData.createdAt
          ? new Date(userData.createdAt).toISOString()
          : now,
        updatedAt: userData.updatedAt
          ? new Date(userData.updatedAt).toISOString()
          : now,
      },
    };

    await this.publishUserEvent(event);
  }

  async publishUserUpdated(
    userId: string,
    userData: Partial<BetterAuthUser>,
    previousData?: Partial<BetterAuthUser>,
  ): Promise<void> {
    const now = new Date().toISOString();
    const baseData = {
      id: userId,
      email: userData.email ?? '',
      username: userData.username ?? undefined,
      name: userData.name ?? undefined,
      emailVerified: userData.emailVerified ?? false,
      createdAt: userData.createdAt
        ? new Date(userData.createdAt).toISOString()
        : now,
      updatedAt: now,
      ...(previousData && {
        previousVersion: {
          id: previousData.id ?? userId,
          email: previousData.email ?? '',
          username: previousData.username ?? undefined,
          name: previousData.name ?? undefined,
          emailVerified: previousData.emailVerified ?? false,
          createdAt: previousData.createdAt
            ? new Date(previousData.createdAt).toISOString()
            : now,
          updatedAt: previousData.updatedAt
            ? new Date(previousData.updatedAt).toISOString()
            : now,
        },
      }),
    };

    const event: UserEvent = {
      eventId: crypto.randomUUID(),
      eventType: 'user.updated',
      eventVersion: '1.0.0',
      source: 'auth-service',
      timestamp: now,
      data: baseData,
    };

    await this.publishUserEvent(event);
  }

  async publishUserDeleted(userId: string): Promise<void> {
    const event: UserEvent = {
      eventId: crypto.randomUUID(),
      eventType: 'user.deleted',
      eventVersion: '1.0.0',
      source: 'auth-service',
      timestamp: new Date().toISOString(),
      data: {
        id: userId,
        deletedAt: new Date().toISOString(),
      },
    };

    await this.publishUserEvent(event);
  }
}
