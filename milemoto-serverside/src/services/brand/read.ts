import { and, asc, eq, like, or, sql } from 'drizzle-orm';
import { brands } from '@milemoto/types';
import type { BrandResponse } from '@milemoto/types';
import type { ListQueryDto } from '../../routes/admin/helpers/brand.helpers.js';
import { db } from '../../db/drizzle.js';
import { httpError } from '../../utils/error.js';
import { buildPaginatedResponse } from '../../utils/response.js';
import { toBrandResponse } from './shared.js';

export async function listBrands(params: ListQueryDto) {
  const { page, limit, search, status } = params;
  const offset = (page - 1) * limit;

  const filters = [
    search
      ? or(like(brands.name, `%${search}%`), like(brands.description, `%${search}%`))
      : undefined,
    status ? eq(brands.status, status) : undefined,
  ].filter(Boolean) as NonNullable<ReturnType<typeof and>>[];

  const where = filters.length ? and(...filters) : undefined;

  const [items, countRows] = await Promise.all([
    db.select().from(brands).where(where).orderBy(asc(brands.name)).limit(limit).offset(offset),
    db
      .select({ total: sql<number>`count(*)` })
      .from(brands)
      .where(where),
  ]);

  const totalCount = Number(countRows[0]?.total ?? 0);

  return buildPaginatedResponse({
    items: items.map(toBrandResponse),
    totalCount,
    page,
    limit,
  });
}

export async function getBrand(id: number): Promise<BrandResponse> {
  const rows = await db.select().from(brands).where(eq(brands.id, id)).limit(1);
  const row = rows[0];
  if (!row) {
    throw httpError(404, 'NotFound', 'Brand not found');
  }
  return toBrandResponse(row);
}
