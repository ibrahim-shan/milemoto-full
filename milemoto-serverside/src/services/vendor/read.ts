import { and, asc, desc, eq, inArray, like, or, sql } from 'drizzle-orm';
import { vendors } from '@milemoto/types';
import type { ListQueryDto } from '../../routes/admin/helpers/vendor.helpers.js';
import { db } from '../../db/drizzle.js';
import { httpError } from '../../utils/error.js';
import { buildPaginatedResponse } from '../../utils/response.js';
import { formatVendor } from './shared.js';

export async function listVendors(params: ListQueryDto) {
  const {
    page,
    limit,
    search,
    status,
    country,
    filterMode = 'all',
    sortBy,
    sortDir = 'asc',
  } = params;
  const offset = (page - 1) * limit;
  const countries = Array.isArray(country) ? country : country ? [country] : [];

  const searchFilter = search
    ? or(
        like(vendors.name, `%${search}%`),
        like(vendors.description, `%${search}%`),
        like(vendors.email, `%${search}%`)
      )
    : undefined;

  const facetFilters = [
    status ? eq(vendors.status, status) : undefined,
    countries.length > 0 ? inArray(vendors.country, countries) : undefined,
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
    name: vendors.name,
    country: vendors.country,
    status: vendors.status,
    email: vendors.email,
    createdAt: vendors.createdAt,
    updatedAt: vendors.updatedAt,
  } as const;

  const sortColumn = sortBy ? sortColumns[sortBy] : undefined;
  const primarySort = sortColumn ? (sortDir === 'desc' ? desc(sortColumn) : asc(sortColumn)) : null;

  const [items, countRows] = await Promise.all([
    db
      .select()
      .from(vendors)
      .where(where)
      .orderBy(...(primarySort ? [primarySort] : []), asc(vendors.name))
      .limit(limit)
      .offset(offset),
    db
      .select({ total: sql<number>`count(*)` })
      .from(vendors)
      .where(where),
  ]);

  const total = Number(countRows[0]?.total ?? 0);

  return buildPaginatedResponse({
    items: items.map(formatVendor),
    totalCount: total,
    page,
    limit,
  });
}

export async function getVendor(id: number) {
  const rows = await db.select().from(vendors).where(eq(vendors.id, id)).limit(1);
  if (!rows[0]) {
    throw httpError(404, 'NotFound', 'Vendor not found');
  }
  return formatVendor(rows[0]);
}
