import * as amqp from 'amqplib';

export interface RabbitMQTestHelper {
  messages: Array<{
    content: Buffer;
    fields: amqp.ConsumeMessage['fields'];
    properties: amqp.ConsumeMessage['properties'];
  }>;
  waitForMessages: (count: number, timeout: number) => Promise<void>;
  disconnect: () => Promise<void>;
}

/**
 * Create a RabbitMQ consumer for testing that captures messages
 */
export async function createRabbitMQTestHelper(
  rabbitmqUrl: string,
  exchange: string,
  routingKeys: string[],
): Promise<RabbitMQTestHelper> {
  console.log(`[RabbitMQ Test Helper] Connecting to ${rabbitmqUrl}`);
  const connection = await amqp.connect(rabbitmqUrl);
  const channel = await connection.createChannel();

  // Assert exchange
  console.log(`[RabbitMQ Test Helper] Asserting exchange: ${exchange}`);
  await channel.assertExchange(exchange, 'topic', { durable: true });

  // Create temporary queue
  const q = await channel.assertQueue('', { exclusive: true });
  console.log(`[RabbitMQ Test Helper] Created queue: ${q.queue}`);

  // Bind queue to all routing keys
  for (const routingKey of routingKeys) {
    await channel.bindQueue(q.queue, exchange, routingKey);
    console.log(
      `[RabbitMQ Test Helper] Bound queue to routing key: ${routingKey}`,
    );
  }

  const messages: RabbitMQTestHelper['messages'] = [];

  // Start consuming
  await channel.consume(
    q.queue,
    (msg) => {
      if (msg) {
        console.log(
          `[RabbitMQ Test Helper] Received message on routing key: ${msg.fields.routingKey}`,
        );
        messages.push({
          content: msg.content,
          fields: msg.fields,
          properties: msg.properties,
        });
        channel.ack(msg);
      }
    },
    { noAck: false },
  );

  console.log(`[RabbitMQ Test Helper] Consumer ready`);

  // Give the consumer a moment to be fully ready
  await new Promise((resolve) => setTimeout(resolve, 100));

  const waitForMessages = async (count: number, timeout: number) => {
    const start = Date.now();
    while (messages.length < count) {
      if (Date.now() - start > timeout) {
        throw new Error(
          `Timeout waiting for ${count} messages (received ${messages.length})`,
        );
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  };

  const disconnect = async () => {
    await channel.close();
    await connection.close();
  };

  return {
    messages,
    waitForMessages,
    disconnect,
  };
}
