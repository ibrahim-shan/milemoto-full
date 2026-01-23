import { and, eq, inArray, sql } from 'drizzle-orm';
import { stocklevels } from '@milemoto/types';
import type { DbClient } from './shared.js';

export async function updateOnOrderStock(
  client: DbClient,
  stockLocationId: number,
  lines: Array<{ productVariantId: number; orderedQty: number }>,
  direction: 'increase' | 'decrease'
) {
  if (lines.length === 0) return;

  const qtyByVariant = new Map<number, number>();
  for (const line of lines) {
    const current = qtyByVariant.get(line.productVariantId) || 0;
    qtyByVariant.set(line.productVariantId, current + line.orderedQty);
  }

  const variantIds = Array.from(qtyByVariant.keys());

  const existingRows = await client
    .select({ productVariantId: stocklevels.productVariantId })
    .from(stocklevels)
    .where(
      and(
        inArray(stocklevels.productVariantId, variantIds),
        eq(stocklevels.stockLocationId, stockLocationId)
      )
    );

  const existingSet = new Set(existingRows.map((r) => Number(r.productVariantId)));

  for (const [variantId, qty] of qtyByVariant.entries()) {
    const change = direction === 'increase' ? qty : -qty;

    if (existingSet.has(variantId)) {
      await client
        .update(stocklevels)
        .set({
          onOrder: sql<number>`GREATEST(0, ${stocklevels.onOrder} + ${change})`,
        })
        .where(
          and(
            eq(stocklevels.productVariantId, variantId),
            eq(stocklevels.stockLocationId, stockLocationId)
          )
        );
    } else {
      if (direction === 'increase') {
        await client.insert(stocklevels).values({
          productVariantId: variantId,
          stockLocationId: stockLocationId,
          onHand: 0,
          allocated: 0,
          onOrder: qty,
        });
      }
    }
  }
}
