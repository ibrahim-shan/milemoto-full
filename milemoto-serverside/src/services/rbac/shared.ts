import { permissions, roles } from '@milemoto/types';
import type { PermissionResponse, RoleResponse } from '@milemoto/types';

export function mapPermission(row: typeof permissions.$inferSelect): PermissionResponse {
  const createdAt =
    row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt);
  const updatedAt =
    row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt);
  return {
    id: Number(row.id),
    slug: row.slug,
    description: row.description,
    resourceGroup: row.resourceGroup,
    createdAt,
    updatedAt,
  };
}

export function mapRole(row: typeof roles.$inferSelect): RoleResponse {
  return {
    id: Number(row.id),
    name: row.name,
    description: row.description ?? null,
    isSystem: Boolean(row.isSystem),
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
    permissions: [],
  };
}
