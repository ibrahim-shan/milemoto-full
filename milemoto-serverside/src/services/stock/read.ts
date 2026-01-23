import { and, asc, desc, eq, like, or, sql } from 'drizzle-orm';
import {
  products,
  productvariants,
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

  return buildPaginatedResponse({
    items: rows.map(mapStockMovementRow),
    totalCount: total,
    page,
    limit,
  });
}
