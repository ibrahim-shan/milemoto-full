import { and, eq, inArray, or, sql } from 'drizzle-orm';
import { productvariantattributes, variants, variantvalues } from '@milemoto/types';
import type { CreateVariant, UpdateVariant } from '@milemoto/types';
import { db } from '../../db/drizzle.js';
import { httpError } from '../../utils/error.js';
import { buildDeleteResponse } from '../../utils/response.js';
import { isDuplicateEntryError } from '../../utils/dbErrors.js';
import { refreshProductVariantsForVariantValue } from '../product.service.js';
import { syncAutomaticCollectionsForVariantValue } from '../collection.service.js';
import { assertUniqueValues, mapVariantValue } from './shared.js';
import { getVariant } from './read.js';

export async function createVariant(data: CreateVariant) {
  const [dup] = await db
    .select({ id: variants.id })
    .from(variants)
    .where(or(eq(variants.name, data.name), eq(variants.slug, data.slug)))
    .limit(1);
  if (dup) {
    throw httpError(409, 'Conflict', 'A variant with this name or slug already exists');
  }

  assertUniqueValues(data.values);

  const variantId = await db.transaction(async (tx) => {
    const inserted = await tx
      .insert(variants)
      .values({
        name: data.name,
        slug: data.slug,
        status: data.status ?? 'active',
      })
      .$returningId();

    const variantId = inserted[0]?.id ? Number(inserted[0].id) : undefined;
    if (!variantId) {
      throw httpError(500, 'InsertFailed', 'Failed to create variant');
    }

    if (data.values.length > 0) {
      const values: (typeof variantvalues.$inferInsert)[] = data.values.map((v) => ({
        variantId,
        value: v.value,
        slug: v.slug,
        status: v.status ?? 'active',
      }));
      await tx.insert(variantvalues).values(values);
    }

    return variantId;
  });

  return getVariant(variantId);
}

export async function updateVariant(id: number, data: UpdateVariant) {
  const variant = await getVariant(id);

  if ((data.name && data.name !== variant.name) || (data.slug && data.slug !== variant.slug)) {
    const nameToUse = data.name ?? variant.name;
    const slugToUse = data.slug ?? variant.slug;
    const [existing] = await db
      .select({ id: variants.id })
      .from(variants)
      .where(
        and(
          or(eq(variants.name, nameToUse), eq(variants.slug, slugToUse)),
          sql`${variants.id} != ${id}`
        )
      )
      .limit(1);
    if (existing) {
      throw httpError(409, 'Conflict', 'A variant with this name or slug already exists');
    }
  }

  if (data.values) {
    assertUniqueValues(data.values);
  }

  const touchedVariantValueIds = new Set<number>();

  await db
    .transaction(async (tx) => {
      const updates: Partial<typeof variants.$inferInsert> = {};
      if (data.name !== undefined) updates.name = data.name;
      if (data.slug !== undefined) updates.slug = data.slug;
      if (data.status !== undefined) updates.status = data.status;

      if (Object.keys(updates).length > 0) {
        await tx.update(variants).set(updates).where(eq(variants.id, id));
      }

      if (data.values) {
        const existingRows = await tx
          .select({ id: variantvalues.id })
          .from(variantvalues)
          .where(eq(variantvalues.variantId, id));
        const existingIds = existingRows.map((r) => Number(r.id));
        const incomingIds = data.values.filter((v) => v.id).map((v) => Number(v.id));

        const toDelete = existingIds.filter((eid) => !incomingIds.includes(eid));
        if (toDelete.length > 0) {
          const [linked] = await tx
            .select({ id: productvariantattributes.id })
            .from(productvariantattributes)
            .where(inArray(productvariantattributes.variantValueId, toDelete))
            .limit(1);
          if (linked) {
            throw httpError(
              400,
              'BadRequest',
              'Cannot remove variant values linked to existing products'
            );
          }
          await tx.delete(variantvalues).where(inArray(variantvalues.id, toDelete));
        }

        for (const val of data.values) {
          if (val.id) {
            await tx
              .update(variantvalues)
              .set({
                value: val.value,
                slug: val.slug,
                status: val.status ?? 'active',
              })
              .where(and(eq(variantvalues.id, val.id), eq(variantvalues.variantId, id)));
            touchedVariantValueIds.add(Number(val.id));
          } else {
            const newVal: typeof variantvalues.$inferInsert = {
              variantId: id,
              value: val.value ?? '',
              slug: val.slug ?? '',
              status: val.status ?? 'active',
            };
            const res = await tx.insert(variantvalues).values(newVal).$returningId();
            const newId = res[0]?.id ? Number(res[0].id) : null;
            if (newId) touchedVariantValueIds.add(newId);
          }
        }
      }
    })
    .catch((err) => {
      if (isDuplicateEntryError(err)) {
        throw httpError(409, 'DuplicateVariant', 'Variant or variant values already exist');
      }
      throw err;
    });

  for (const valueId of touchedVariantValueIds) {
    await refreshProductVariantsForVariantValue(valueId);
    await syncAutomaticCollectionsForVariantValue(valueId);
  }

  return getVariant(id);
}

