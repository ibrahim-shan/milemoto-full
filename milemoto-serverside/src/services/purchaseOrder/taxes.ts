import { inArray } from 'drizzle-orm';
import { taxes } from '@milemoto/types';
import type { DbClient } from './shared.js';

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export async function loadTaxRates(
  client: DbClient,
  taxIds: number[]
): Promise<Map<number, { name: string; rate: number; type: 'percentage' | 'fixed' }>> {
  const map = new Map<number, { name: string; rate: number; type: 'percentage' | 'fixed' }>();
  if (taxIds.length === 0) return map;

  const uniqueIds = Array.from(new Set(taxIds));
  const rows = await client
    .select({ id: taxes.id, name: taxes.name, rate: taxes.rate, type: taxes.type })
    .from(taxes)
    .where(inArray(taxes.id, uniqueIds));

  for (const row of rows) {
    map.set(Number(row.id), {
      name: row.name,
      rate: Number(row.rate),
      type: row.type as 'percentage' | 'fixed',
    });
  }
  return map;
}

export function computeLineAmounts(
  line: { orderedQty: number; unitCost: number; taxId?: number },
  taxMap: Map<number, { name: string; rate: number; type: 'percentage' | 'fixed' }>
) {
  const lineSubtotal = roundMoney(line.orderedQty * line.unitCost);

  let lineTax = 0;
  if (line.taxId) {
    const tax = taxMap.get(line.taxId);
    if (tax) {
      if (tax.type === 'percentage') {
        lineTax = roundMoney((lineSubtotal * tax.rate) / 100);
      } else {
        lineTax = roundMoney(tax.rate * line.orderedQty);
      }
    }
  }

  const lineTotal = roundMoney(lineSubtotal + lineTax);
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
      discountAmount = roundMoney(discountValue);
    } else {
      discountAmount = roundMoney((subtotal * discountValue) / 100);
    }
  }

  const roundedSubtotal = roundMoney(subtotal);
  const roundedTaxTotal = roundMoney(taxTotal);
  const roundedShipping = roundMoney(shipping);
  const total = roundMoney(roundedSubtotal - discountAmount + roundedShipping + roundedTaxTotal);
  return {
    subtotal: roundedSubtotal,
    discountAmount,
    taxTotal: roundedTaxTotal,
    total,
  };
}
