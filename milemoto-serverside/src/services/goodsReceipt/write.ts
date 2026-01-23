import { asc, eq, sql } from 'drizzle-orm';
import {
  goodsreceiptlines,
  goodsreceipts,
  purchaseorderlines,
  purchaseorders,
} from '@milemoto/types';
import type { CreateGoodsReceiptDto, UpdateGoodsReceiptDto } from '@milemoto/types';
import { db } from '../../db/drizzle.js';
import { httpError } from '../../utils/error.js';
import { updateProductCosts } from './costs.js';
import { generateGrnNumber } from './numbers.js';
import { applyStockMovementsForReceipt } from './stock.js';
import { getGoodsReceipt } from './read.js';

export async function createGoodsReceipt(data: CreateGoodsReceiptDto) {
  const grnId = await db.transaction(async (tx) => {
    const [poRow] = await tx
      .select({
        id: purchaseorders.id,
        status: purchaseorders.status,
        stockLocationId: purchaseorders.stockLocationId,
      })
      .from(purchaseorders)
      .where(eq(purchaseorders.id, data.purchaseOrderId))
      .limit(1);
    if (!poRow) {
      throw httpError(404, 'NotFound', 'Purchase order not found');
    }

    const poStatus = String(poRow.status);
    if (poStatus !== 'approved' && poStatus !== 'partially_received') {
      throw httpError(
        400,
        'BadRequest',
        'Goods receipts can only be created for approved or partially received purchase orders'
      );
    }

    const poLineRows = await tx
      .select({
        id: purchaseorderlines.id,
        productVariantId: purchaseorderlines.productVariantId,
        orderedQty: purchaseorderlines.orderedQty,
        receivedQty: purchaseorderlines.receivedQty,
        rejectedQty: purchaseorderlines.rejectedQty,
        cancelledQty: purchaseorderlines.cancelledQty,
      })
      .from(purchaseorderlines)
      .where(eq(purchaseorderlines.purchaseOrderId, data.purchaseOrderId));

    if (poLineRows.length === 0) {
      throw httpError(400, 'BadRequest', 'Purchase order has no lines');
    }

    const lineMap = new Map<
      number,
      {
        id: number;
        productVariantId: number;
        orderedQty: number;
        receivedQty: number;
        rejectedQty: number;
        cancelledQty: number;
      }
    >();
    for (const row of poLineRows) {
      lineMap.set(Number(row.id), {
        id: Number(row.id),
        productVariantId: Number(row.productVariantId),
        orderedQty: Number(row.orderedQty),
        receivedQty: Number(row.receivedQty),
        rejectedQty: Number(row.rejectedQty),
        cancelledQty: Number(row.cancelledQty),
      });
    }

    if (data.lines.length === 0) {
      throw httpError(400, 'BadRequest', 'At least one goods receipt line is required');
    }

    const updates: Array<{ id: number; receivedQtyDelta: number; rejectedQtyDelta: number }> = [];

    for (const line of data.lines) {
      const poLine = lineMap.get(line.purchaseOrderLineId);
      if (!poLine) {
        throw httpError(
          400,
          'BadRequest',
          `Purchase order line ${line.purchaseOrderLineId} does not belong to this purchase order`
        );
      }

      const receivedQty = line.receivedQty;
      const rejectedQty = line.rejectedQty ?? 0;
      if (receivedQty < 0 || rejectedQty < 0) {
        throw httpError(400, 'BadRequest', 'Received and rejected quantities cannot be negative');
      }

      const remainingQty =
        poLine.orderedQty - (poLine.receivedQty + poLine.rejectedQty + poLine.cancelledQty);

      if (receivedQty + rejectedQty > remainingQty) {
        throw httpError(
          400,
          'BadRequest',
          `Received + rejected quantity exceeds remaining quantity for line ${poLine.id}`
        );
      }

      if (receivedQty === 0 && rejectedQty === 0) continue;

      updates.push({
        id: poLine.id,
        receivedQtyDelta: receivedQty,
        rejectedQtyDelta: rejectedQty,
      });
    }

    if (updates.length === 0) {
      throw httpError(
        400,
        'BadRequest',
        'At least one line must have non-zero received or rejected quantity'
      );
    }

    const grnNumber = await generateGrnNumber(tx);
    const inserted = await tx
      .insert(goodsreceipts)
      .values({
        purchaseOrderId: data.purchaseOrderId,
        grnNumber,
        status: 'draft',
        note: data.note ?? null,
        postedByUserId: null,
        postedAt: null,
      })
      .$returningId();

    const grnId = inserted[0]?.id ? Number(inserted[0].id) : undefined;
    if (!grnId) {
      throw httpError(500, 'InsertFailed', 'Failed to create goods receipt');
    }

    await tx.insert(goodsreceiptlines).values(
      updates.map((u) => {
        const poLine = lineMap.get(u.id)!;
        const input = data.lines.find((l) => l.purchaseOrderLineId === u.id)!;
        const expirationDate = input.expirationDate ? new Date(input.expirationDate) : null;
        return {
          goodsReceiptId: grnId,
          purchaseOrderLineId: poLine.id,
          productVariantId: poLine.productVariantId,
          receivedQty: input.receivedQty,
          rejectedQty: input.rejectedQty ?? 0,
          batchNumber: input.batchNumber ?? null,
          serialNumber: input.serialNumber ?? null,
          expirationDate,
        };
      })
    );

    return grnId;
  });

  return getGoodsReceipt(grnId);
}

