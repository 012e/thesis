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
  plugins: [
    username(),
    jwt({
      jwt: {
        // Narrow the incoming user shape to avoid `any`-assignment lint errors
        definePayload: ({
          user,
        }: {
          user: { id: string; email?: string; role?: string };
        }) => {
          return {
            id: user.id,
            email: user.email,
            role: user.role,
          };
        },
      },
    }),
  ],
});
