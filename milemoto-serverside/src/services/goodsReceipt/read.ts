import { and, asc, desc, eq, gte, like, lte, or, sql } from 'drizzle-orm';
import { goodsreceiptlines, goodsreceipts, purchaseorders } from '@milemoto/types';
import type { ListQueryDto } from '../../routes/admin/helpers/goodsReceipt.helpers.js';
import { db } from '../../db/drizzle.js';
import { httpError } from '../../utils/error.js';
import { buildPaginatedResponse } from '../../utils/response.js';
import { mapGoodsReceiptHeader, mapGoodsReceiptLine } from './shared.js';

export async function listGoodsReceipts(params: ListQueryDto) {
  const {
    page,
    limit,
    search,
    filterMode = 'all',
    purchaseOrderId,
    status,
    dateFrom,
    dateTo,
    sortBy,
    sortDir = 'desc',
  } = params;
  const offset = (page - 1) * limit;

  const searchFilter = search
    ? or(
        like(goodsreceipts.grnNumber, `%${search}%`),
        like(goodsreceipts.note, `%${search}%`),
        like(purchaseorders.poNumber, `%${search}%`)
      )
    : undefined;
  const optionalFilters = [
    purchaseOrderId ? eq(goodsreceipts.purchaseOrderId, purchaseOrderId) : undefined,
    status ? eq(goodsreceipts.status, status) : undefined,
    dateFrom ? gte(goodsreceipts.createdAt, new Date(dateFrom)) : undefined,
    dateTo ? lte(goodsreceipts.createdAt, new Date(dateTo)) : undefined,
  ].filter(Boolean) as NonNullable<ReturnType<typeof and>>[];

  const structuredFilter =
    optionalFilters.length === 0
      ? undefined
      : filterMode === 'any'
        ? or(...optionalFilters)
        : and(...optionalFilters);
  const where = and(searchFilter, structuredFilter);
  const receivedAtExpr = sql`coalesce(${goodsreceipts.postedAt}, ${goodsreceipts.createdAt})`;
  const sortColumns = {
    grnNumber: goodsreceipts.grnNumber,
    poNumber: purchaseorders.poNumber,
    status: goodsreceipts.status,
    receivedAt: receivedAtExpr,
  } as const;
  const sortColumn = sortBy ? sortColumns[sortBy] : receivedAtExpr;
  const orderExpr = sortDir === 'asc' ? asc(sortColumn) : desc(sortColumn);

  const [countRows, rows] = await Promise.all([
    db
      .select({ total: sql<number>`count(*)` })
      .from(goodsreceipts)
      .innerJoin(purchaseorders, eq(purchaseorders.id, goodsreceipts.purchaseOrderId))
      .where(where),
    db
      .select({
        id: goodsreceipts.id,
        purchaseOrderId: goodsreceipts.purchaseOrderId,
        grnNumber: goodsreceipts.grnNumber,
        status: goodsreceipts.status,
        note: goodsreceipts.note,
        postedByUserId: goodsreceipts.postedByUserId,
        postedAt: goodsreceipts.postedAt,
        createdAt: goodsreceipts.createdAt,
        updatedAt: goodsreceipts.updatedAt,
        purchaseOrderNumber: purchaseorders.poNumber,
        purchaseOrderSubject: purchaseorders.subject,
      })
      .from(goodsreceipts)
      .innerJoin(purchaseorders, eq(purchaseorders.id, goodsreceipts.purchaseOrderId))
      .where(where)
      .orderBy(orderExpr)
      .limit(limit)
      .offset(offset),
  ]);

  const total = Number(countRows[0]?.total ?? 0);
  const items = rows.map(mapGoodsReceiptHeader);

  return buildPaginatedResponse({
    items,
    totalCount: total,
    page,
    limit,
  });
}

export async function getGoodsReceipt(id: number) {
  const [row] = await db
    .select({
      id: goodsreceipts.id,
      purchaseOrderId: goodsreceipts.purchaseOrderId,
      grnNumber: goodsreceipts.grnNumber,
      status: goodsreceipts.status,
      note: goodsreceipts.note,
      postedByUserId: goodsreceipts.postedByUserId,
      postedAt: goodsreceipts.postedAt,
      createdAt: goodsreceipts.createdAt,
      updatedAt: goodsreceipts.updatedAt,
      purchaseOrderNumber: purchaseorders.poNumber,
      purchaseOrderSubject: purchaseorders.subject,
    })
    .from(goodsreceipts)
    .innerJoin(purchaseorders, eq(purchaseorders.id, goodsreceipts.purchaseOrderId))
    .where(eq(goodsreceipts.id, id))
    .limit(1);

  if (!row) {
    throw httpError(404, 'NotFound', 'Goods receipt not found');
  }

  const header = mapGoodsReceiptHeader(row);
  const lineRows = await db
    .select()
    .from(goodsreceiptlines)
    .where(eq(goodsreceiptlines.goodsReceiptId, id))
    .orderBy(asc(goodsreceiptlines.id));

  const lines = lineRows.map((l) => mapGoodsReceiptLine(l, header));
  return { ...header, lines };
}
