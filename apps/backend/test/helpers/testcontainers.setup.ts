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

export interface PostgresContainerContext {
  postgres: StartedPostgreSqlContainer;
  databaseUrl: string;
}

export interface RabbitMQContainerContext {
  rabbitmq: StartedRabbitMQContainer;
  rabbitmqUrl: string;
}

export async function startPostgresContainer(): Promise<PostgresContainerContext> {
  console.log('Starting PostgreSQL container...');
  const postgres = await new PostgreSqlContainer('postgres:18.1-alpine')
    .withUsername('testuser')
    .withPassword('testpass')
    .withDatabase('testdb')
    .withExposedPorts(5432)
    .start();

  const databaseUrl = postgres.getConnectionUri();
  console.log(`PostgreSQL started at ${databaseUrl}`);

  return {
    postgres,
    databaseUrl,
  };
}

export async function startRabbitMQContainer(): Promise<RabbitMQContainerContext> {
  console.log('Starting RabbitMQ container...');
  const rabbitmq = await new RabbitMQContainer('rabbitmq:4.1-management-alpine')
    .withExposedPorts(5672, 15672)
    .start();

  const rabbitmqUrl = rabbitmq.getAmqpUrl();
  console.log(`RabbitMQ started at ${rabbitmqUrl}`);

  return {
    rabbitmq,
    rabbitmqUrl,
  };
}

/**
 * Start PostgreSQL and RabbitMQ containers for integration testing
 */
export async function startTestContainers(): Promise<TestContainersContext> {
  const [{ postgres, databaseUrl }, { rabbitmq, rabbitmqUrl }] =
    await Promise.all([startPostgresContainer(), startRabbitMQContainer()]);

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

export async function stopPostgresContainer(
  context: PostgresContainerContext,
): Promise<void> {
  console.log('Stopping PostgreSQL container...');
  await context.postgres.stop();
  console.log('PostgreSQL container stopped');
}

export async function stopRabbitMQContainer(
  context: RabbitMQContainerContext,
): Promise<void> {
  console.log('Stopping RabbitMQ container...');
  await context.rabbitmq.stop();
  console.log('RabbitMQ container stopped');
}
