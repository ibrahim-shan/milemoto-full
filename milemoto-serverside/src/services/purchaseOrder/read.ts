import { and, asc, desc, eq, gte, like, lte, or, sql } from 'drizzle-orm';
import { purchaseorderlines, purchaseorders } from '@milemoto/types';
import { db } from '../../db/drizzle.js';
import { httpError } from '../../utils/error.js';
import { buildPaginatedResponse } from '../../utils/response.js';
import type { ListQueryDto } from '../../routes/admin/helpers/purchaseOrder.helpers.js';

export async function listPurchaseOrders(params: ListQueryDto) {
  const { page, limit, search, status, vendorId, paymentMethodId, dateFrom, dateTo } = params;
  const offset = (page - 1) * limit;

  const filters = [
    status ? eq(purchaseorders.status, status) : undefined,
    vendorId ? eq(purchaseorders.vendorId, vendorId) : undefined,
    paymentMethodId ? eq(purchaseorders.paymentMethodId, paymentMethodId) : undefined,
    search
      ? or(
          like(purchaseorders.poNumber, `%${search}%`),
          like(purchaseorders.subject, `%${search}%`)
        )
      : undefined,
    dateFrom ? gte(purchaseorders.createdAt, new Date(dateFrom)) : undefined,
    dateTo ? lte(purchaseorders.createdAt, new Date(dateTo)) : undefined,
  ].filter(Boolean) as NonNullable<ReturnType<typeof and>>[];

  const where = filters.length ? and(...filters) : undefined;

  const [items, countRows] = await Promise.all([
    db
      .select()
      .from(purchaseorders)
      .where(where)
      .orderBy(desc(purchaseorders.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ total: sql<number>`count(*)` })
      .from(purchaseorders)
      .where(where),
  ]);

  const total = Number(countRows[0]?.total ?? 0);

  return buildPaginatedResponse({
    items,
    totalCount: total,
    page,
    limit,
  });
}

export async function getPurchaseOrder(id: number) {
  const [header] = await db.select().from(purchaseorders).where(eq(purchaseorders.id, id)).limit(1);

  if (!header) {
    throw httpError(404, 'NotFound', 'Purchase order not found');
  }

  const lines = await db
    .select()
    .from(purchaseorderlines)
    .where(eq(purchaseorderlines.purchaseOrderId, id))
    .orderBy(asc(purchaseorderlines.id));

  return {
    ...header,
    lines,
  };
}
