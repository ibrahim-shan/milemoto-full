import type { StockLocation } from '@milemoto/types';

export function formatStockLocation(row: StockLocation): StockLocation {
  return {
    id: Number(row.id),
    name: row.name,
    type: row.type,
    description: row.description ?? null,
    address: row.address ?? null,
    city: row.city ?? null,
    state: row.state ?? null,
    postalCode: row.postalCode ?? null,
    country: row.country ?? null,
    status: row.status,
    createdAt: row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt : new Date(row.updatedAt),
  };
}
