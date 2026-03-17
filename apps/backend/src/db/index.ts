import { drizzle } from 'drizzle-orm/node-postgres';
import { databasePool } from './pool';
import * as schemas from './schema';
import * as authSchemas from './auth-schema';

export default drizzle({
  client: databasePool,
  schema: { ...schemas, ...authSchemas },
});
