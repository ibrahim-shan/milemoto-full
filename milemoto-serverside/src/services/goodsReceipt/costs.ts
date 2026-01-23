import { eq, sql } from 'drizzle-orm';
import { productvariants, stocklevels } from '@milemoto/types';
import { db } from '../../db/drizzle.js';

export async function updateProductCosts(
  tx: typeof db,
  updates: Array<{ productVariantId: number; quantity: number; unitCost: number }>
) {
  const variantMap = new Map<number, { quantity: number; totalValue: number }>();

  for (const u of updates) {
    if (u.quantity <= 0) continue;
    const current = variantMap.get(u.productVariantId) || { quantity: 0, totalValue: 0 };
    current.quantity += u.quantity;
    current.totalValue += u.quantity * u.unitCost;
    variantMap.set(u.productVariantId, current);
  }

  for (const [variantId, incoming] of variantMap.entries()) {
    const totalOnHandRows = await tx
      .select({ totalOnHand: sql<number>`COALESCE(SUM(${stocklevels.onHand}), 0)` })
      .from(stocklevels)
      .where(eq(stocklevels.productVariantId, variantId));
    const totalOnHand = Number(totalOnHandRows[0]?.totalOnHand ?? 0);

    const [variantRow] = await tx
      .select({ costPrice: productvariants.costPrice })
      .from(productvariants)
      .where(eq(productvariants.id, variantId))
      .limit(1);

    const currentQty = totalOnHand;
    const currentCost =
      variantRow?.costPrice !== null && variantRow?.costPrice !== undefined
        ? Number(variantRow.costPrice)
        : 0;

    const currentTotalValue = currentQty * currentCost;
    const newTotalValue = currentTotalValue + incoming.totalValue;
    const newTotalQty = currentQty + incoming.quantity;
    if (newTotalQty <= 0) continue;

    const newCost = newTotalValue / newTotalQty;
    await tx
      .update(productvariants)
      .set({ costPrice: Number(newCost.toFixed(2)) })
      .where(eq(productvariants.id, variantId));
  }
}
