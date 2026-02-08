import crypto from 'crypto';
import { eq, sql } from 'drizzle-orm';
import {
  products,
  productvariants,
  stocklevels,
  stocklocations,
  stockmovements,
} from '@milemoto/types';
import type { CreateStockAdjustmentDto, CreateStockTransferDto } from '@milemoto/types';
import { db } from '../../db/drizzle.js';
import { httpError } from '../../utils/error.js';
import { firstRow, mapStockMovementRow } from './shared.js';
import { logAuditEvent } from '../auditLog.service.js';
import type { AuditContext } from '../adminUsers/write.js';

export async function createStockAdjustment(
  data: CreateStockAdjustmentDto,
  userId: number,
  audit?: AuditContext
) {
  const movementId = await db.transaction(async (tx) => {
    const variant = await tx
      .select({ id: productvariants.id })
      .from(productvariants)
      .where(eq(productvariants.id, data.productVariantId))
      .limit(1);
    if (!variant[0]) {
      throw httpError(404, 'NotFound', 'Product variant not found');
    }

    const location = await tx
      .select({ id: stocklocations.id })
      .from(stocklocations)
      .where(eq(stocklocations.id, data.stockLocationId))
      .limit(1);
    if (!location[0]) {
      throw httpError(404, 'NotFound', 'Stock location not found');
    }

    const levelRows = await tx.execute(
      sql`SELECT id, onHand FROM stocklevels WHERE productVariantId = ${data.productVariantId} AND stockLocationId = ${data.stockLocationId} FOR UPDATE`
    );
    const level = firstRow<{ id: number; onHand: number }>(levelRows);

    let stockLevelId: number | null = null;
    let currentOnHand = 0;

    if (level) {
      stockLevelId = Number(level.id);
      currentOnHand = Number(level.onHand);
    }

    const newOnHand = currentOnHand + data.quantity;
    if (newOnHand < 0) {
      throw httpError(400, 'BadRequest', 'Adjustment would result in negative stock on hand');
    }

    if (stockLevelId === null) {
      const inserted = await tx
        .insert(stocklevels)
        .values({
          productVariantId: data.productVariantId,
          stockLocationId: data.stockLocationId,
          onHand: newOnHand,
          allocated: 0,
          onOrder: 0,
        })
        .$returningId();
      stockLevelId = inserted[0]?.id ? Number(inserted[0].id) : null;
    } else {
      await tx
        .update(stocklevels)
        .set({ onHand: newOnHand })
        .where(eq(stocklevels.id, stockLevelId));
    }

    const movementInserted = await tx
      .insert(stockmovements)
      .values({
        productVariantId: data.productVariantId,
        stockLocationId: data.stockLocationId,
        performedByUserId: userId,
        quantity: data.quantity,
        type: 'adjustment',
        referenceType: 'manual_adjustment',
        referenceId: null,
        note: data.note ?? null,
      })
      .$returningId();

    const movementId = movementInserted[0]?.id ? Number(movementInserted[0].id) : null;

    if (!movementId) {
      throw httpError(500, 'InternalError', 'Failed to create stock movement');
    }

    return movementId;
  });

  // Audit log
  if (audit) {
    void logAuditEvent({
      userId: audit.userId,
      action: 'create',
      entityType: 'stock',
      entityId: String(movementId),
      metadata: {
        type: 'adjustment',
        variantId: data.productVariantId,
        locationId: data.stockLocationId,
        quantity: data.quantity,
        note: data.note,
      },
      ipAddress: audit.ipAddress,
      userAgent: audit.userAgent,
    });
  }

  const [movementRow] = await db
    .select({
      id: stockmovements.id,
      productVariantId: stockmovements.productVariantId,
      stockLocationId: stockmovements.stockLocationId,
      performedByUserId: stockmovements.performedByUserId,
      quantity: stockmovements.quantity,
      type: stockmovements.type,
      referenceType: stockmovements.referenceType,
      referenceId: stockmovements.referenceId,
      note: stockmovements.note,
      createdAt: stockmovements.createdAt,
      updatedAt: stockmovements.updatedAt,
      sku: productvariants.sku,
      variantName: productvariants.name,
      productName: products.name,
      stockLocationName: stocklocations.name,
    })
    .from(stockmovements)
    .innerJoin(productvariants, eq(productvariants.id, stockmovements.productVariantId))
    .innerJoin(products, eq(products.id, productvariants.productId))
    .innerJoin(stocklocations, eq(stocklocations.id, stockmovements.stockLocationId))
    .where(eq(stockmovements.id, movementId))
    .limit(1);

  if (!movementRow) {
    throw httpError(500, 'InternalError', 'Failed to load created stock movement');
  }

  return mapStockMovementRow(movementRow);
}

