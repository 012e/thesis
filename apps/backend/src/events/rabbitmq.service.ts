import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as amqp from 'amqplib';
import { env } from '@/env';
import type { UserEvent } from './schemas';
import type { BetterAuthUser } from '@/types/user.types';

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private chanelModel: amqp.ChannelModel | null = null;
  private channel: amqp.Channel | null = null;
  private readonly exchange = {
    name: 'user-events',
    type: 'topic' as const,
  };
  private readonly routingKeys = {
    userCreated: 'user.created',
    userUpdated: 'user.updated',
    userDeleted: 'user.deleted',
  } as const;

  async onModuleInit() {
    try {
      this.chanelModel = await amqp.connect(env.RABBITMQ_URL);
      this.channel = await this.chanelModel.createChannel();

      // Declare the exchange
      await this.channel.assertExchange(
        this.exchange.name,
        this.exchange.type,
        {
          durable: true,
        },
      );

      console.log('RabbitMQ producer connected successfully');
    } catch (error) {
      console.error('Failed to connect RabbitMQ producer:', error);
      // Don't throw to prevent app from crashing if RabbitMQ is temporarily unavailable
    }
  }

  async onModuleDestroy() {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.chanelModel) {
        await this.chanelModel.close();
      }
      console.log('RabbitMQ producer disconnected');
    } catch (error) {
      console.error('Error disconnecting RabbitMQ producer:', error);
    }
  }

  async publishUserEvent(event: UserEvent, routingKey: string): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not initialized');
    }

    try {
      const message = JSON.stringify(event);
      const published = this.channel.publish(
        this.exchange.name,
        routingKey,
        Buffer.from(message),
        {
          persistent: true,
          contentType: 'application/json',
          headers: {
            'event-type': event.eventType,
            'event-version': event.eventVersion,
            'event-id': event.eventId,
          },
        },
      );

      if (!published) {
        throw new Error('Failed to publish message to RabbitMQ');
      }

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

    await this.publishUserEvent(event, this.routingKeys.userCreated);
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

    await this.publishUserEvent(event, this.routingKeys.userUpdated);
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

    await this.publishUserEvent(event, this.routingKeys.userDeleted);
  }
}
