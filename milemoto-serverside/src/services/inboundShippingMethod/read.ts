import { and, asc, eq, like, or, sql } from 'drizzle-orm';
import { inboundshippingmethods } from '@milemoto/types';
import type { ListQueryDto } from '../../routes/admin/helpers/inboundShippingMethod.helpers.js';
import { buildPaginatedResponse } from '../../utils/response.js';
import { httpError } from '../../utils/error.js';
import { db } from '../../db/drizzle.js';
import { formatInboundShippingMethod } from './shared.js';

export async function listInboundShippingMethods(params: ListQueryDto) {
  const { page, limit, search, status } = params;
  const offset = (page - 1) * limit;

  const filters = [
    search
      ? or(
          like(inboundshippingmethods.name, `%${search}%`),
          like(inboundshippingmethods.code, `%${search}%`)
        )
      : undefined,
    status ? eq(inboundshippingmethods.status, status) : undefined,
  ].filter(Boolean) as NonNullable<ReturnType<typeof and>>[];

  const where = filters.length ? and(...filters) : undefined;

  const [items, countRows] = await Promise.all([
    db
      .select()
      .from(inboundshippingmethods)
      .where(where)
      .orderBy(asc(inboundshippingmethods.name))
      .limit(limit)
      .offset(offset),
    db
      .select({ total: sql<number>`count(*)` })
      .from(inboundshippingmethods)
      .where(where),
  ]);

  const total = Number(countRows[0]?.total ?? 0);

  return buildPaginatedResponse({
    items: items.map(formatInboundShippingMethod),
    totalCount: total,
    page,
    limit,
  });
}

export async function getInboundShippingMethod(id: number) {
  const rows = await db
    .select()
    .from(inboundshippingmethods)
    .where(eq(inboundshippingmethods.id, id))
    .limit(1);

  if (!rows[0]) {
    throw httpError(404, 'NotFound', 'Inbound shipping method not found');
  }

  return formatInboundShippingMethod(rows[0]);
}
