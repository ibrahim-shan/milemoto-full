import type { InboundShippingMethod } from '@milemoto/types';

export function formatInboundShippingMethod(row: InboundShippingMethod): InboundShippingMethod {
  return {
    id: Number(row.id),
    code: row.code,
    name: row.name,
    description: row.description ?? null,
    status: row.status,
    createdAt:
      row.createdAt instanceof Date
        ? row.createdAt
        : row.createdAt
          ? new Date(row.createdAt)
          : new Date(),
    updatedAt:
      row.updatedAt instanceof Date
        ? row.updatedAt
        : row.updatedAt
          ? new Date(row.updatedAt)
          : new Date(),
  };
}
