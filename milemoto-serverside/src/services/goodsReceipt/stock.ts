import { and, eq, inArray, sql } from 'drizzle-orm';
import { stocklevels, stockmovements } from '@milemoto/types';
import { db } from '../../db/drizzle.js';

export async function applyStockMovementsForReceipt(
  tx: typeof db,
  stockLocationId: number,
  lines: Array<{ productVariantId: number; receivedQty: number; totalProcessedQty: number }>,
  performedByUserId: number | null,
  referenceType: string,
  referenceId: number
) {
  if (lines.length === 0) return;

  const variantIds = Array.from(new Set(lines.map((l) => l.productVariantId)));

  const existingRows = await tx
    .select({
      id: stocklevels.id,
      productVariantId: stocklevels.productVariantId,
      onHand: stocklevels.onHand,
    })
    .from(stocklevels)
    .where(
      and(
        inArray(stocklevels.productVariantId, variantIds),
        eq(stocklevels.stockLocationId, stockLocationId)
      )
    );

  const existingMap = new Map<number, { id: number; onHand: number }>();
  for (const row of existingRows) {
    existingMap.set(Number(row.productVariantId), {
      id: Number(row.id),
      onHand: Number(row.onHand),
    });
  }

  for (const line of lines) {
    const current = existingMap.get(line.productVariantId);
    if (current) {
      await tx
        .update(stocklevels)
        .set({
          onHand: sql`${stocklevels.onHand} + ${line.receivedQty}`,
          onOrder: sql`GREATEST(0, COALESCE(${stocklevels.onOrder}, 0) - ${line.totalProcessedQty})`,
        })
        .where(eq(stocklevels.id, current.id));
    } else {
      await tx.insert(stocklevels).values({
        productVariantId: line.productVariantId,
        stockLocationId,
        onHand: line.receivedQty,
        allocated: 0,
        onOrder: 0,
      });
    }

    await tx.insert(stockmovements).values({
      productVariantId: line.productVariantId,
      stockLocationId,
      performedByUserId,
      quantity: line.receivedQty,
      type: 'purchase_receipt',
      referenceType,
      referenceId,
      note: null,
    });
  }
}
