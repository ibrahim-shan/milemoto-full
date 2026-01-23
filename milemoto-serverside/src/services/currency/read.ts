import { and, asc, eq, like, or, sql } from 'drizzle-orm';
import { currencies } from '@milemoto/types';
import type { CurrencyResponse } from '@milemoto/types';
import type { ListQueryDto } from '../../routes/admin/helpers/currency.helpers.js';
import { db } from '../../db/drizzle.js';
import { httpError } from '../../utils/error.js';
import { buildPaginatedResponse } from '../../utils/response.js';
import { toCurrencyResponse } from './shared.js';

export async function fetchCurrency(id: number): Promise<CurrencyResponse> {
  const rows = await db.select().from(currencies).where(eq(currencies.id, id)).limit(1);
  const row = rows[0];
  if (!row) throw httpError(404, 'NotFound', 'Currency not found');
  return toCurrencyResponse(row);
}

export async function listCurrencies(params: ListQueryDto) {
  const { search, page, limit, status } = params;
  const offset = (page - 1) * limit;
  const filters = [
    search
      ? or(like(currencies.name, `%${search}%`), like(currencies.code, `%${search}%`))
      : undefined,
    status ? eq(currencies.status, status) : undefined,
  ].filter(Boolean) as NonNullable<ReturnType<typeof and>>[];

  const where = filters.length ? and(...filters) : undefined;

  const [items, countRows] = await Promise.all([
    db
      .select()
      .from(currencies)
      .where(where)
      .orderBy(asc(currencies.name))
      .limit(limit)
      .offset(offset),
    db
      .select({ total: sql<number>`count(*)` })
      .from(currencies)
      .where(where),
  ]);

  const totalCount = Number(countRows[0]?.total ?? 0);

  return buildPaginatedResponse({
    items: items.map(toCurrencyResponse),
    totalCount,
    page,
    limit,
  });
}

export async function listAllCurrencies(includeInactive: boolean) {
  const filters = includeInactive ? undefined : eq(currencies.status, 'active');

  const items = await db.select().from(currencies).where(filters).orderBy(asc(currencies.name));

  return items.map(toCurrencyResponse);
}
