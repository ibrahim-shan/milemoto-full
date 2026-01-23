import { and, eq, sql } from 'drizzle-orm';
import { brands, products } from '@milemoto/types';
import type { CreateBrandDto, UpdateBrandDto } from '@milemoto/types';
import { db } from '../../db/drizzle.js';
import { httpError } from '../../utils/error.js';
import { buildDeleteResponse } from '../../utils/response.js';
import { isDuplicateEntryError } from '../../utils/dbErrors.js';
import { getBrand } from './read.js';
import { toBrandResponse } from './shared.js';

export async function createBrand(data: CreateBrandDto) {
  const [existingName] = await db
    .select({ id: brands.id })
    .from(brands)
    .where(eq(brands.name, data.name))
    .limit(1);
  if (existingName) {
    throw httpError(409, 'DuplicateBrand', 'Brand name already exists');
  }

  const [existingSlug] = await db
    .select({ id: brands.id })
    .from(brands)
    .where(eq(brands.slug, data.slug))
    .limit(1);
  if (existingSlug) {
    throw httpError(409, 'DuplicateBrand', 'Brand slug already exists');
  }

  try {
    const result = await db.insert(brands).values({
      name: data.name,
      slug: data.slug,
      description: data.description ?? null,
      status: data.status ?? 'active',
    });

    const insertId =
      'insertId' in result
        ? Number((result as unknown as { insertId: number }).insertId)
        : undefined;
    if (insertId) {
      return await getBrand(insertId);
    }

    const [created] = await db.select().from(brands).where(eq(brands.slug, data.slug)).limit(1);
    if (created) return toBrandResponse(created);

    throw httpError(500, 'InsertFailed', 'Failed to create brand');
  } catch (err) {
    if (isDuplicateEntryError(err)) {
      throw httpError(409, 'DuplicateBrand', 'Brand already exists');
    }
    throw err;
  }
}

export async function updateBrand(id: number, data: UpdateBrandDto) {
  const current = await getBrand(id);

  if (data.name !== undefined) {
    const [existing] = await db
      .select({ id: brands.id })
      .from(brands)
      .where(and(eq(brands.name, data.name), sql`${brands.id} != ${id}`))
      .limit(1);
    if (existing) {
      throw httpError(409, 'DuplicateBrand', 'Brand name already exists');
    }
  }

  if (data.slug !== undefined) {
    const [existing] = await db
      .select({ id: brands.id })
      .from(brands)
      .where(and(eq(brands.slug, data.slug), sql`${brands.id} != ${id}`))
      .limit(1);
    if (existing) {
      throw httpError(409, 'DuplicateBrand', 'Brand slug already exists');
    }
  }

  const updates: Partial<CreateBrandDto> = {};
  if (data.name !== undefined) updates.name = data.name;
  if (data.slug !== undefined) updates.slug = data.slug;
  if (data.description !== undefined) updates.description = data.description ?? null;
  if (data.status !== undefined) updates.status = data.status;

  if (Object.keys(updates).length === 0) return current;

  try {
    await db.update(brands).set(updates).where(eq(brands.id, id));
    return await getBrand(id);
  } catch (err) {
    if (isDuplicateEntryError(err)) {
      throw httpError(409, 'DuplicateBrand', 'Brand already exists');
    }
    throw err;
  }
}

export async function deleteBrand(id: number) {
  const [inUse] = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.brandId, id))
    .limit(1);
  if (inUse) {
    throw httpError(400, 'BadRequest', 'Cannot delete brand linked to existing products');
  }

  const result = await db.delete(brands).where(eq(brands.id, id));
  const affected =
    'affectedRows' in result ? (result as unknown as { affectedRows: number }).affectedRows : 0;
  if (!affected) {
    const [exists] = await db
      .select({ id: brands.id })
      .from(brands)
      .where(eq(brands.id, id))
      .limit(1);
    if (!exists) {
      return buildDeleteResponse();
    }
    throw httpError(404, 'NotFound', 'Brand not found');
  }

  return buildDeleteResponse();
}