export async function createStockTransfer(
  data: CreateStockTransferDto,
  userId: number,
  audit?: AuditContext
) {
  const movementId = await db.transaction(async (tx) => {
    if (data.fromLocationId === data.toLocationId) {
      throw httpError(400, 'BadRequest', 'From and to locations must be different');
    }

    const variant = await tx
      .select({ id: productvariants.id })
      .from(productvariants)
      .where(eq(productvariants.id, data.productVariantId))
      .limit(1);
    if (!variant[0]) {
      throw httpError(404, 'NotFound', 'Product variant not found');
    }

    const fromLoc = await tx
      .select({ id: stocklocations.id })
      .from(stocklocations)
      .where(eq(stocklocations.id, data.fromLocationId))
      .limit(1);
    if (!fromLoc[0]) {
      throw httpError(404, 'NotFound', 'Source stock location not found');
    }

    const toLoc = await tx
      .select({ id: stocklocations.id })
      .from(stocklocations)
      .where(eq(stocklocations.id, data.toLocationId))
      .limit(1);
    if (!toLoc[0]) {
      throw httpError(404, 'NotFound', 'Destination stock location not found');
    }

    const qty = data.quantity;

    const fromLevelRows = await tx.execute(
      sql`SELECT id, onHand FROM stocklevels WHERE productVariantId = ${data.productVariantId} AND stockLocationId = ${data.fromLocationId} FOR UPDATE`
    );
    const fromLevel = firstRow<{ id: number; onHand: number }>(fromLevelRows);

    let fromOnHand = 0;
    let fromLevelId: number | null = null;

    if (fromLevel) {
      fromLevelId = Number(fromLevel.id);
      fromOnHand = Number(fromLevel.onHand);
    }

    if (fromOnHand < qty) {
      throw httpError(
        400,
        'BadRequest',
        'Not enough stock at source location to transfer this quantity'
      );
    }

    const toLevelRows = await tx.execute(
      sql`SELECT id, onHand FROM stocklevels WHERE productVariantId = ${data.productVariantId} AND stockLocationId = ${data.toLocationId} FOR UPDATE`
    );
    const toLevel = firstRow<{ id: number; onHand: number }>(toLevelRows);

    let toOnHand = 0;
    let toLevelId: number | null = null;

    if (toLevel) {
      toLevelId = Number(toLevel.id);
      toOnHand = Number(toLevel.onHand);
    }

    const newFromOnHand = fromOnHand - qty;
    const newToOnHand = toOnHand + qty;

    if (fromLevelId === null) {
      throw httpError(400, 'BadRequest', 'No stock at source location to transfer');
    } else {
      await tx
        .update(stocklevels)
        .set({ onHand: newFromOnHand })
        .where(eq(stocklevels.id, fromLevelId));
    }

    if (toLevelId === null) {
      const inserted = await tx
        .insert(stocklevels)
        .values({
          productVariantId: data.productVariantId,
          stockLocationId: data.toLocationId,
          onHand: newToOnHand,
          allocated: 0,
          onOrder: 0,
        })
        .$returningId();
      toLevelId = inserted[0]?.id ? Number(inserted[0].id) : null;
    } else {
      await tx
        .update(stocklevels)
        .set({ onHand: newToOnHand })
        .where(eq(stocklevels.id, toLevelId));
    }

    // Generate a UUID to correlate the transfer_out and transfer_in movements
    const transferId = crypto.randomUUID();

    const outInserted = await tx
      .insert(stockmovements)
      .values({
        productVariantId: data.productVariantId,
        stockLocationId: data.fromLocationId,
        performedByUserId: userId,
        quantity: -qty,
        type: 'transfer_out',
        referenceType: 'manual_transfer',
        referenceId: null,
        transferId,
        note: data.note ?? null,
      })
      .$returningId();

    await tx.insert(stockmovements).values({
      productVariantId: data.productVariantId,
      stockLocationId: data.toLocationId,
      performedByUserId: userId,
      quantity: qty,
      type: 'transfer_in',
      referenceType: 'manual_transfer',
      referenceId: null,
      transferId,
      note: data.note ?? null,
    });

    const movementId = outInserted[0]?.id ? Number(outInserted[0].id) : null;
    if (!movementId) {
      throw httpError(500, 'InternalError', 'Failed to create stock movement');
    }

    return movementId;
  });

  // Audit log
  if (audit) {
    void logAuditEvent({
      userId: audit.userId,
      action: 'create',
      entityType: 'stock',
      entityId: String(movementId),
      metadata: {
        type: 'transfer',
        variantId: data.productVariantId,
        fromLocationId: data.fromLocationId,
        toLocationId: data.toLocationId,
        quantity: data.quantity,
        note: data.note,
      },
      ipAddress: audit.ipAddress,
      userAgent: audit.userAgent,
    });
  }

  const [movementRow] = await db
    .select({
      id: stockmovements.id,
      productVariantId: stockmovements.productVariantId,
      stockLocationId: stockmovements.stockLocationId,
      performedByUserId: stockmovements.performedByUserId,
      quantity: stockmovements.quantity,
      type: stockmovements.type,
      referenceType: stockmovements.referenceType,
      referenceId: stockmovements.referenceId,
      note: stockmovements.note,
      createdAt: stockmovements.createdAt,
      updatedAt: stockmovements.updatedAt,
      sku: productvariants.sku,
      variantName: productvariants.name,
      productName: products.name,
      stockLocationName: stocklocations.name,
    })
    .from(stockmovements)
    .innerJoin(productvariants, eq(productvariants.id, stockmovements.productVariantId))
    .innerJoin(products, eq(products.id, productvariants.productId))
    .innerJoin(stocklocations, eq(stocklocations.id, stockmovements.stockLocationId))
    .where(eq(stockmovements.id, movementId))
    .limit(1);

  if (!movementRow) {
    throw httpError(500, 'InternalError', 'Failed to load created stock movement');
  }

  return mapStockMovementRow(movementRow);
}
