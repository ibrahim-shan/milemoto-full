import { warranties } from '@milemoto/types';
import type { Warranty } from '@milemoto/types';
import { eq } from 'drizzle-orm';
import { httpError } from '../../utils/error.js';
import { db } from '../../db/drizzle.js';

export function formatWarranty(row: typeof warranties.$inferSelect): Warranty {
  return {
    id: Number(row.id),
    name: row.name,
    description: row.description ?? null,
    status: row.status,
    createdAt: row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt : new Date(row.updatedAt),
  };
}

export async function getWarranty(id: number) {
  const rows = await db.select().from(warranties).where(eq(warranties.id, id)).limit(1);
  if (!rows[0]) {
    throw httpError(404, 'NotFound', 'Warranty not found');
  }
  return formatWarranty(rows[0]);
}
