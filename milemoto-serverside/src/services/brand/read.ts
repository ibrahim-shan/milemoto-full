import { and, asc, desc, eq, like, or, sql } from 'drizzle-orm';
import { brands } from '@milemoto/types';
import type { BrandResponse } from '@milemoto/types';
import type { ListQueryDto } from '../../routes/admin/helpers/brand.helpers.js';
import { db } from '../../db/drizzle.js';
import { httpError } from '../../utils/error.js';
import { buildPaginatedResponse } from '../../utils/response.js';
import { toBrandResponse } from './shared.js';

export async function listBrands(params: ListQueryDto) {
  const {
    page,
    limit,
    search,
    status,
    filterMode = 'all',
    sortBy = 'name',
    sortDir = 'asc',
  } = params;
  const offset = (page - 1) * limit;

  const searchFilter = search
    ? or(like(brands.name, `%${search}%`), like(brands.description, `%${search}%`))
    : undefined;
  const optionalFilters = [status ? eq(brands.status, status) : undefined].filter(Boolean);
  const structuredFilter =
    optionalFilters.length === 0
      ? undefined
      : filterMode === 'any'
        ? or(...optionalFilters)
        : and(...optionalFilters);
  const where = and(searchFilter, structuredFilter);
  const sortColumn =
    sortBy === 'slug'
      ? brands.slug
      : sortBy === 'description'
        ? brands.description
        : sortBy === 'status'
          ? brands.status
          : sortBy === 'createdAt'
            ? brands.createdAt
            : sortBy === 'updatedAt'
              ? brands.updatedAt
              : brands.name;
  const orderByClause = sortDir === 'desc' ? desc(sortColumn) : asc(sortColumn);

  const [items, countRows] = await Promise.all([
    db
      .select()
      .from(brands)
      .where(where)
      .orderBy(orderByClause, asc(brands.id))
      .limit(limit)
      .offset(offset),
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
