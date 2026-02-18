# Kafka Integration for Auth Service

This document describes the Kafka event publishing setup for the auth service.

## Overview

The auth service publishes user lifecycle events to Kafka when users are created, updated, or deleted. Events follow a standard Event-Driven Architecture (EDA) format.

## Architecture

### Components

1. **KafkaModule** (`src/events/kafka.module.ts`): Global NestJS module that provides the KafkaService
2. **KafkaService** (`src/events/kafka.service.ts`): Service responsible for Kafka connection and event publishing
3. **Event Schemas** (`src/events/schemas.ts`): Zod schemas defining the event structure
4. **Better Auth Hooks** (`src/auth/index.ts`): Database hooks that trigger event publishing

### Event Flow

```
User Action (create/update/delete)
  ↓
Better Auth Database Hook
  ↓
KafkaService.publishUser*()
  ↓
Kafka Topic: user-events
```

## Configuration

### Environment Variables

Add these variables to your `.env` file:

```bash
KAFKA_BROKER=localhost:9092
KAFKA_CLIENT_ID=auth-service
```

### Docker Compose

Kafka is configured in `docker-compose.yaml`:

```yaml
kafka:
  image: apache/kafka-native:4.1.1
  ports:
    - '9092:9092'
    - '29092:29092'
```

Start Kafka with:

```bash
docker-compose up kafka -d
```

## Event Format

All events follow this standard EDA format:

```typescript
{
  eventId: string (UUID)
  eventType: "user.created" | "user.updated" | "user.deleted"
  eventVersion: "1.0.0"
  source: "auth-service"
  timestamp: string (ISO 8601)
  correlationId?: string (optional)
  causationId?: string (optional)
  data: {
    // Event-specific payload
  }
}
```

### Event Types

#### 1. user.created

Published when a new user signs up.

```typescript
{
  eventType: "user.created",
  data: {
    id: string,
    email: string,
    username?: string,
    name?: string,
    emailVerified: boolean,
    createdAt: string,
    updatedAt: string
  }
}
```

#### 2. user.updated

Published when user data is modified.

```typescript
{
  eventType: "user.updated",
  data: {
    id: string,
    email: string,
    username?: string,
    name?: string,
    emailVerified: boolean,
    createdAt: string,
    updatedAt: string,
    previousVersion?: {
      // Same structure as above
      // Contains the user data before the update
    }
  }
}
```

#### 3. user.deleted

Published when a user account is deleted.

```typescript
{
  eventType: "user.deleted",
  data: {
    id: string,
    deletedAt: string
  }
}
```

## Kafka Topics

- **user-events**: All user lifecycle events are published to this topic

## Usage

### Publishing Events

Events are automatically published via Better Auth database hooks. No manual invocation is needed.

### Consuming Events

Other services can consume these events by subscribing to the `user-events` topic:

```typescript
import { Kafka } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'my-service',
  brokers: ['localhost:9092'],
});

const consumer = kafka.consumer({ groupId: 'my-group' });

await consumer.connect();
await consumer.subscribe({ topic: 'user-events' });

await consumer.run({
  eachMessage: async ({ topic, partition, message }) => {
    const event = JSON.parse(message.value.toString());

    switch (event.eventType) {
      case 'user.created':
        // Handle user creation
        break;
      case 'user.updated':
        // Handle user update
        break;
      case 'user.deleted':
        // Handle user deletion
        break;
    }
  },
});
```

## Error Handling

- **Connection Failures**: The service logs errors but doesn't crash the application if Kafka is unavailable
- **Publishing Failures**: Errors are logged and re-thrown to maintain data consistency
- **Graceful Shutdown**: The producer disconnects cleanly when the NestJS app shuts down

## Development

### Testing Events Locally

1. Start Kafka:

   ```bash
   docker-compose up kafka -d
   ```

2. Start the auth service:

   ```bash
   pnpm --filter auth serve
   ```

3. Monitor events with kafka-console-consumer:

   ```bash
   docker exec -it kafka_broker /bin/bash
   /opt/kafka/bin/kafka-console-consumer.sh \
     --bootstrap-server localhost:9092 \
     --topic user-events \
     --from-beginning \
     --property print.key=true \
     --property print.headers=true
   ```

4. Create a test user via the API and watch the events appear in the consumer

## Future Enhancements

- [ ] Add dead letter queue for failed events
- [ ] Implement event replay functionality
- [ ] Add event versioning and schema registry integration
- [ ] Add correlation and causation ID propagation
- [ ] Implement transactional outbox pattern for guaranteed delivery
- [ ] Add Kafka monitoring and metrics
- [ ] Add integration tests for event publishing
