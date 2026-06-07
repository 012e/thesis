import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";

import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { env } from "@/env";
import { username, jwt, bearer, admin } from "better-auth/plugins";
import db from "@/db";
import { userProfiles } from "@/db/schema";
import { getDefaultAvatarUrl } from "@/users/default-avatar";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  trustedOrigins: ["*"],
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  advanced: { disableOriginCheck: true },
  emailAndPassword: { enabled: true },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await db
            .insert(userProfiles)
            .values({ userId: user.id, avatarUrl: getDefaultAvatarUrl() })
            .onConflictDoNothing();
        },
      },
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-up/email") {
        return;
      }

      if (typeof ctx.body?.username !== "string" || !ctx.body.username.trim()) {
        throw new APIError("BAD_REQUEST", {
          message: "Username is required",
        });
      }
    }),
  },
  plugins: [username(), jwt(), bearer(), admin()],
});
