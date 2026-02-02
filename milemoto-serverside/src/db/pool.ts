import mysql from 'mysql2/promise';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export const pool = mysql.createPool({
  host: env.MYSQL_HOST,
  port: env.MYSQL_PORT,
  user: env.MYSQL_USER,
  password: env.MYSQL_PASSWORD,
  database: env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: env.DB_POOL_SIZE,
  queueLimit: 0,
  timezone: 'Z',
});

function previewSql(sqlText: unknown): string {
  const s = typeof sqlText === 'string' ? sqlText : String(sqlText ?? '');
  return s.replace(/\s+/g, ' ').trim().slice(0, 250);
}

function paramCount(params: unknown): number | undefined {
  if (!params) return undefined;
  if (Array.isArray(params)) return params.length;
  if (typeof params === 'object') return Object.keys(params as Record<string, unknown>).length;
  return undefined;
}

async function withSlowQueryLog<T>(
  op: 'query' | 'execute',
  sqlText: unknown,
  params: unknown,
  fn: () => Promise<T>
): Promise<T> {
  const started = Date.now();
  try {
    return await fn();
  } finally {
    const elapsedMs = Date.now() - started;
    if (elapsedMs >= env.DB_SLOW_QUERY_MS) {
      logger.warn(
        {
          code: 'SlowQuery',
          op,
          elapsedMs,
          sql: previewSql(sqlText),
          paramsCount: paramCount(params),
        },
        'Slow DB query'
      );
    }
  }
}

export async function pingDB() {
  const conn = await pool.getConnection();
  try {
    await conn.ping();
    logger.info('MySQL connected');
  } finally {
    conn.release();
  }
}

// Instrument pool-level query/execute/getConnection with slow-query logging.
// This affects Drizzle too, because Drizzle uses the mysql2 client internally.
const originalQuery = pool.query.bind(pool) as typeof pool.query;
pool.query = ((sqlText: unknown, params?: unknown) =>
  withSlowQueryLog('query', sqlText, params, () =>
    params === undefined
      ? originalQuery(sqlText as never)
      : originalQuery(sqlText as never, params as never)
  )) as typeof pool.query;

const originalExecute = pool.execute.bind(pool) as typeof pool.execute;
pool.execute = ((sqlText: unknown, params?: unknown) =>
  withSlowQueryLog('execute', sqlText, params, () =>
    params === undefined
      ? originalExecute(sqlText as never)
      : originalExecute(sqlText as never, params as never)
  )) as typeof pool.execute;

const originalGetConnection = pool.getConnection.bind(pool) as typeof pool.getConnection;
pool.getConnection = (async () => {
  const conn = await originalGetConnection();
  const originalConnQuery = conn.query.bind(conn) as typeof conn.query;
  conn.query = ((sqlText: unknown, params?: unknown) =>
    withSlowQueryLog('query', sqlText, params, () =>
      params === undefined
        ? originalConnQuery(sqlText as never)
        : originalConnQuery(sqlText as never, params as never)
    )) as typeof conn.query;

  const originalConnExecute = conn.execute.bind(conn) as typeof conn.execute;
  conn.execute = ((sqlText: unknown, params?: unknown) =>
    withSlowQueryLog('execute', sqlText, params, () =>
      params === undefined
        ? originalConnExecute(sqlText as never)
        : originalConnExecute(sqlText as never, params as never)
    )) as typeof conn.execute;

  return conn;
}) as typeof pool.getConnection;
