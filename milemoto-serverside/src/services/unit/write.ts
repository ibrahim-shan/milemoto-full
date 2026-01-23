import { eq, inArray } from 'drizzle-orm';
import { productspecifications, unitfields, unitgroups, unitvalues } from '@milemoto/types';
import type { CreateUnitGroupDto, UpdateUnitGroupDto } from '@milemoto/types';
import { db } from '../../db/drizzle.js';
import { isDuplicateEntryError } from '../../utils/dbErrors.js';
import { httpError } from '../../utils/error.js';
import { buildDeleteResponse } from '../../utils/response.js';
import { fetchUnitGroup } from './shared.js';

export async function createUnitGroup(data: CreateUnitGroupDto) {
  let newGroupId: number | undefined;
  try {
    await db.transaction(async (tx) => {
      const normalizedName = data.name.trim();

      const [existing] = await tx
        .select({ id: unitgroups.id })
        .from(unitgroups)
        .where(eq(unitgroups.name, normalizedName))
        .limit(1);
      if (existing) {
        throw httpError(409, 'Conflict', 'Unit group with this name already exists');
      }

      const groupResult = await tx.insert(unitgroups).values({
        name: normalizedName,
        status: data.status ?? 'active',
      });
      newGroupId =
        (groupResult as unknown as { insertId?: number }).insertId ??
        (await tx
          .select({ id: unitgroups.id })
          .from(unitgroups)
          .where(eq(unitgroups.name, normalizedName))
          .limit(1)
          .then((rows) => rows[0]?.id));

      if (!newGroupId) {
        throw httpError(500, 'InsertFailed', 'Failed to create unit group');
      }

      if (data.values && data.values.length > 0) {
        await tx.insert(unitvalues).values(
          data.values.map((v) => ({
            unitGroupId: newGroupId!,
            name: v.name,
            code: v.code,
          }))
        );
      }

      if (data.fields && data.fields.length > 0) {
        await tx.insert(unitfields).values(
          data.fields.map((f) => ({
            unitGroupId: newGroupId!,
            name: f.name,
            required: f.required,
          }))
        );
      }
    });

    if (!newGroupId) {
      throw httpError(500, 'InsertFailed', 'Failed to create unit group');
    }

    return await fetchUnitGroup(newGroupId);
  } catch (err) {
    if (isDuplicateEntryError(err)) {
      throw httpError(409, 'DuplicateUnitGroup', 'A unit group with this name already exists');
    }
    throw err;
  }
}

export async function updateUnitGroup(id: number, data: UpdateUnitGroupDto) {
  try {
    await db.transaction(async (tx) => {
      const groupUpdates: Partial<CreateUnitGroupDto> = {};
      if (data.name !== undefined) groupUpdates.name = data.name.trim();
      if (data.status !== undefined) groupUpdates.status = data.status;
      if (Object.keys(groupUpdates).length > 0) {
        await tx.update(unitgroups).set(groupUpdates).where(eq(unitgroups.id, id));
      }

      if (data.values) {
        const existingValues = await tx
          .select({ id: unitvalues.id })
          .from(unitvalues)
          .where(eq(unitvalues.unitGroupId, id));
        const existingIds = existingValues.map((v) => v.id);
        const incomingIds = data.values.map((v) => v.id).filter(Boolean) as number[];

        const toDelete = existingIds.filter((eid) => !incomingIds.includes(eid));
        if (toDelete.length > 0) {
          await tx.delete(unitvalues).where(inArray(unitvalues.id, toDelete));
        }

        for (const val of data.values) {
          if (val.id) {
            await tx
              .update(unitvalues)
              .set({ name: val.name, code: val.code })
              .where(eq(unitvalues.id, val.id));
          } else {
            await tx.insert(unitvalues).values({
              unitGroupId: id,
              name: val.name,
              code: val.code,
            });
          }
        }
      }

      if (data.fields) {
        const existingFields = await tx
          .select({ id: unitfields.id })
          .from(unitfields)
          .where(eq(unitfields.unitGroupId, id));
        const existingIds = existingFields.map((f) => f.id);
        const incomingIds = data.fields.map((f) => f.id).filter(Boolean) as number[];

        const toDelete = existingIds.filter((eid) => !incomingIds.includes(eid));
        if (toDelete.length > 0) {
          await tx.delete(unitfields).where(inArray(unitfields.id, toDelete));
        }

        for (const field of data.fields) {
          if (field.id) {
            await tx
              .update(unitfields)
              .set({ name: field.name, required: field.required })
              .where(eq(unitfields.id, field.id));
          } else {
            await tx.insert(unitfields).values({
              unitGroupId: id,
              name: field.name,
              required: field.required,
            });
          }
        }
      }

      return;
    });
    return await fetchUnitGroup(id);
  } catch (err) {
    if (isDuplicateEntryError(err)) {
      throw httpError(409, 'DuplicateUnitGroup', 'A unit group with this name already exists');
    }
    throw err;
  }
}

export async function deleteUnitGroup(id: number) {
  const [usage] = await db
    .select({ id: productspecifications.id })
    .from(productspecifications)
    .where(eq(productspecifications.unitGroupId, id))
    .limit(1);
  if (usage) {
    throw httpError(400, 'BadRequest', 'Cannot delete unit group linked to existing products');
  }

  const result = await db.delete(unitgroups).where(eq(unitgroups.id, id));
  const affected =
    'affectedRows' in result ? (result as unknown as { affectedRows: number }).affectedRows : 0;
  if (!affected) {
    const [exists] = await db
      .select({ id: unitgroups.id })
      .from(unitgroups)
      .where(eq(unitgroups.id, id))
      .limit(1);
    if (!exists) {
      return buildDeleteResponse();
    }
    throw httpError(404, 'NotFound', 'Unit group not found');
  }
  return buildDeleteResponse();
}