export async function deleteVariant(id: number) {
  const [usage] = await db
    .select({ id: productvariantattributes.id })
    .from(productvariantattributes)
    .innerJoin(variantvalues, eq(variantvalues.id, productvariantattributes.variantValueId))
    .where(eq(variantvalues.variantId, id))
    .limit(1);
  if (usage) {
    throw httpError(400, 'BadRequest', 'Cannot delete variant linked to existing products');
  }

  const result = await db.delete(variants).where(eq(variants.id, id));
  const affected =
    'affectedRows' in result ? (result as unknown as { affectedRows: number }).affectedRows : 0;
  if (!affected) {
    const [exists] = await db.select({ id: variants.id }).from(variants).where(eq(variants.id, id));
    if (!exists) {
      return buildDeleteResponse();
    }
    throw httpError(404, 'NotFound', 'Variant not found');
  }
  return buildDeleteResponse();
}

export async function addVariantValue(
  variantId: number,
  data: { value: string; slug: string; status?: 'active' | 'inactive' }
) {
  await getVariant(variantId);

  const [existing] = await db
    .select({ id: variantvalues.id })
    .from(variantvalues)
    .where(and(eq(variantvalues.variantId, variantId), eq(variantvalues.value, data.value)))
    .limit(1);
  if (existing) {
    throw httpError(409, 'Conflict', 'This value already exists for this variant');
  }

  const [existingSlug] = await db
    .select({ id: variantvalues.id })
    .from(variantvalues)
    .where(and(eq(variantvalues.variantId, variantId), eq(variantvalues.slug, data.slug)))
    .limit(1);
  if (existingSlug) {
    throw httpError(409, 'Conflict', 'This value slug already exists for this variant');
  }

  try {
    const inserted = await db
      .insert(variantvalues)
      .values({
        variantId,
        value: data.value,
        slug: data.slug,
        status: data.status ?? 'active',
      })
      .$returningId();

    const insertId = inserted[0]?.id ? Number(inserted[0].id) : undefined;

    const [row] = await db
      .select()
      .from(variantvalues)
      .where(
        insertId
          ? eq(variantvalues.id, insertId)
          : and(eq(variantvalues.variantId, variantId), eq(variantvalues.slug, data.slug))
      )
      .limit(1);

    if (row) {
      await refreshProductVariantsForVariantValue(Number(row.id));
      await syncAutomaticCollectionsForVariantValue(Number(row.id));
      return mapVariantValue(row);
    }

    return null;
  } catch (err) {
    if (isDuplicateEntryError(err)) {
      throw httpError(
        409,
        'DuplicateVariantValue',
        'This value or slug already exists for this variant'
      );
    }
    throw err;
  }
}

export async function updateVariantValue(
  id: number,
  data: {
    value?: string | undefined;
    slug?: string | undefined;
    status?: 'active' | 'inactive' | undefined;
  }
) {
  const [valueRow] = await db.select().from(variantvalues).where(eq(variantvalues.id, id)).limit(1);

  if (!valueRow) {
    throw httpError(404, 'NotFound', 'Variant value not found');
  }

  if (data.value && data.value !== valueRow.value) {
    const [existing] = await db
      .select({ id: variantvalues.id })
      .from(variantvalues)
      .where(
        and(
          eq(variantvalues.variantId, valueRow.variantId),
          eq(variantvalues.value, data.value),
          sql`${variantvalues.id} != ${id}`
        )
      )
      .limit(1);
    if (existing) {
      throw httpError(409, 'Conflict', 'This value already exists for this variant');
    }
  }

  if (data.slug && data.slug !== valueRow.slug) {
    const [existing] = await db
      .select({ id: variantvalues.id })
      .from(variantvalues)
      .where(
        and(
          eq(variantvalues.variantId, valueRow.variantId),
          eq(variantvalues.slug, data.slug),
          sql`${variantvalues.id} != ${id}`
        )
      )
      .limit(1);
    if (existing) {
      throw httpError(409, 'Conflict', 'This value slug already exists for this variant');
    }
  }

  const updates: Partial<typeof variantvalues.$inferInsert> = {};
  if (data.value !== undefined) updates.value = data.value;
  if (data.slug !== undefined) updates.slug = data.slug;
  if (data.status !== undefined) updates.status = data.status;

  if (Object.keys(updates).length === 0) {
    return mapVariantValue(valueRow);
  }

  try {
    await db.update(variantvalues).set(updates).where(eq(variantvalues.id, id));

    const [updated] = await db
      .select()
      .from(variantvalues)
      .where(eq(variantvalues.id, id))
      .limit(1);

    await refreshProductVariantsForVariantValue(id);
    await syncAutomaticCollectionsForVariantValue(id);

    return updated ? mapVariantValue(updated) : null;
  } catch (err) {
    if (isDuplicateEntryError(err)) {
      throw httpError(
        409,
        'DuplicateVariantValue',
        'This value or slug already exists for this variant'
      );
    }
    throw err;
  }
}

export async function deleteVariantValue(id: number) {
  const [row] = await db.select().from(variantvalues).where(eq(variantvalues.id, id)).limit(1);

  if (!row) {
    throw httpError(404, 'NotFound', 'Variant value not found');
  }

  const [linked] = await db
    .select({ id: productvariantattributes.id })
    .from(productvariantattributes)
    .where(eq(productvariantattributes.variantValueId, id))
    .limit(1);
  if (linked) {
    throw httpError(400, 'BadRequest', 'Cannot delete variant value linked to existing products');
  }

  const [countRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(variantvalues)
    .where(eq(variantvalues.variantId, row.variantId));

  const count = Number(countRow?.count ?? 0);
  if (count <= 1) {
    throw httpError(400, 'BadRequest', 'Cannot delete the last value of a variant');
  }

  await db.delete(variantvalues).where(eq(variantvalues.id, id));

  await syncAutomaticCollectionsForVariantValue(id);
  await refreshProductVariantsForVariantValue(id);

  return buildDeleteResponse();
}
