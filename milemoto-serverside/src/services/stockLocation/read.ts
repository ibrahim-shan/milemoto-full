import { and, asc, desc, eq, like, or, sql } from 'drizzle-orm';
import { stocklocations } from '@milemoto/types';
import type { ListQueryDto as StockLocationQueryDto } from '../../routes/admin/helpers/stockLocation.helpers.js';
import { buildPaginatedResponse } from '../../utils/response.js';
import { httpError } from '../../utils/error.js';
import { db } from '../../db/drizzle.js';
import { formatStockLocation } from './shared.js';

export async function listStockLocations(params: StockLocationQueryDto) {
  const { page, limit, search, status, type, filterMode = 'all', sortBy, sortDir = 'asc' } = params;
  const offset = (page - 1) * limit;

  const searchFilter = search
    ? or(like(stocklocations.name, `%${search}%`), like(stocklocations.description, `%${search}%`))
    : undefined;

  const facetFilters = [
    status ? eq(stocklocations.status, status) : undefined,
    type ? eq(stocklocations.type, type) : undefined,
  ].filter(Boolean) as NonNullable<ReturnType<typeof and>>[];

  const structuredFilter =
    facetFilters.length === 0
      ? undefined
      : filterMode === 'any'
        ? or(...facetFilters)!
        : and(...facetFilters)!;

  const whereFilters = [searchFilter, structuredFilter].filter(Boolean) as NonNullable<
    ReturnType<typeof and>
  >[];
  const where = whereFilters.length ? and(...whereFilters) : undefined;

  const sortColumns = {
    name: stocklocations.name,
    type: stocklocations.type,
    status: stocklocations.status,
    description: stocklocations.description,
    createdAt: stocklocations.createdAt,
    updatedAt: stocklocations.updatedAt,
  } as const;

  const sortColumn = sortBy ? sortColumns[sortBy] : undefined;
  const primarySort = sortColumn ? (sortDir === 'desc' ? desc(sortColumn) : asc(sortColumn)) : null;

  const [items, countRows] = await Promise.all([
    db
      .select()
      .from(stocklocations)
      .where(where)
      .orderBy(...(primarySort ? [primarySort] : []), asc(stocklocations.createdAt))
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
