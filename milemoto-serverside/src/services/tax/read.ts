import { and, asc, eq, like, or, sql } from 'drizzle-orm';
import { countries, taxes } from '@milemoto/types';
import type { ListQueryDto } from '../../routes/admin/helpers/tax.helpers.js';
import { buildPaginatedResponse } from '../../utils/response.js';
import { db } from '../../db/drizzle.js';
import { formatTax } from './shared.js';

export async function listTaxes(params: ListQueryDto) {
  const { search, page, limit, status } = params;
  const offset = (page - 1) * limit;
  const filters = [
    search ? or(like(taxes.name, `%${search}%`), like(countries.name, `%${search}%`)) : undefined,
    status ? eq(taxes.status, status) : undefined,
  ].filter(Boolean) as NonNullable<ReturnType<typeof and>>[];

  const where = filters.length ? and(...filters) : undefined;

  const [items, countRows] = await Promise.all([
    db
      .select({
        id: taxes.id,
        name: taxes.name,
        rate: taxes.rate,
        type: taxes.type,
        status: taxes.status,
        countryId: taxes.countryId,
        countryName: countries.name,
        createdAt: taxes.createdAt,
        updatedAt: taxes.updatedAt,
      })
      .from(taxes)
      .leftJoin(countries, eq(taxes.countryId, countries.id))
      .where(where)
      .orderBy(asc(taxes.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ totalCount: sql<number>`count(*)` })
      .from(taxes)
      .leftJoin(countries, eq(taxes.countryId, countries.id))
      .where(where),
  ]);
  const totalCount = Number(countRows[0]?.totalCount ?? 0);

  return buildPaginatedResponse({
    items: items.map(formatTax),
    totalCount,
    page,
    limit,
  });
}
