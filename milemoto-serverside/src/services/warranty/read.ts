import { and, asc, desc, eq, like, or, sql } from 'drizzle-orm';
import { warranties } from '@milemoto/types';
import type { ListQueryDto } from '../../routes/admin/helpers/warranty.helpers.js';
import { buildPaginatedResponse } from '../../utils/response.js';
import { formatWarranty, getWarranty } from './shared.js';
import { db } from '../../db/drizzle.js';

export async function listWarranties(params: ListQueryDto) {
  const { page, limit, search, filterMode = 'all', status, sortBy, sortDir = 'asc' } = params;
  const offset = (page - 1) * limit;

  const searchFilter = search
    ? or(like(warranties.name, `%${search}%`), like(warranties.description, `%${search}%`))
    : undefined;
  const optionalFilters = [status ? eq(warranties.status, status) : undefined].filter(Boolean);
  const combinedOptionalFilter =
    optionalFilters.length === 0
      ? undefined
      : filterMode === 'any'
        ? or(...optionalFilters)
        : and(...optionalFilters);
  const where = and(searchFilter, combinedOptionalFilter);
  const sortColumns = {
    name: warranties.name,
    description: warranties.description,
    status: warranties.status,
    createdAt: warranties.createdAt,
    updatedAt: warranties.updatedAt,
  } as const;
  const sortColumn = sortBy ? sortColumns[sortBy] : warranties.name;
  const orderExpr = sortDir === 'desc' ? desc(sortColumn) : asc(sortColumn);

  const [rows, countRows] = await Promise.all([
    db
      .select()
      .from(warranties)
      .where(where)
      .orderBy(orderExpr)
      .limit(limit)
      .offset(offset),
    db
      .select({ total: sql<number>`count(*)` })
      .from(warranties)
      .where(where),
  ]);

  const total = Number(countRows[0]?.total ?? 0);

  return buildPaginatedResponse({
    items: rows.map(formatWarranty),
    totalCount: total,
    page,
    limit,
  });
}

export { getWarranty };
