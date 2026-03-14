import { betterAuth, BetterAuthOptions } from 'better-auth';

import { databasePool } from '@/db/pool';
import { env } from '@/env';
import type { RabbitMQService } from '@/events';
import { username, jwt } from 'better-auth/plugins';

// Note: RabbitMQService will be injected via factory pattern in auth module
let rabbitmqServiceInstance: RabbitMQService | null = null;

export const setRabbitMQService = (service: RabbitMQService) => {
  rabbitmqServiceInstance = service;
};

export const auth = betterAuth({
  database: databasePool,
  trustedOrigins: ['*'],
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
  },
  plugins: [username(), jwt()],
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          if (rabbitmqServiceInstance) {
            try {
              await rabbitmqServiceInstance.publishUserCreated(user.id, user);
            } catch (error) {
              console.error('Failed to publish user.created event:', error);
            }
          }
        },
      },
      update: {
        after: async (user) => {
          if (rabbitmqServiceInstance) {
            try {
              await rabbitmqServiceInstance.publishUserUpdated(user.id, user);
            } catch (error) {
              console.error('Failed to publish user.updated event:', error);
            }
          }
        },
      },
      delete: {
        after: async (user) => {
          if (rabbitmqServiceInstance) {
            try {
              await rabbitmqServiceInstance.publishUserDeleted(user.id);
            } catch (error) {
              console.error('Failed to publish user.deleted event:', error);
            }
          }
        },
      },
    },
  },
});

export const authConfigurtion = {
  database: databasePool,
  trustedOrigins: ['*'],
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
  },
  plugins: [username(), jwt()],
} satisfies BetterAuthOptions;
