import { and, asc, desc, eq, gte, like, lte, or, sql } from 'drizzle-orm';
import { purchaseorderlines, purchaseorders, vendors } from '@milemoto/types';
import { db } from '../../db/drizzle.js';
import { httpError } from '../../utils/error.js';
import { buildPaginatedResponse } from '../../utils/response.js';
import type { ListQueryDto } from '../../routes/admin/helpers/purchaseOrder.helpers.js';

export async function listPurchaseOrders(params: ListQueryDto) {
  const {
    page,
    limit,
    search,
    filterMode = 'all',
    status,
    vendorId,
    paymentMethodId,
    dateFrom,
    dateTo,
    sortBy,
    sortDir = 'desc',
  } = params;
  const offset = (page - 1) * limit;

  const searchFilter = search
    ? or(
        like(purchaseorders.poNumber, `%${search}%`),
        like(purchaseorders.subject, `%${search}%`)
      )
    : undefined;
  const optionalFilters = [
    status ? eq(purchaseorders.status, status) : undefined,
    vendorId ? eq(purchaseorders.vendorId, vendorId) : undefined,
    paymentMethodId ? eq(purchaseorders.paymentMethodId, paymentMethodId) : undefined,
    dateFrom ? gte(purchaseorders.createdAt, new Date(dateFrom)) : undefined,
    dateTo ? lte(purchaseorders.createdAt, new Date(dateTo)) : undefined,
  ].filter(Boolean) as NonNullable<ReturnType<typeof and>>[];

  const structuredFilter =
    optionalFilters.length === 0
      ? undefined
      : filterMode === 'any'
        ? or(...optionalFilters)
        : and(...optionalFilters);
  const where = and(searchFilter, structuredFilter);
  const sortColumns = {
    poNumber: purchaseorders.poNumber,
    subject: purchaseorders.subject,
    status: purchaseorders.status,
    total: purchaseorders.total,
    createdAt: purchaseorders.createdAt,
  } as const;
  const sortColumn = sortBy ? sortColumns[sortBy] : undefined;
  const orderExpr = sortColumn
    ? sortDir === 'asc'
      ? asc(sortColumn)
      : desc(sortColumn)
    : desc(purchaseorders.createdAt);

  const [items, countRows] = await Promise.all([
    db
      .select()
      .from(purchaseorders)
      .where(where)
      .orderBy(orderExpr)
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

export async function getPurchaseOrderFilterOptions() {
  const vendorRows = await db
    .selectDistinct({ id: vendors.id, name: vendors.name })
    .from(purchaseorders)
    .innerJoin(vendors, eq(vendors.id, purchaseorders.vendorId))
    .orderBy(asc(vendors.name));

  return {
    vendors: vendorRows.map(row => ({
      id: Number(row.id),
      name: row.name,
    })),
  };
}
