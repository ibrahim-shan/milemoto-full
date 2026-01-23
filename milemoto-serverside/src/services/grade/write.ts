import { eq } from 'drizzle-orm';
import { grades, products } from '@milemoto/types';
import type { CreateGrade, UpdateGrade } from '@milemoto/types';
import { db } from '../../db/drizzle.js';
import { httpError } from '../../utils/error.js';
import { buildDeleteResponse } from '../../utils/response.js';
import { isDuplicateEntryError } from '../../utils/dbErrors.js';
import { getGrade } from './read.js';
import { formatGradeRow } from './shared.js';

export async function createGrade(data: CreateGrade) {
  try {
    const result = await db.insert(grades).values({
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
      return await getGrade(insertId);
    }

    const [created] = await db.select().from(grades).where(eq(grades.slug, data.slug)).limit(1);
    if (created) return formatGradeRow(created);

    throw httpError(500, 'InsertFailed', 'Failed to create grade');
  } catch (err) {
    if (isDuplicateEntryError(err)) {
      throw httpError(409, 'DuplicateGrade', 'Grade name or slug already exists.');
    }
    throw err;
  }
}

export async function updateGrade(id: number, data: UpdateGrade) {
  const updates: Partial<CreateGrade> = {};
  if (data.name !== undefined) updates.name = data.name;
  if (data.slug !== undefined) updates.slug = data.slug;
  if (data.description !== undefined) updates.description = data.description ?? null;
  if (data.status !== undefined) updates.status = data.status;

  if (Object.keys(updates).length === 0) {
    return getGrade(id);
  }

  try {
    const result = await db.update(grades).set(updates).where(eq(grades.id, id));
    const affected =
      'affectedRows' in result ? (result as unknown as { affectedRows: number }).affectedRows : 0;
    if (!affected) {
      const [exists] = await db
        .select({ id: grades.id })
        .from(grades)
        .where(eq(grades.id, id))
        .limit(1);
      if (!exists) throw httpError(404, 'NotFound', 'Grade not found');
    }

    return await getGrade(id);
  } catch (err) {
    if (isDuplicateEntryError(err)) {
      throw httpError(409, 'DuplicateGrade', 'Grade name or slug already exists.');
    }
    throw err;
  }
}

export async function deleteGrade(id: number) {
  const [usage] = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.gradeId, id))
    .limit(1);
  if (usage) {
    throw httpError(400, 'BadRequest', 'Cannot delete grade linked to existing products');
  }

  const result = await db.delete(grades).where(eq(grades.id, id));
  const affected =
    'affectedRows' in result ? (result as unknown as { affectedRows: number }).affectedRows : 0;
  if (!affected) {
    const [exists] = await db
      .select({ id: grades.id })
      .from(grades)
      .where(eq(grades.id, id))
      .limit(1);
    if (!exists) return buildDeleteResponse();
    throw httpError(404, 'NotFound', 'Grade not found');
  }
  return buildDeleteResponse();
}
