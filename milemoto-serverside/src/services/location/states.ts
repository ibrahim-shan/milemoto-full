import { and, asc, eq, inArray, like, or, sql } from 'drizzle-orm';
import type {
  CreateStateDto,
  ListQueryDto,
  UpdateStateDto,
} from '../../routes/admin/helpers/location.helpers.js';
import type { StateResponse } from '@milemoto/types';
import { cities, countries, shippingarearates, states } from '@milemoto/types';
import { db } from '../../db/drizzle.js';
import { isDuplicateEntryError, isRowIsReferencedError } from '../../utils/dbErrors.js';
import { httpError } from '../../utils/error.js';
import { buildDeleteResponse, buildPaginatedResponse } from '../../utils/response.js';
import { getAffectedRows, toIso } from './shared.js';

type StateRow = {
  id: number;
  name: string;
  status: 'active' | 'inactive';
  statusEffective: 'active' | 'inactive';
  countryId: number;
  countryName: string;
  countryStatus: 'active' | 'inactive';
  countryStatusEffective: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
};

function formatState(row: StateRow): StateResponse {
  return {
    id: Number(row.id),
    name: row.name,
    status: row.status,
    statusEffective: row.statusEffective,
    countryId: Number(row.countryId),
    countryName: row.countryName,
    countryStatus: row.countryStatus,
    countryStatusEffective: row.countryStatusEffective,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

async function fetchStateById(id: number) {
  const row = await db
    .select({
      id: states.id,
      name: states.name,
      status: states.status,
      statusEffective: states.statusEffective,
      countryId: states.countryId,
      countryName: countries.name,
      countryStatus: countries.status,
      countryStatusEffective: countries.status,
      createdAt: states.createdAt,
      updatedAt: states.updatedAt,
    })
    .from(states)
    .innerJoin(countries, eq(countries.id, states.countryId))
    .where(eq(states.id, id))
    .limit(1)
    .then((rows) => rows[0] as StateRow | undefined);

  if (!row) {
    throw httpError(404, 'NotFound', 'State not found');
  }
  return formatState(row);
}

export async function createState(data: CreateStateDto) {
  try {
    const [country] = await db
      .select({ id: countries.id, name: countries.name, status: countries.status })
      .from(countries)
      .where(eq(countries.id, data.countryId))
      .limit(1);
    if (!country) throw httpError(404, 'ParentNotFound', 'Country not found');
    if (data.status === 'active' && country.status !== 'active') {
      throw httpError(
        400,
        'ParentInactive',
        'Cannot activate state because the parent country is inactive.'
      );
    }
    const statusEffective =
      data.status === 'active' && country.status === 'active' ? 'active' : 'inactive';

    const inserted = await db
      .insert(states)
      .values({
        name: data.name,
        countryId: data.countryId,
        status: data.status,
        statusEffective,
      })
      .$returningId();

    const insertId = Number(inserted[0]?.id);
    if (!insertId) {
      throw httpError(500, 'InsertFailed', 'Failed to create state');
    }
    return fetchStateById(insertId);
  } catch (err) {
    if (isDuplicateEntryError(err)) {
      throw httpError(409, 'DuplicateState', 'State name already exists for this country.');
    }
    throw err;
  }
}

export async function listStates(params: ListQueryDto & { countryId?: number | undefined }) {
  const { search, page, limit, countryId } = params;
  const offset = (page - 1) * limit;

  const filters = [
    countryId ? eq(states.countryId, countryId) : undefined,
    search ? or(like(states.name, `%${search}%`), like(countries.name, `%${search}%`)) : undefined,
  ].filter(Boolean) as NonNullable<ReturnType<typeof and>>[];

  const where = filters.length ? and(...filters) : undefined;

  const [items, countRows] = await Promise.all([
    db
      .select({
        id: states.id,
        name: states.name,
        status: states.status,
        statusEffective: states.statusEffective,
        countryId: states.countryId,
        countryName: countries.name,
        countryStatus: countries.status,
        countryStatusEffective: countries.status,
        createdAt: states.createdAt,
        updatedAt: states.updatedAt,
      })
      .from(states)
      .innerJoin(countries, eq(countries.id, states.countryId))
      .where(where)
      .orderBy(asc(states.name))
      .limit(limit)
      .offset(offset)
      .then((rows) => rows as StateRow[]),
    db
      .select({ total: sql<number>`count(*)` })
      .from(states)
      .innerJoin(countries, eq(countries.id, states.countryId))
      .where(where),
  ]);

  const totalCount = Number(countRows[0]?.total ?? 0);
  return buildPaginatedResponse({
    items: items.map(formatState),
    totalCount,
    page,
    limit,
  });
}

export async function updateState(id: number, body: UpdateStateDto) {
  try {
    const [existing] = await db
      .select({ id: states.id, countryId: states.countryId, status: states.status })
      .from(states)
      .where(eq(states.id, id))
      .limit(1);
    if (!existing) throw httpError(404, 'NotFound', 'State not found');

    const targetCountryId = body.countryId ?? Number(existing.countryId);
    const targetStatus = body.status ?? existing.status;

    const [country] = await db
      .select({ id: countries.id, name: countries.name, status: countries.status })
      .from(countries)
      .where(eq(countries.id, targetCountryId))
      .limit(1);
    if (!country) throw httpError(404, 'ParentNotFound', 'Country not found');
    if (targetStatus === 'active' && country.status !== 'active') {
      throw httpError(
        400,
        'ParentInactive',
        'Cannot activate state because the parent country is inactive.'
      );
    }
    const stateEffective =
      targetStatus === 'active' && country.status === 'active' ? 'active' : 'inactive';

    const updates: Partial<typeof states.$inferInsert> = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.countryId !== undefined) updates.countryId = body.countryId;
    if (body.status !== undefined) updates.status = body.status;
    updates.statusEffective = stateEffective;

    const result = await db.update(states).set(updates).where(eq(states.id, id));
    getAffectedRows(result);

    if (stateEffective === 'inactive') {
      await db.update(cities).set({ statusEffective: 'inactive' }).where(eq(cities.stateId, id));
    } else {
      await db
        .update(cities)
        .set({
          statusEffective: sql<
            'active' | 'inactive'
          >`CASE WHEN ${cities.status} = 'active' THEN 'active' ELSE 'inactive' END`,
        })
        .where(eq(cities.stateId, id));
    }

    return fetchStateById(id);
  } catch (err) {
    if (isDuplicateEntryError(err)) {
      throw httpError(409, 'DuplicateState', 'State name already exists for this country.');
    }
    throw err;
  }
}

export async function deleteState(id: number) {
  try {
    const [shippingRow] = await db
      .select({ id: shippingarearates.id })
      .from(shippingarearates)
      .where(eq(shippingarearates.stateId, id))
      .limit(1);

    if (shippingRow) {
      throw httpError(
        400,
        'DeleteFailed',
        'Cannot delete state. It is being used in shipping area rates.'
      );
    }

    const result = await db.delete(states).where(eq(states.id, id));
    const affected = getAffectedRows(result);
    if (!affected) {
      const [exists] = await db
        .select({ id: states.id })
        .from(states)
        .where(eq(states.id, id))
        .limit(1);
      if (!exists) return buildDeleteResponse();
      throw httpError(404, 'NotFound', 'State not found');
    }
    return buildDeleteResponse();
  } catch (err) {
    if (isRowIsReferencedError(err)) {
      throw httpError(
        400,
        'DeleteFailed',
        'Cannot delete state. It is already linked to existing cities.'
      );
    }
    throw err;
  }
}

export async function listAllStates() {
  return db
    .select({
      id: states.id,
      name: states.name,
      countryId: states.countryId,
      status: states.status,
      statusEffective: states.statusEffective,
    })
    .from(states)
    .where(eq(states.statusEffective, 'active'))
    .orderBy(asc(states.name));
}

export async function exportStates() {
  return db
    .select({
      name: states.name,
      countryCode: countries.code,
      status: states.status,
    })
    .from(states)
    .innerJoin(countries, eq(countries.id, states.countryId))
    .orderBy(asc(states.name));
}

type StateImportRow = {
  name: string;
  countryCode: string;
  status: 'active' | 'inactive';
};

export async function importStates(rows: StateImportRow[]) {
  if (!rows.length) {
    throw httpError(400, 'EmptyFile', 'Import file is empty');
  }
  try {
    return await db.transaction(async (tx) => {
      const countryCodes = Array.from(new Set(rows.map((r) => r.countryCode))).filter(Boolean);

      const countryRows = await tx
        .select({ id: countries.id, code: countries.code, status: countries.status })
        .from(countries)
        .where(inArray(countries.code, countryCodes));

      const countryMap = new Map(
        countryRows.map((r) => [r.code, { id: Number(r.id), status: r.status }])
      );

      const values = rows.map((row) => {
        const country = countryMap.get(row.countryCode);
        if (!country) {
          throw httpError(400, 'InvalidReference', `Invalid countryCode: ${row.countryCode}`);
        }
        const statusEffective =
          row.status === 'active' && country.status === 'active' ? 'active' : 'inactive';
        return {
          name: row.name,
          countryId: country.id,
          status: row.status,
          statusEffective,
        } satisfies typeof states.$inferInsert;
      });

      const result = await tx.insert(states).values(values);
      const affected = getAffectedRows(result);
      return affected || rows.length;
    });
  } catch (err) {
    if (isDuplicateEntryError(err)) {
      throw httpError(409, 'DuplicateState', 'State name already exists for this country.');
    }
    throw err;
  }
}
