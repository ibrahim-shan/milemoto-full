import { and, asc, desc, eq, like, or, sql } from 'drizzle-orm';
import {
  goodsreceipts,
  products,
  productvariants,
  purchaseorders,
  orders,
  stocklevels,
  stocklocations,
  stockmovements,
} from '@milemoto/types';
import type {
  StockLevelListQueryDto,
  StockMovementListQueryDto,
} from '../../routes/admin/helpers/stock.helpers.js';
import { db } from '../../db/drizzle.js';
import { buildPaginatedResponse } from '../../utils/response.js';
import { mapStockLevelRow, mapStockMovementRow } from './shared.js';

function prettyReferenceType(value: string) {
  return value
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function listStockLevels(params: StockLevelListQueryDto) {
  const { page, limit, search, productVariantId, productId, stockLocationId } = params;
  const offset = (page - 1) * limit;

  const filters = [
    search
      ? or(
          like(productvariants.sku, `%${search}%`),
          like(products.name, `%${search}%`),
          like(stocklocations.name, `%${search}%`)
        )
      : undefined,
    productVariantId ? eq(stocklevels.productVariantId, productVariantId) : undefined,
    productId ? eq(productvariants.productId, productId) : undefined,
    stockLocationId ? eq(stocklevels.stockLocationId, stockLocationId) : undefined,
  ].filter(Boolean) as NonNullable<ReturnType<typeof and>>[];

  const where = filters.length ? and(...filters) : undefined;

  const [rows, countRows] = await Promise.all([
    db
      .select({
        id: stocklevels.id,
        productVariantId: stocklevels.productVariantId,
        stockLocationId: stocklevels.stockLocationId,
        onHand: stocklevels.onHand,
        allocated: stocklevels.allocated,
        onOrder: stocklevels.onOrder,
        sku: productvariants.sku,
        variantName: productvariants.name,
        productName: products.name,
        stockLocationName: stocklocations.name,
        lowStockThreshold: productvariants.lowStockThreshold,
        price: productvariants.price,
        costPrice: productvariants.costPrice,
        createdAt: stocklevels.createdAt,
        updatedAt: stocklevels.updatedAt,
      })
      .from(stocklevels)
      .innerJoin(productvariants, eq(productvariants.id, stocklevels.productVariantId))
      .innerJoin(products, eq(products.id, productvariants.productId))
      .innerJoin(stocklocations, eq(stocklocations.id, stocklevels.stockLocationId))
      .where(where)
      .orderBy(asc(products.name), asc(productvariants.sku), asc(stocklocations.name))
      .limit(limit)
      .offset(offset),
    db
      .select({ total: sql<number>`count(*)` })
      .from(stocklevels)
      .innerJoin(productvariants, eq(productvariants.id, stocklevels.productVariantId))
      .innerJoin(products, eq(products.id, productvariants.productId))
      .innerJoin(stocklocations, eq(stocklocations.id, stocklevels.stockLocationId))
      .where(where),
  ]);

  const total = Number(countRows[0]?.total ?? 0);

  return buildPaginatedResponse({
    items: rows.map(mapStockLevelRow),
    totalCount: total,
    page,
    limit,
  });
}

export async function getStockSummary() {
  const [locationCountRows, aggregateRows] = await Promise.all([
    db.select({ total: sql<number>`count(*)` }).from(stocklocations),
    db
      .select({
        productsQuantity: sql<number>`coalesce(sum(${stocklevels.onHand}), 0)`,
        totalStockValue: sql<number>`coalesce(sum(${stocklevels.onHand} * ${productvariants.costPrice}), 0)`,
        expectedRevenue: sql<number>`coalesce(sum(${stocklevels.onHand} * ${productvariants.price}), 0)`,
      })
      .from(stocklevels)
      .innerJoin(productvariants, eq(productvariants.id, stocklevels.productVariantId)),
  ]);

  return {
    locationCount: Number(locationCountRows[0]?.total ?? 0),
    productsQuantity: Number(aggregateRows[0]?.productsQuantity ?? 0),
    totalStockValue: Number(aggregateRows[0]?.totalStockValue ?? 0),
    expectedRevenue: Number(aggregateRows[0]?.expectedRevenue ?? 0),
  };
}

export async function listStockMovements(params: StockMovementListQueryDto) {
  const { page, limit, search, productVariantId, stockLocationId, type } = params;
  const offset = (page - 1) * limit;

  const filters = [
    search
      ? or(
          like(productvariants.sku, `%${search}%`),
          like(products.name, `%${search}%`),
          like(stocklocations.name, `%${search}%`),
          like(stockmovements.referenceType, `%${search}%`)
        )
      : undefined,
    productVariantId ? eq(stockmovements.productVariantId, productVariantId) : undefined,
    stockLocationId ? eq(stockmovements.stockLocationId, stockLocationId) : undefined,
    type ? eq(stockmovements.type, type) : undefined,
  ].filter(Boolean) as NonNullable<ReturnType<typeof and>>[];

  const where = filters.length ? and(...filters) : undefined;

  const [rows, countRows] = await Promise.all([
    db
      .select({
        id: stockmovements.id,
        productVariantId: stockmovements.productVariantId,
        stockLocationId: stockmovements.stockLocationId,
        quantity: stockmovements.quantity,
        type: stockmovements.type,
        referenceType: stockmovements.referenceType,
        referenceId: stockmovements.referenceId,
        note: stockmovements.note,
        createdAt: stockmovements.createdAt,
        updatedAt: stockmovements.updatedAt,
        performedByUserId: stockmovements.performedByUserId,
        sku: productvariants.sku,
        variantName: productvariants.name,
        productName: products.name,
        stockLocationName: stocklocations.name,
      })
      .from(stockmovements)
      .innerJoin(productvariants, eq(productvariants.id, stockmovements.productVariantId))
      .innerJoin(products, eq(products.id, productvariants.productId))
      .innerJoin(stocklocations, eq(stocklocations.id, stockmovements.stockLocationId))
      .where(where)
      .orderBy(desc(stockmovements.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ total: sql<number>`count(*)` })
      .from(stockmovements)
      .innerJoin(productvariants, eq(productvariants.id, stockmovements.productVariantId))
      .innerJoin(products, eq(products.id, productvariants.productId))
      .innerJoin(stocklocations, eq(stocklocations.id, stockmovements.stockLocationId))
      .where(where),
  ]);

  const total = Number(countRows[0]?.total ?? 0);

  const customerOrderIds = new Set<number>();
  const orderIds = new Set<number>();
  const goodsReceiptIds = new Set<number>();
  const purchaseOrderIds = new Set<number>();

  rows.forEach((row) => {
    const refType = typeof row.referenceType === 'string' ? row.referenceType : null;
    const refId =
      row.referenceId !== null && row.referenceId !== undefined ? Number(row.referenceId) : null;
    if (!refType || !refId) return;
    if (refType === 'customer_order') customerOrderIds.add(refId);
    else if (refType === 'order') orderIds.add(refId);
    else if (refType === 'goodsReceipt') goodsReceiptIds.add(refId);
    else if (refType === 'purchaseOrder') purchaseOrderIds.add(refId);
  });

  const [customerOrders, genericOrders, goodsReceipts, purchaseOrders] = await Promise.all([
    customerOrderIds.size
      ? db
          .select({ id: orders.id, orderNumber: orders.orderNumber })
          .from(orders)
          .where(
            sql`${orders.id} in (${sql.join(
              [...customerOrderIds].map((id) => sql`${id}`),
              sql`, `
            )})`
          )
      : Promise.resolve([] as Array<{ id: number; orderNumber: string }>),
    orderIds.size
      ? db
          .select({ id: orders.id, orderNumber: orders.orderNumber })
          .from(orders)
          .where(
            sql`${orders.id} in (${sql.join(
              [...orderIds].map((id) => sql`${id}`),
              sql`, `
            )})`
          )
      : Promise.resolve([] as Array<{ id: number; orderNumber: string }>),
    goodsReceiptIds.size
      ? db
          .select({ id: goodsreceipts.id, grnNumber: goodsreceipts.grnNumber })
          .from(goodsreceipts)
          .where(
            sql`${goodsreceipts.id} in (${sql.join(
              [...goodsReceiptIds].map((id) => sql`${id}`),
              sql`, `
            )})`
          )
      : Promise.resolve([] as Array<{ id: number; grnNumber: string }>),
    purchaseOrderIds.size
      ? db
          .select({ id: purchaseorders.id, poNumber: purchaseorders.poNumber })
          .from(purchaseorders)
          .where(
            sql`${purchaseorders.id} in (${sql.join(
              [...purchaseOrderIds].map((id) => sql`${id}`),
              sql`, `
            )})`
          )
      : Promise.resolve([] as Array<{ id: number; poNumber: string }>),
  ]);

  const customerOrderMap = new Map(customerOrders.map((r) => [Number(r.id), r.orderNumber]));
  const orderMap = new Map(genericOrders.map((r) => [Number(r.id), r.orderNumber]));
  const goodsReceiptMap = new Map(goodsReceipts.map((r) => [Number(r.id), r.grnNumber]));
  const purchaseOrderMap = new Map(purchaseOrders.map((r) => [Number(r.id), r.poNumber]));

  const rowsWithReferenceDisplay = rows.map((row) => {
    const refType = typeof row.referenceType === 'string' ? row.referenceType : null;
    const refId =
      row.referenceId !== null && row.referenceId !== undefined ? Number(row.referenceId) : null;
    let referenceDisplay: string | null = null;

    if (refType && refId) {
      if (refType === 'customer_order') {
        const orderNumber = customerOrderMap.get(refId);
        referenceDisplay = orderNumber
          ? `Customer Order #${refId} - ${orderNumber}`
          : `Customer Order #${refId}`;
      } else if (refType === 'order') {
        const orderNumber = orderMap.get(refId);
        referenceDisplay = orderNumber ? `Order #${refId} - ${orderNumber}` : `Order #${refId}`;
      } else if (refType === 'goodsReceipt') {
        const grnNumber = goodsReceiptMap.get(refId);
        referenceDisplay = grnNumber
          ? `Goods Receipt #${refId} - ${grnNumber}`
          : `Goods Receipt #${refId}`;
      } else if (refType === 'purchaseOrder') {
        const poNumber = purchaseOrderMap.get(refId);
        referenceDisplay = poNumber
          ? `Purchase Order #${refId} - ${poNumber}`
          : `Purchase Order #${refId}`;
      } else {
        referenceDisplay = `${prettyReferenceType(refType)} #${refId}`;
      }
    }

    return { ...row, referenceDisplay };
  });

  return buildPaginatedResponse({
    items: rowsWithReferenceDisplay.map(mapStockMovementRow),
    totalCount: total,
    page,
    limit,
  });
}
