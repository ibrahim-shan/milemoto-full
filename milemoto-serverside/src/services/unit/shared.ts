import { eq } from 'drizzle-orm';
import { unitfields, unitgroups, unitvalues } from '@milemoto/types';
import type { UnitField, UnitGroupResponse, UnitValue } from '@milemoto/types';
import { db } from '../../db/drizzle.js';
import { httpError } from '../../utils/error.js';

export function formatUnitGroupRow(row: typeof unitgroups.$inferSelect): UnitGroupResponse {
  return {
    id: Number(row.id),
    name: row.name,
    status: row.status,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
    values: [],
    fields: [],
  };
}

export function formatUnitValue(row: typeof unitvalues.$inferSelect): UnitValue {
  return {
    id: Number(row.id),
    unitGroupId: Number(row.unitGroupId),
    name: row.name,
    code: row.code,
  };
}

export function formatUnitField(row: typeof unitfields.$inferSelect): UnitField {
  return {
    id: Number(row.id),
    unitGroupId: Number(row.unitGroupId),
    name: row.name,
    required: Boolean(row.required),
  };
}

export async function fetchUnitGroup(id: number): Promise<UnitGroupResponse> {
  const groupRows = await db.select().from(unitgroups).where(eq(unitgroups.id, id)).limit(1);
  if (!groupRows[0]) {
    throw httpError(404, 'NotFound', 'Unit group not found');
  }
  const group = formatUnitGroupRow(groupRows[0]);

  const values = await db.select().from(unitvalues).where(eq(unitvalues.unitGroupId, id));
  const fields = await db.select().from(unitfields).where(eq(unitfields.unitGroupId, id));

  return {
    ...group,
    values: values.map(formatUnitValue),
    fields: fields.map(formatUnitField),
  };
}
