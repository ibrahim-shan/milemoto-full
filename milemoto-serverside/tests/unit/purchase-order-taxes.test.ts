import { describe, expect, it } from 'vitest';

import { computeHeaderTotals, computeLineAmounts } from '../../src/services/purchaseOrder/taxes.js';

describe('purchaseOrder/taxes', () => {
  describe('computeLineAmounts', () => {
    it('calculates percentage tax line amounts with 2-decimal rounding', () => {
      const taxMap = new Map([
        [1, { name: 'VAT', type: 'percentage' as const, rate: 15 }],
      ]);

      const result = computeLineAmounts(
        { orderedQty: 3, unitCost: 19.99, taxId: 1 },
        taxMap,
      );

      expect(result).toEqual({
        lineSubtotal: 59.97,
        lineTax: 9,
        lineTotal: 68.97,
      });
    });

    it('calculates fixed tax per quantity with 2-decimal rounding', () => {
      const taxMap = new Map([
        [2, { name: 'Eco Fee', type: 'fixed' as const, rate: 1.25 }],
      ]);

      const result = computeLineAmounts(
        { orderedQty: 3, unitCost: 10, taxId: 2 },
        taxMap,
      );

      expect(result).toEqual({
        lineSubtotal: 30,
        lineTax: 3.75,
        lineTotal: 33.75,
      });
    });

    it('returns zero tax when tax id is missing from map', () => {
      const result = computeLineAmounts(
        { orderedQty: 2, unitCost: 12.5, taxId: 999 },
        new Map(),
      );

      expect(result).toEqual({
        lineSubtotal: 25,
        lineTax: 0,
        lineTotal: 25,
      });
    });

    it('rounds fractional cents consistently', () => {
      const taxMap = new Map([
        [3, { name: 'Tax', type: 'percentage' as const, rate: 7.5 }],
      ]);

      const result = computeLineAmounts(
        { orderedQty: 1, unitCost: 10.335, taxId: 3 },
        taxMap,
      );

      expect(result.lineSubtotal).toBe(10.34);
      expect(result.lineTax).toBe(0.78);
      expect(result.lineTotal).toBe(11.12);
    });
  });

  describe('computeHeaderTotals', () => {
    it('computes header totals with percentage discount and shipping', () => {
      const result = computeHeaderTotals(
        { subtotal: 100, taxTotal: 15 },
        'percentage',
        10,
        5,
      );

      expect(result).toEqual({
        subtotal: 100,
        discountAmount: 10,
        taxTotal: 15,
        total: 110,
      });
    });

    it('rounds fixed discount and final total to 2 decimals', () => {
      const result = computeHeaderTotals(
        { subtotal: 100.105, taxTotal: 5.555 },
        'fixed',
        1.999,
        2.335,
      );

      expect(result).toEqual({
        subtotal: 100.11,
        discountAmount: 2,
        taxTotal: 5.56,
        total: 106.01,
      });
    });
  });
});
