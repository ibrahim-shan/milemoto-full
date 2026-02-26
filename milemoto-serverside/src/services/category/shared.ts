import { eq } from 'drizzle-orm';
import { categories } from '@milemoto/types';
import type { Category, CategoryResponse } from '@milemoto/types';
import { db } from '../../db/drizzle.js';

export function toCategoryResponse(row: Category): CategoryResponse {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    imageUrl: row.imageUrl ?? null,
    parentId: row.parentId,
    status: row.status,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
  };
}

export async function isDescendant(
  categoryId: number,
  potentialParentId: number
): Promise<boolean> {
  let currentId: number | null = potentialParentId;

  while (currentId !== null) {
    if (currentId === categoryId) {
      return true;
    }

    const [row] = await db
      .select({ parentId: categories.parentId })
      .from(categories)
      .where(eq(categories.id, currentId))
      .limit(1);

    if (!row) break;

    currentId = row.parentId ?? null;
  }

  return false;
}
