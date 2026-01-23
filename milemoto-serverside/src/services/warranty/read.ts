import { and, asc, eq, like, or, sql } from 'drizzle-orm';
import { warranties } from '@milemoto/types';
import type { ListQueryDto } from '../../routes/admin/helpers/warranty.helpers.js';
import { buildPaginatedResponse } from '../../utils/response.js';
import { formatWarranty, getWarranty } from './shared.js';
import { db } from '../../db/drizzle.js';

export async function listWarranties(params: ListQueryDto) {
  const { page, limit, search, status } = params;
  const offset = (page - 1) * limit;

  const filters = [
    search
      ? or(like(warranties.name, `%${search}%`), like(warranties.description, `%${search}%`))
      : undefined,
    status ? eq(warranties.status, status) : undefined,
  ].filter(Boolean) as NonNullable<ReturnType<typeof and>>[];

  const where = filters.length ? and(...filters) : undefined;

  const [rows, countRows] = await Promise.all([
    db
      .select()
      .from(warranties)
      .where(where)
      .orderBy(asc(warranties.name))
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
