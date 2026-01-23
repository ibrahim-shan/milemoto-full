import { and, asc, eq, like, or, sql } from 'drizzle-orm';
import { stocklocations } from '@milemoto/types';
import type { ListQueryDto as StockLocationQueryDto } from '../../routes/admin/helpers/stockLocation.helpers.js';
import { buildPaginatedResponse } from '../../utils/response.js';
import { httpError } from '../../utils/error.js';
import { db } from '../../db/drizzle.js';
import { formatStockLocation } from './shared.js';

export async function listStockLocations(params: StockLocationQueryDto) {
  const { page, limit, search, status, type } = params;
  const offset = (page - 1) * limit;

  const filters = [
    search
      ? or(
          like(stocklocations.name, `%${search}%`),
          like(stocklocations.description, `%${search}%`)
        )
      : undefined,
    status ? eq(stocklocations.status, status) : undefined,
    type ? eq(stocklocations.type, type) : undefined,
  ].filter(Boolean) as NonNullable<ReturnType<typeof and>>[];

  const where = filters.length ? and(...filters) : undefined;

  const [items, countRows] = await Promise.all([
    db
      .select()
      .from(stocklocations)
      .where(where)
      .orderBy(asc(stocklocations.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ total: sql<number>`count(*)` })
      .from(stocklocations)
      .where(where),
  ]);

  const total = Number(countRows[0]?.total ?? 0);

  return buildPaginatedResponse({
    items: items.map(formatStockLocation),
    totalCount: total,
    page,
    limit,
  });
}

export async function getStockLocation(id: number) {
  const rows = await db.select().from(stocklocations).where(eq(stocklocations.id, id)).limit(1);
  if (!rows[0]) {
    throw httpError(404, 'NotFound', 'Stock location not found');
  }
  return formatStockLocation(rows[0]);
}