export async function updateGoodsReceipt(id: number, data: UpdateGoodsReceiptDto) {
  await db.transaction(async (tx) => {
    const [grnRow] = await tx
      .select({
        id: goodsreceipts.id,
        purchaseOrderId: goodsreceipts.purchaseOrderId,
        status: goodsreceipts.status,
      })
      .from(goodsreceipts)
      .where(eq(goodsreceipts.id, id))
      .limit(1);
    if (!grnRow) {
      throw httpError(404, 'NotFound', 'Goods receipt not found');
    }
    if (grnRow.status !== 'draft') {
      throw httpError(400, 'BadRequest', 'Only draft goods receipts can be updated');
    }

    const purchaseOrderId = Number(grnRow.purchaseOrderId);
    const poLineRows = await tx
      .select({
        id: purchaseorderlines.id,
        productVariantId: purchaseorderlines.productVariantId,
        orderedQty: purchaseorderlines.orderedQty,
        receivedQty: purchaseorderlines.receivedQty,
        rejectedQty: purchaseorderlines.rejectedQty,
        cancelledQty: purchaseorderlines.cancelledQty,
      })
      .from(purchaseorderlines)
      .where(eq(purchaseorderlines.purchaseOrderId, purchaseOrderId));

    if (poLineRows.length === 0) {
      throw httpError(400, 'BadRequest', 'Purchase order has no lines');
    }

    const lineMap = new Map<
      number,
      {
        id: number;
        productVariantId: number;
        orderedQty: number;
        receivedQty: number;
        rejectedQty: number;
        cancelledQty: number;
      }
    >();
    for (const row of poLineRows) {
      lineMap.set(Number(row.id), {
        id: Number(row.id),
        productVariantId: Number(row.productVariantId),
        orderedQty: Number(row.orderedQty),
        receivedQty: Number(row.receivedQty),
        rejectedQty: Number(row.rejectedQty),
        cancelledQty: Number(row.cancelledQty),
      });
    }

    if (!data.lines || data.lines.length === 0) {
      throw httpError(400, 'BadRequest', 'At least one goods receipt line is required');
    }

    const updates: Array<{
      id: number;
      receivedQty: number;
      rejectedQty: number;
      batchNumber: string | null;
      serialNumber: string | null;
      expirationDate: string | null;
    }> = [];

    for (const line of data.lines) {
      const poLine = lineMap.get(line.purchaseOrderLineId);
      if (!poLine) {
        throw httpError(
          400,
          'BadRequest',
          `Purchase order line ${line.purchaseOrderLineId} does not belong to this purchase order`
        );
      }

      const receivedQty = line.receivedQty;
      const rejectedQty = line.rejectedQty ?? 0;

      if (receivedQty < 0 || rejectedQty < 0) {
        throw httpError(400, 'BadRequest', 'Received and rejected quantities cannot be negative');
      }

      const remainingQty =
        poLine.orderedQty - (poLine.receivedQty + poLine.rejectedQty + poLine.cancelledQty);

      if (receivedQty + rejectedQty > remainingQty) {
        throw httpError(
          400,
          'BadRequest',
          `Received + rejected quantity exceeds remaining quantity for line ${poLine.id}`
        );
      }

      if (receivedQty === 0 && rejectedQty === 0) continue;

      updates.push({
        id: poLine.id,
        receivedQty,
        rejectedQty,
        batchNumber: line.batchNumber ?? null,
        serialNumber: line.serialNumber ?? null,
        expirationDate: line.expirationDate ?? null,
      });
    }

    if (updates.length === 0) {
      throw httpError(
        400,
        'BadRequest',
        'At least one line must have non-zero received or rejected quantity'
      );
    }

    await tx
      .update(goodsreceipts)
      .set({ note: data.note ?? null })
      .where(eq(goodsreceipts.id, id));
    await tx.delete(goodsreceiptlines).where(eq(goodsreceiptlines.goodsReceiptId, id));

    await tx.insert(goodsreceiptlines).values(
      updates.map((u) => ({
        goodsReceiptId: id,
        purchaseOrderLineId: u.id,
        productVariantId: lineMap.get(u.id)!.productVariantId,
        receivedQty: u.receivedQty,
        rejectedQty: u.rejectedQty,
        batchNumber: u.batchNumber,
        serialNumber: u.serialNumber,
        expirationDate: u.expirationDate ? new Date(u.expirationDate) : null,
      }))
    );
  });

  return getGoodsReceipt(id);
}

