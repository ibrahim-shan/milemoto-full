import type { Grade } from '@milemoto/types';

export function formatGradeRow(row: Grade): Grade {
  return {
    id: Number(row.id),
    name: row.name,
    slug: row.slug,
    description: row.description ?? null,
    status: row.status,
    createdAt: row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt : new Date(row.updatedAt),
  };
}
