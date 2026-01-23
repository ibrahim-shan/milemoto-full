import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const { MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE } = process.env;

if (!MYSQL_HOST || !MYSQL_USER || !MYSQL_DATABASE) {
  throw new Error('Missing database credential(s) in .env file');
}

// Handle password being empty
const dbCredentials = {
  host: MYSQL_HOST,
  port: Number(MYSQL_PORT) || 3306,
  user: MYSQL_USER,
  database: MYSQL_DATABASE,
  ...(MYSQL_PASSWORD ? { password: MYSQL_PASSWORD } : {}),
};

export default defineConfig({
  out: './drizzle',
  schema: ['../packages/types/src/db.schema.ts'],
  dialect: 'mysql',
  dbCredentials,
});
