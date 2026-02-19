import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import {
  RabbitMQContainer,
  StartedRabbitMQContainer,
} from '@testcontainers/rabbitmq';

export interface TestContainersContext {
  postgres: StartedPostgreSqlContainer;
  rabbitmq: StartedRabbitMQContainer;
  databaseUrl: string;
  rabbitmqUrl: string;
}

/**
 * Start PostgreSQL and RabbitMQ containers for integration testing
 */
export async function startTestContainers(): Promise<TestContainersContext> {
  console.log('Starting PostgreSQL container...');
  const postgres = await new PostgreSqlContainer('postgres:18.1-alpine')
    .withUsername('testuser')
    .withPassword('testpass')
    .withDatabase('testdb')
    .withExposedPorts(5432)
    .start();

  const databaseUrl = postgres.getConnectionUri();
  console.log(`PostgreSQL started at ${databaseUrl}`);

  console.log('Starting RabbitMQ container...');
  const rabbitmq = await new RabbitMQContainer('rabbitmq:4.1-management-alpine')
    .withExposedPorts(5672, 15672)
    .start();

  const rabbitmqUrl = rabbitmq.getAmqpUrl();
  console.log(`RabbitMQ started at ${rabbitmqUrl}`);

  return {
    postgres,
    rabbitmq,
    databaseUrl,
    rabbitmqUrl,
  };
}

/**
 * Stop all test containers
 */
export async function stopTestContainers(
  context: TestContainersContext,
): Promise<void> {
  console.log('Stopping test containers...');
  await Promise.all([context.postgres.stop(), context.rabbitmq.stop()]);
  console.log('Test containers stopped');
}
