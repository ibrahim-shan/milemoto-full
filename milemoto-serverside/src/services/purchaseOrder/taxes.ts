import { inArray } from 'drizzle-orm';
import { taxes } from '@milemoto/types';
import type { DbClient } from './shared.js';

export async function loadTaxRates(
  client: DbClient,
  taxIds: number[]
): Promise<Map<number, { rate: number; type: 'percentage' | 'fixed' }>> {
  const map = new Map<number, { rate: number; type: 'percentage' | 'fixed' }>();
  if (taxIds.length === 0) return map;

  const uniqueIds = Array.from(new Set(taxIds));
  const rows = await client
    .select({ id: taxes.id, rate: taxes.rate, type: taxes.type })
    .from(taxes)
    .where(inArray(taxes.id, uniqueIds));

  for (const row of rows) {
    map.set(Number(row.id), {
      rate: Number(row.rate),
      type: row.type as 'percentage' | 'fixed',
    });
  }
  return map;
}

export function computeLineAmounts(
  line: { orderedQty: number; unitCost: number; taxId?: number },
  taxMap: Map<number, { rate: number; type: 'percentage' | 'fixed' }>
) {
  const lineSubtotal = line.orderedQty * line.unitCost;

  let lineTax = 0;
  if (line.taxId) {
    const tax = taxMap.get(line.taxId);
    if (tax) {
      if (tax.type === 'percentage') {
        lineTax = (lineSubtotal * tax.rate) / 100;
      } else {
        lineTax = tax.rate * line.orderedQty;
      }
    }
  }

  const lineTotal = lineSubtotal + lineTax;
  return { lineSubtotal, lineTax, lineTotal };
}

export function computeHeaderTotals(
  totals: { subtotal: number; taxTotal: number },
  discountType?: 'fixed' | 'percentage',
  discountValue?: number,
  shippingCost?: number
) {
  const subtotal = totals.subtotal;
  const taxTotal = totals.taxTotal;
  const shipping = typeof shippingCost === 'number' ? shippingCost : 0;

  let discountAmount = 0;
  if (discountType && typeof discountValue === 'number') {
    if (discountType === 'fixed') {
      discountAmount = discountValue;
    } else {
      discountAmount = (subtotal * discountValue) / 100;
    }
  }

  const total = subtotal - discountAmount + shipping + taxTotal;
  return { subtotal, discountAmount, taxTotal, total };
}
