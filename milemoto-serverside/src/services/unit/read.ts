import { and, eq, inArray, like, sql } from 'drizzle-orm';
import { unitfields, unitgroups, unitvalues } from '@milemoto/types';
import type { UnitField, UnitValue } from '@milemoto/types';
import type { ListQueryDto } from '../../routes/admin/helpers/unit.helpers.js';
import { db } from '../../db/drizzle.js';
import { buildPaginatedResponse } from '../../utils/response.js';
import { fetchUnitGroup, formatUnitField, formatUnitGroupRow, formatUnitValue } from './shared.js';

export async function listUnitGroups(params: ListQueryDto) {
  const { search, page, limit, status } = params;
  const offset = (page - 1) * limit;
  const filters = [
    search ? like(unitgroups.name, `%${search}%`) : undefined,
    status ? eq(unitgroups.status, status) : undefined,
  ].filter(Boolean) as NonNullable<ReturnType<typeof and>>[];

  const where = filters.length ? and(...filters) : undefined;

  const [groups, countRows] = await Promise.all([
    db.select().from(unitgroups).where(where).orderBy(unitgroups.name).limit(limit).offset(offset),
    db
      .select({ totalCount: sql<number>`count(*)` })
      .from(unitgroups)
      .where(where),
  ]);

  const totalCount = Number(countRows[0]?.totalCount ?? 0);

  const formattedGroups = groups.map(formatUnitGroupRow);
  const groupIds = formattedGroups.map((g) => g.id);
  let values: (typeof unitvalues.$inferSelect)[] = [];
  let fields: (typeof unitfields.$inferSelect)[] = [];
  if (groupIds.length > 0) {
    values = await db.select().from(unitvalues).where(inArray(unitvalues.unitGroupId, groupIds));
    fields = await db.select().from(unitfields).where(inArray(unitfields.unitGroupId, groupIds));
  }

  const valuesByGroup = new Map<number, UnitValue[]>();
  const fieldsByGroup = new Map<number, UnitField[]>();
  values.forEach((v) => {
    const groupId = Number(v.unitGroupId);
    const list = valuesByGroup.get(groupId) || [];
    list.push(formatUnitValue(v));
    valuesByGroup.set(groupId, list);
  });
  fields.forEach((f) => {
    const groupId = Number(f.unitGroupId);
    const list = fieldsByGroup.get(groupId) || [];
    list.push(formatUnitField(f));
    fieldsByGroup.set(groupId, list);
  });

  const items = formattedGroups.map((group) => ({
    ...group,
    values: valuesByGroup.get(group.id) || [],
    fields: fieldsByGroup.get(group.id) || [],
  }));

  return buildPaginatedResponse({
    items,
    totalCount,
    page,
    limit,
  });
}

export async function getUnitGroup(id: number) {
  return fetchUnitGroup(id);
}
