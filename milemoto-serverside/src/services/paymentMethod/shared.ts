import type { PaymentMethod } from '@milemoto/types';

export function formatPaymentMethodRow(row: PaymentMethod): PaymentMethod {
  return {
    id: Number(row.id),
    name: row.name,
    status: row.status,
    createdAt: row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt : new Date(row.updatedAt),
  };
}