export async function postGoodsReceipt(id: number, userId: number) {
  await db.transaction(async (tx) => {
    const [grnRow] = await tx
      .select({
        id: goodsreceipts.id,
        purchaseOrderId: goodsreceipts.purchaseOrderId,
        status: goodsreceipts.status,
      })
      .from(goodsreceipts)
      .where(eq(goodsreceipts.id, id))
      .limit(1);

    if (!grnRow) {
      throw httpError(404, 'NotFound', 'Goods receipt not found');
    }
    if (grnRow.status !== 'draft') {
      throw httpError(400, 'BadRequest', 'Only draft goods receipts can be posted');
    }

    const [poRow] = await tx
      .select({
        id: purchaseorders.id,
        status: purchaseorders.status,
        stockLocationId: purchaseorders.stockLocationId,
      })
      .from(purchaseorders)
      .where(eq(purchaseorders.id, Number(grnRow.purchaseOrderId)))
      .limit(1);
    if (!poRow) {
      throw httpError(404, 'NotFound', 'Purchase order not found');
    }

    const poStatus = String(poRow.status);
    const stockLocationId = Number(poRow.stockLocationId);
    if (poStatus !== 'approved' && poStatus !== 'partially_received') {
      throw httpError(
        400,
        'BadRequest',
        'Only approved or partially received purchase orders can be posted to stock'
      );
    }

    const poLineRows = await tx
      .select({
        id: purchaseorderlines.id,
        productVariantId: purchaseorderlines.productVariantId,
        orderedQty: purchaseorderlines.orderedQty,
        receivedQty: purchaseorderlines.receivedQty,
        rejectedQty: purchaseorderlines.rejectedQty,
        cancelledQty: purchaseorderlines.cancelledQty,
        unitCost: purchaseorderlines.unitCost,
      })
      .from(purchaseorderlines)
      .where(eq(purchaseorderlines.purchaseOrderId, Number(grnRow.purchaseOrderId)));

    if (poLineRows.length === 0) {
      throw httpError(400, 'BadRequest', 'Purchase order has no lines');
    }

    const lineMap = new Map<
      number,
      {
        id: number;
        productVariantId: number;
        orderedQty: number;
        receivedQty: number;
        rejectedQty: number;
        cancelledQty: number;
        unitCost: number;
      }
    >();
    for (const row of poLineRows) {
      lineMap.set(Number(row.id), {
        id: Number(row.id),
        productVariantId: Number(row.productVariantId),
        orderedQty: Number(row.orderedQty),
        receivedQty: Number(row.receivedQty),
        rejectedQty: Number(row.rejectedQty),
        cancelledQty: Number(row.cancelledQty),
        unitCost: Number(row.unitCost),
      });
    }

    const grnLineRows = await tx
      .select()
      .from(goodsreceiptlines)
      .where(eq(goodsreceiptlines.goodsReceiptId, id))
      .orderBy(asc(goodsreceiptlines.id));

    if (grnLineRows.length === 0) {
      throw httpError(400, 'BadRequest', 'Goods receipt has no lines');
    }

    const updates: Array<{ id: number; receivedQtyDelta: number; rejectedQtyDelta: number }> = [];

    for (const row of grnLineRows) {
      const poLineId = Number(row.purchaseOrderLineId);
      const poLine = lineMap.get(poLineId);
      if (!poLine) {
        throw httpError(
          400,
          'BadRequest',
          `Goods receipt line references purchase order line ${poLineId} which does not belong to this purchase order`
        );
      }

      const receivedQty = Number(row.receivedQty);
      const rejectedQty = Number(row.rejectedQty);

      const remainingQty =
        poLine.orderedQty - (poLine.receivedQty + poLine.rejectedQty + poLine.cancelledQty);

      if (receivedQty + rejectedQty > remainingQty) {
        throw httpError(
          400,
          'BadRequest',
          `Received + rejected quantity exceeds remaining quantity for line ${poLine.id}`
        );
      }

      if (receivedQty === 0 && rejectedQty === 0) continue;

      updates.push({
        id: poLine.id,
        receivedQtyDelta: receivedQty,
        rejectedQtyDelta: rejectedQty,
      });
    }

    if (updates.length === 0) {
      throw httpError(
        400,
        'BadRequest',
        'At least one line must have non-zero received or rejected quantity'
      );
    }

    for (const u of updates) {
      await tx
        .update(purchaseorderlines)
        .set({
          receivedQty: sql`${purchaseorderlines.receivedQty} + ${u.receivedQtyDelta}`,
          rejectedQty: sql`${purchaseorderlines.rejectedQty} + ${u.rejectedQtyDelta}`,
        })
        .where(eq(purchaseorderlines.id, u.id));
    }

    let allFullyReceived = true;
    for (const poLine of lineMap.values()) {
      const delta = updates.find((u) => u.id === poLine.id);
      const receivedQty = poLine.receivedQty + (delta?.receivedQtyDelta ?? 0);
      const rejectedQty = poLine.rejectedQty + (delta?.rejectedQtyDelta ?? 0);
      const remainingQty = poLine.orderedQty - (receivedQty + rejectedQty + poLine.cancelledQty);
      if (remainingQty > 0) {
        allFullyReceived = false;
        break;
      }
    }

    const newStatus = allFullyReceived ? 'fully_received' : 'partially_received';
    await tx
      .update(purchaseorders)
      .set({ status: newStatus })
      .where(eq(purchaseorders.id, Number(grnRow.purchaseOrderId)));

    const stockLines = updates.map((u) => {
      const poLine = lineMap.get(u.id)!;
      return {
        productVariantId: poLine.productVariantId,
        receivedQty: u.receivedQtyDelta,
        totalProcessedQty: u.receivedQtyDelta + u.rejectedQtyDelta,
      };
    });

    const costUpdates = updates.map((u) => {
      const poLine = lineMap.get(u.id)!;
      return {
        productVariantId: poLine.productVariantId,
        quantity: u.receivedQtyDelta,
        unitCost: poLine.unitCost,
      };
    });

    await updateProductCosts(tx, costUpdates);

    await applyStockMovementsForReceipt(
      tx,
      stockLocationId,
      stockLines,
      userId,
      'goodsReceipt',
      id
    );

    await tx
      .update(goodsreceipts)
      .set({ status: 'posted', postedByUserId: userId, postedAt: new Date() })
      .where(eq(goodsreceipts.id, id));
  });

  return getGoodsReceipt(id);
}
