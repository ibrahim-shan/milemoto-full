import { and, eq, sql } from 'drizzle-orm';
import { products, warranties } from '@milemoto/types';
import type { CreateWarrantyDto, UpdateWarrantyDto } from '@milemoto/types';
import { isDuplicateEntryError } from '../../utils/dbErrors.js';
import { buildDeleteResponse } from '../../utils/response.js';
import { httpError } from '../../utils/error.js';
import { getWarranty } from './shared.js';
import { db } from '../../db/drizzle.js';

export async function createWarranty(data: CreateWarrantyDto) {
  try {
    const normalizedName = data.name.trim();
    const [existing] = await db
      .select({ id: warranties.id })
      .from(warranties)
      .where(eq(warranties.name, normalizedName))
      .limit(1);

    if (existing) {
      throw httpError(409, 'Conflict', 'A warranty with this name already exists');
    }

    const result = await db.insert(warranties).values({
      name: normalizedName,
      description: data.description ?? null,
      status: data.status ?? 'active',
    });

    const insertId =
      'insertId' in result
        ? Number((result as unknown as { insertId: number }).insertId)
        : undefined;
    if (insertId) return getWarranty(insertId);

    const [created] = await db
      .select({ id: warranties.id })
      .from(warranties)
      .where(eq(warranties.name, normalizedName))
      .limit(1);
    if (created) return getWarranty(created.id);

    throw httpError(500, 'InsertFailed', 'Failed to create warranty');
  } catch (err) {
    if (isDuplicateEntryError(err)) {
      throw httpError(409, 'DuplicateWarranty', 'A warranty with this name already exists');
    }
    throw err;
  }
}

export async function updateWarranty(id: number, data: UpdateWarrantyDto) {
  try {
    const warranty = await getWarranty(id);

    if (data.name && data.name !== warranty.name) {
      const [existing] = await db
        .select({ id: warranties.id })
        .from(warranties)
        .where(and(eq(warranties.name, data.name.trim()), sql`${warranties.id} != ${id}`))
        .limit(1);

      if (existing) {
        throw httpError(409, 'Conflict', 'A warranty with this name already exists');
      }
    }

    const updates: Partial<CreateWarrantyDto> = {};

    if (data.name !== undefined) {
      updates.name = data.name.trim();
    }
    if (data.description !== undefined) {
      updates.description = data.description ?? null;
    }
    if (data.status !== undefined) {
      updates.status = data.status;
    }

    if (Object.keys(updates).length === 0) return warranty;

    const result = await db.update(warranties).set(updates).where(eq(warranties.id, id));
    const affected =
      'affectedRows' in result ? (result as unknown as { affectedRows: number }).affectedRows : 0;
    if (!affected) {
      const [exists] = await db
        .select({ id: warranties.id })
        .from(warranties)
        .where(eq(warranties.id, id))
        .limit(1);
      if (!exists) {
        throw httpError(404, 'NotFound', 'Warranty not found');
      }
    }

    return getWarranty(id);
  } catch (err) {
    if (isDuplicateEntryError(err)) {
      throw httpError(409, 'DuplicateWarranty', 'A warranty with this name already exists');
    }
    throw err;
  }
}

export async function deleteWarranty(id: number) {
  const [usage] = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.warrantyId, id))
    .limit(1);
  if (usage) {
    throw httpError(400, 'BadRequest', 'Cannot delete warranty linked to existing products');
  }

  const result = await db.delete(warranties).where(eq(warranties.id, id));
  const affected =
    'affectedRows' in result ? (result as unknown as { affectedRows: number }).affectedRows : 0;
  if (!affected) {
    const [exists] = await db
      .select({ id: warranties.id })
      .from(warranties)
      .where(eq(warranties.id, id))
      .limit(1);
    if (!exists) {
      return buildDeleteResponse();
    }
    throw httpError(404, 'NotFound', 'Warranty not found');
  }
  return buildDeleteResponse();
}
