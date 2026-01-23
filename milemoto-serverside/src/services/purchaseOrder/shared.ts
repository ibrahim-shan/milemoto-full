import type { db } from '../../db/drizzle.js';
import { httpError } from '../../utils/error.js';

export type DbClient = typeof db;

export function parseDateOnly(value: string | null | undefined): Date | null {
  if (!value) return null;
  return new Date(value);
}

export function validateDiscount(discountType?: 'fixed' | 'percentage', discountValue?: number) {
  if (discountType === 'percentage' && typeof discountValue === 'number') {
    if (discountValue < 0 || discountValue > 100) {
      throw httpError(400, 'BadRequest', 'Percentage discount value must be between 0 and 100');
    }
  }
}
