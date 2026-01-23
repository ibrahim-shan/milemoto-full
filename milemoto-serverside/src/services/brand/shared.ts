import type { Brand, BrandResponse } from '@milemoto/types';

export function toBrandResponse(row: Brand): BrandResponse {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? null,
    status: row.status,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
  };
}
