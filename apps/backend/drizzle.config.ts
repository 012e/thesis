import { defineConfig } from "drizzle-kit";

// Use process.env directly so drizzle-kit can read this config in the
// production container where only dist/ exists (src/ is not copied).
const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://username:password@localhost:5432/database";

export default defineConfig({
  dialect: "postgresql",
  schema: ["./src/db/schema.ts", "./src/db/auth-schema.ts"],
  out: "./drizzle",
  dbCredentials: {
    url: DATABASE_URL,
  },
  strict: true,
  verbose: true,
});
