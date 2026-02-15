import { betterAuth } from 'better-auth';
import { Pool } from 'pg';
import { env } from '@/env';
import { username, jwt } from 'better-auth/plugins';

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
});
