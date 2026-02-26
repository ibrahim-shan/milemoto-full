import { and, eq, or, sql } from 'drizzle-orm';
import { categories, products } from '@milemoto/types';
import type { CreateCategoryDto, UpdateCategoryDto } from '@milemoto/types';
import { db } from '../../db/drizzle.js';
import { httpError } from '../../utils/error.js';
import { buildDeleteResponse } from '../../utils/response.js';
import { isDuplicateEntryError } from '../../utils/dbErrors.js';
import { getCategory } from './read.js';
import { isDescendant, toCategoryResponse } from './shared.js';

export async function createCategory(data: CreateCategoryDto) {
  const normalizedName = data.name.trim().toLowerCase();
  const normalizedSlug = data.slug.trim().toLowerCase();

  const [existing] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(
      and(eq(categories.name, data.name), sql`${categories.parentId} <=> ${data.parentId ?? null}`)
    )
    .limit(1);
  if (existing) {
    throw httpError(409, 'Conflict', 'A category with this name already exists in the same parent');
  }

  const [existingSlug] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.slug, data.slug))
    .limit(1);
  if (existingSlug) {
    throw httpError(409, 'Conflict', 'A category with this slug already exists');
  }

  if (data.parentId) {
    const [parent] = await db
      .select({ id: categories.id, name: categories.name, slug: categories.slug })
      .from(categories)
      .where(eq(categories.id, data.parentId))
      .limit(1);
    if (!parent) {
      throw httpError(404, 'NotFound', 'Parent category not found');
    }
    const parentName = (parent.name ?? '').trim().toLowerCase();
    const parentSlug = (parent.slug ?? '').trim().toLowerCase();
    if (parentName === normalizedName) {
      throw httpError(409, 'Conflict', 'Subcategory name cannot match the parent name');
    }
    if (parentSlug === normalizedSlug) {
      throw httpError(409, 'Conflict', 'Subcategory slug cannot match the parent slug');
    }
    if (data.imageUrl != null) {
      throw httpError(400, 'BadRequest', 'Subcategories cannot have an image');
    }
  }

  try {
    const result = await db.insert(categories).values({
      name: data.name,
      slug: data.slug,
      description: data.description ?? null,
      imageUrl: data.imageUrl ?? null,
      parentId: data.parentId ?? null,
      status: data.status ?? 'active',
    });

    const insertId =
      'insertId' in result
        ? Number((result as unknown as { insertId: number }).insertId)
        : undefined;
    if (insertId) {
      return await getCategory(insertId);
    }

    const [created] = await db
      .select()
      .from(categories)
      .where(eq(categories.slug, data.slug))
      .limit(1);
    if (created) return toCategoryResponse(created);

    throw httpError(500, 'InsertFailed', 'Failed to create category');
  } catch (err) {
    if (isDuplicateEntryError(err)) {
      throw httpError(409, 'DuplicateCategory', 'Category already exists');
    }
    throw err;
  }
}

export async function updateCategory(id: number, data: UpdateCategoryDto) {
  try {
    const category = await getCategory(id);

    if (
      data.parentId !== undefined &&
      data.parentId !== null &&
      data.parentId !== category.parentId
    ) {
      const [child] = await db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.parentId, id))
        .limit(1);
      if (child) {
        throw httpError(
          400,
          'BadRequest',
          'Cannot assign a parent to a category that has subcategories. Please remove or reassign the subcategories first.'
        );
      }
    }

    if (data.parentId !== undefined) {
      if (data.parentId === id) {
        throw httpError(400, 'BadRequest', 'A category cannot be its own parent');
      }
      if (data.parentId !== null) {
        const circular = await isDescendant(id, data.parentId);
        if (circular) {
          throw httpError(400, 'BadRequest', 'Circular reference detected: cannot set this parent');
        }
      }
    }

    const parentIdToUse = data.parentId !== undefined ? data.parentId : category.parentId;
    const nameToUse = data.name !== undefined ? data.name : category.name;
    const slugToUse = data.slug !== undefined ? data.slug : category.slug;
    const normalizedName = nameToUse.trim().toLowerCase();
    const normalizedSlug = slugToUse.trim().toLowerCase();

    const [existing] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(
          eq(categories.name, nameToUse),
          sql`${categories.parentId} <=> ${parentIdToUse ?? null}`,
          sql`${categories.id} != ${id}`
        )
      )
      .limit(1);
    if (existing) {
      throw httpError(
        409,
        'Conflict',
        'A category with this name already exists in the same parent'
      );
    }

    const [existingSlug] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.slug, slugToUse), sql`${categories.id} != ${id}`))
      .limit(1);
    if (existingSlug) {
      throw httpError(409, 'Conflict', 'A category with this slug already exists');
    }

    if (parentIdToUse) {
      const [parentRow] = await db
        .select({ id: categories.id, name: categories.name, slug: categories.slug })
        .from(categories)
        .where(eq(categories.id, parentIdToUse))
        .limit(1);
      if (!parentRow) {
        throw httpError(404, 'NotFound', 'Parent category not found');
      }
      const parentName = (parentRow.name ?? '').trim().toLowerCase();
      const parentSlug = (parentRow.slug ?? '').trim().toLowerCase();
      if (parentName === normalizedName) {
        throw httpError(409, 'Conflict', 'Subcategory name cannot match the parent name');
      }
      if (parentSlug === normalizedSlug) {
        throw httpError(409, 'Conflict', 'Subcategory slug cannot match the parent slug');
      }
      if (data.imageUrl !== undefined && data.imageUrl !== null) {
        throw httpError(400, 'BadRequest', 'Subcategories cannot have an image');
      }
    }

    const updates: Partial<CreateCategoryDto> = {};

    if (data.name !== undefined) updates.name = data.name;
    if (data.slug !== undefined) updates.slug = data.slug;
    if (data.description !== undefined) updates.description = data.description ?? null;
    if (data.imageUrl !== undefined && parentIdToUse === null)
      updates.imageUrl = data.imageUrl ?? null;
    if (data.parentId !== undefined) updates.parentId = data.parentId;
    if (data.status !== undefined) updates.status = data.status;

    // If a root category is converted into a subcategory, clear the root-only image automatically.
    if (data.parentId !== undefined && parentIdToUse !== null && category.imageUrl) {
      updates.imageUrl = null;
    }

    if (Object.keys(updates).length === 0) return category;

    await db.update(categories).set(updates).where(eq(categories.id, id));

    return await getCategory(id);
  } catch (err) {
    if (isDuplicateEntryError(err)) {
      throw httpError(409, 'DuplicateCategory', 'Category already exists');
    }
    throw err;
  }
}

export async function deleteCategory(id: number) {
  const [child] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.parentId, id))
    .limit(1);

  if (child) {
    throw httpError(
      400,
      'BadRequest',
      'Cannot delete category with subcategories. Delete subcategories first.'
    );
  }

  const [usage] = await db
    .select({ id: products.id })
    .from(products)
    .where(or(eq(products.categoryId, id), eq(products.subCategoryId, id)))
    .limit(1);
  if (usage) {
    throw httpError(400, 'BadRequest', 'Cannot delete category linked to existing products');
  }

  const result = await db.delete(categories).where(eq(categories.id, id));
  const affected =
    'affectedRows' in result ? (result as unknown as { affectedRows: number }).affectedRows : 0;
  if (!affected) {
    const [exists] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.id, id))
      .limit(1);
    if (!exists) {
      return buildDeleteResponse();
    }
    throw httpError(404, 'NotFound', 'Category not found');
  }
  return buildDeleteResponse();
}
