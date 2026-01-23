import { drizzle, type MySql2Database } from 'drizzle-orm/mysql2';
import * as schema from '@milemoto/types/db';
import { pool } from './pool.js';

// Single shared Drizzle client for the server-side app.
export const db: MySql2Database<typeof schema> = drizzle({
  client: pool,
  schema,
  mode: 'default',
});
