import { betterAuth } from 'better-auth';
import { Pool } from 'pg';
import { env } from '@/env';
import { username, jwt } from 'better-auth/plugins';
import type { KafkaService } from '@/events';

// Note: KafkaService will be injected via factory pattern in auth module
let kafkaServiceInstance: KafkaService | null = null;

export const setKafkaService = (service: KafkaService) => {
  kafkaServiceInstance = service;
};

export const auth = betterAuth({
  database: new Pool({
    connectionString: env.DATABASE_URL,
  }),
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
          if (kafkaServiceInstance) {
            try {
              await kafkaServiceInstance.publishUserCreated(user.id, user);
            } catch (error) {
              console.error('Failed to publish user.created event:', error);
            }
          }
        },
      },
      update: {
        after: async (user) => {
          if (kafkaServiceInstance) {
            try {
              await kafkaServiceInstance.publishUserUpdated(user.id, user);
            } catch (error) {
              console.error('Failed to publish user.updated event:', error);
            }
          }
        },
      },
      delete: {
        after: async (user) => {
          if (kafkaServiceInstance) {
            try {
              await kafkaServiceInstance.publishUserDeleted(user.id);
            } catch (error) {
              console.error('Failed to publish user.deleted event:', error);
            }
          }
        },
      },
    },
  },
});
