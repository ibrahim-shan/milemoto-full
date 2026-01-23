import { vendors } from '@milemoto/types';
import type { Vendor } from '@milemoto/types';

export function formatVendor(row: typeof vendors.$inferSelect): Vendor {
  return {
    id: Number(row.id),
    name: row.name,
    description: row.description ?? null,
    country: row.country,
    address: row.address ?? null,
    phoneNumber: row.phoneNumber ?? null,
    phoneCode: row.phoneCode ?? null,
    email: row.email ?? null,
    website: row.website ?? null,
    status: row.status,
    createdAt: row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt : new Date(row.updatedAt),
  };
}
