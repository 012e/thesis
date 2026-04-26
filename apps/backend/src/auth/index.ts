import { betterAuth } from "better-auth";

import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { env } from "@/env";
import { username, jwt, bearer, admin } from "better-auth/plugins";
import db from "@/db";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  trustedOrigins: ["*"],
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  advanced: { disableOriginCheck: true },
  emailAndPassword: { enabled: true },
  plugins: [username(), jwt(), bearer(), admin()],
});
