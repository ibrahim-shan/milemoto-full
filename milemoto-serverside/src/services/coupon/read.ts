import { and, asc, desc, eq, gte, like, lte, or, sql } from 'drizzle-orm';
import { coupons } from '@milemoto/types';
import type { CouponListQueryDto, PaginatedCouponResponse, CouponResponse } from '@milemoto/types';
import { db } from '../../db/drizzle.js';
import { httpError } from '../../utils/error.js';
import { buildPaginatedResponse } from '../../utils/response.js';
import { toCouponResponse } from './shared.js';

export async function listCoupons(params: CouponListQueryDto): Promise<PaginatedCouponResponse> {
  const page = params.page ?? 1;
  const limit = params.limit ?? 10;
  const offset = (page - 1) * limit;
  const filterMode = params.filterMode ?? 'all';

  const baseFilters = [
    params.search ? like(coupons.code, `%${params.search.toUpperCase()}%`) : undefined,
  ].filter(Boolean) as NonNullable<ReturnType<typeof and>>[];

  const optionFilters = [
    params.status ? eq(coupons.status, params.status) : undefined,
    params.type ? eq(coupons.type, params.type) : undefined,
    params.dateFrom ? gte(coupons.createdAt, new Date(params.dateFrom)) : undefined,
    params.dateTo ? lte(coupons.createdAt, new Date(params.dateTo)) : undefined,
  ].filter(Boolean) as NonNullable<ReturnType<typeof and>>[];
  const filters = [...baseFilters];
  if (optionFilters.length > 0) {
    if (filterMode === 'any') {
      filters.push(or(...optionFilters)!);
    } else {
      filters.push(...optionFilters);
    }
  }
  const where = filters.length > 0 ? and(...filters) : undefined;
  const sortColumns = {
    code: coupons.code,
    type: coupons.type,
    value: coupons.value,
    startsAt: coupons.startsAt,
    endsAt: coupons.endsAt,
    usedCount: coupons.usedCount,
    status: coupons.status,
    createdAt: coupons.createdAt,
  } as const;
  const sortBy = params.sortBy ?? 'code';
  const sortDir = params.sortDir ?? 'asc';
  const sortColumn = sortColumns[sortBy];
  const orderExpr = sortDir === 'desc' ? desc(sortColumn) : asc(sortColumn);

  const [rows, countRows] = await Promise.all([
    db.select().from(coupons).where(where).orderBy(orderExpr).limit(limit).offset(offset),
    db
      .select({ total: sql<number>`count(*)` })
      .from(coupons)
      .where(where),
  ]);

  const total = Number(countRows[0]?.total ?? 0);

  return buildPaginatedResponse({
    items: rows.map(toCouponResponse),
    totalCount: total,
    page,
    limit,
  });
}

export async function getCoupon(id: number): Promise<CouponResponse> {
  const [row] = await db.select().from(coupons).where(eq(coupons.id, id)).limit(1);
  if (!row) {
    throw httpError(404, 'NotFound', 'Coupon not found');
  }
  return toCouponResponse(row);
}
