import { betterAuth } from 'better-auth';

import { databasePool } from '@/db/pool';
import { env } from '@/env';
import { username, jwt } from 'better-auth/plugins';

export const auth = betterAuth({
  database: databasePool,
  trustedOrigins: ['*'],
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
  },
  plugins: [username(), jwt()],
});
