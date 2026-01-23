import { and, asc, eq, like, or, sql } from 'drizzle-orm';
import { languages } from '@milemoto/types';
import type { ListQueryDto } from '../../routes/admin/helpers/language.helpers.js';
import { buildPaginatedResponse } from '../../utils/response.js';
import { httpError } from '../../utils/error.js';
import { db } from '../../db/drizzle.js';
import { formatLanguageRow } from './shared.js';

export async function listLanguages(params: ListQueryDto) {
  const { page, limit, search, status } = params;
  const offset = (page - 1) * limit;

  const filters = [
    search
      ? or(
          like(languages.name, `%${search}%`),
          like(languages.code, `%${search}%`),
          like(languages.countryCode, `%${search}%`)
        )
      : undefined,
    status ? eq(languages.status, status) : undefined,
  ].filter(Boolean) as NonNullable<ReturnType<typeof and>>[];

  const where = filters.length ? and(...filters) : undefined;

  const [items, countRows] = await Promise.all([
    db
      .select()
      .from(languages)
      .where(where)
      .orderBy(asc(languages.name))
      .limit(limit)
      .offset(offset),
    db
      .select({ total: sql<number>`count(*)` })
      .from(languages)
      .where(where),
  ]);

  const total = Number(countRows[0]?.total ?? 0);

  return buildPaginatedResponse({
    items: items.map(formatLanguageRow),
    totalCount: total,
    page,
    limit,
  });
}

export async function getLanguage(id: number) {
  const rows = await db.select().from(languages).where(eq(languages.id, id)).limit(1);
  if (!rows[0]) {
    throw httpError(404, 'NotFound', 'Language not found');
  }
  return formatLanguageRow(rows[0]);
}
