// src/db/time.ts
import { sql } from 'drizzle-orm';
import { db } from './drizzle.js';

type UnknownRow = Record<string, unknown>;

function firstRow<T extends UnknownRow>(result: unknown): T | undefined {
  if (!result) return undefined;
  if (Array.isArray(result)) {
    const first = result[0];
    if (Array.isArray(first)) return first[0] as T | undefined;
    return first as T | undefined;
  }
  if (typeof result === 'object' && 'rows' in (result as object)) {
    const rows = (result as { rows?: unknown }).rows;
    if (Array.isArray(rows)) {
      const first = rows[0];
      if (Array.isArray(first)) return first[0] as T | undefined;
      return first as T | undefined;
    }
  }
  return undefined;
}

/** DB current time using server timezone */
export async function dbNow(): Promise<Date> {
  const result = await db.execute(sql`SELECT NOW() AS now`);
  const row = firstRow<{ now: Date | string }>(result);
  if (!row || !row.now) throw new Error('NOW() returned no row');
  return new Date(row.now);
}

/** Optional: UTC time if you want timezone-stable tokens */
export async function dbUtcNow(): Promise<Date> {
  const result = await db.execute(sql`SELECT UTC_TIMESTAMP() AS now`);
  const row = firstRow<{ now: Date | string }>(result);
  if (!row || !row.now) throw new Error('UTC_TIMESTAMP() returned no row');
  return new Date(row.now);
}
