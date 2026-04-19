import { Pool } from "pg";

import { env } from "@/env";

export const databasePool = new Pool({
  connectionString: env.DATABASE_URL,
});
