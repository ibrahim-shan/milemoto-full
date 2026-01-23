import { and, asc, eq, like, or, sql } from 'drizzle-orm';
import type {
  CreateCityDto,
  ListQueryDto,
  UpdateCityDto,
} from '../../routes/admin/helpers/location.helpers.js';
import type { CityResponse } from '@milemoto/types';
import { cities, countries, shippingarearates, states } from '@milemoto/types';
import { db } from '../../db/drizzle.js';
import { isDuplicateEntryError } from '../../utils/dbErrors.js';
import { httpError } from '../../utils/error.js';
import { buildDeleteResponse, buildPaginatedResponse } from '../../utils/response.js';
import { getAffectedRows, toIso } from './shared.js';

type CityRow = {
  id: number;
  name: string;
  status: 'active' | 'inactive';
  statusEffective: 'active' | 'inactive';
  stateId: number;
  stateName: string;
  stateStatus: 'active' | 'inactive';
  stateStatusEffective: 'active' | 'inactive';
  countryId: number;
  countryName: string;
  countryStatus: 'active' | 'inactive';
  countryStatusEffective: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
};

function formatCity(row: CityRow): CityResponse {
  return {
    id: Number(row.id),
    name: row.name,
    status: row.status,
    statusEffective: row.statusEffective,
    stateId: Number(row.stateId),
    stateName: row.stateName,
    stateStatus: row.stateStatus,
    stateStatusEffective: row.stateStatusEffective,
    countryId: Number(row.countryId),
    countryName: row.countryName,
    countryStatus: row.countryStatus,
    countryStatusEffective: row.countryStatusEffective,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

async function fetchCityById(id: number) {
  const row = await db
    .select({
      id: cities.id,
      name: cities.name,
      status: cities.status,
      statusEffective: cities.statusEffective,
      stateId: cities.stateId,
      stateName: states.name,
      stateStatus: states.status,
      stateStatusEffective: states.statusEffective,
      countryId: countries.id,
      countryName: countries.name,
      countryStatus: countries.status,
      countryStatusEffective: countries.status,
      createdAt: cities.createdAt,
      updatedAt: cities.updatedAt,
    })
    .from(cities)
    .innerJoin(states, eq(states.id, cities.stateId))
    .innerJoin(countries, eq(countries.id, states.countryId))
    .where(eq(cities.id, id))
    .limit(1)
    .then((rows) => rows[0] as CityRow | undefined);

  if (!row) {
    throw httpError(404, 'NotFound', 'City not found');
  }
  return formatCity(row);
}

export async function createCity(data: CreateCityDto) {
  try {
    const [parentState] = await db
      .select({
        id: states.id,
        name: states.name,
        status: states.status,
        statusEffective: states.statusEffective,
        countryId: countries.id,
        countryName: countries.name,
        countryStatus: countries.status,
      })
      .from(states)
      .innerJoin(countries, eq(countries.id, states.countryId))
      .where(eq(states.id, data.stateId))
      .limit(1);
    if (!parentState) throw httpError(404, 'ParentNotFound', 'State not found');
    if (
      data.status === 'active' &&
      (parentState.status !== 'active' || parentState.countryStatus !== 'active')
    ) {
      throw httpError(
        400,
        'ParentInactive',
        'Cannot activate city because the parent state or country is inactive.'
      );
    }

    const parentStateEffective =
      parentState.statusEffective ??
      (parentState.status === 'active' && parentState.countryStatus === 'active'
        ? 'active'
        : 'inactive');
    const statusEffective =
      data.status === 'active' && parentStateEffective === 'active' ? 'active' : 'inactive';

    const inserted = await db
      .insert(cities)
      .values({
        name: data.name,
        stateId: data.stateId,
        status: data.status,
        statusEffective,
      })
      .$returningId();

    const insertId = Number(inserted[0]?.id);
    if (!insertId) {
      throw httpError(500, 'InsertFailed', 'Failed to create city');
    }

    return fetchCityById(insertId);
  } catch (err) {
    if (isDuplicateEntryError(err)) {
      throw httpError(409, 'DuplicateCity', 'City name already exists for this state.');
    }
    throw err;
  }
}

export async function listAllCities(stateId?: number) {
  const filters = [
    eq(cities.statusEffective, 'active'),
    stateId ? eq(cities.stateId, stateId) : undefined,
  ].filter(Boolean) as NonNullable<ReturnType<typeof and>>[];

  const where = and(...filters);

  return db
    .select({
      id: cities.id,
      name: cities.name,
      stateId: cities.stateId,
      status: cities.status,
      statusEffective: cities.statusEffective,
    })
    .from(cities)
    .where(where)
    .orderBy(asc(cities.name));
}

export async function listCities(params: ListQueryDto & { stateId?: number | undefined }) {
  const { search, page, limit, stateId } = params;
  const offset = (page - 1) * limit;

  const filters = [
    stateId ? eq(cities.stateId, stateId) : undefined,
    search
      ? or(
          like(cities.name, `%${search}%`),
          like(states.name, `%${search}%`),
          like(countries.name, `%${search}%`)
        )
      : undefined,
  ].filter(Boolean) as NonNullable<ReturnType<typeof and>>[];

  const where = filters.length ? and(...filters) : undefined;

  const [items, countRows] = await Promise.all([
    db
      .select({
        id: cities.id,
        name: cities.name,
        status: cities.status,
        statusEffective: cities.statusEffective,
        stateId: cities.stateId,
        stateName: states.name,
        stateStatus: states.status,
        stateStatusEffective: states.statusEffective,
        countryId: countries.id,
        countryName: countries.name,
        countryStatus: countries.status,
        countryStatusEffective: countries.status,
        createdAt: cities.createdAt,
        updatedAt: cities.updatedAt,
      })
      .from(cities)
      .innerJoin(states, eq(states.id, cities.stateId))
      .innerJoin(countries, eq(countries.id, states.countryId))
      .where(where)
      .orderBy(asc(cities.name))
      .limit(limit)
      .offset(offset)
      .then((rows) => rows as CityRow[]),
    db
      .select({ total: sql<number>`count(*)` })
      .from(cities)
      .innerJoin(states, eq(states.id, cities.stateId))
      .innerJoin(countries, eq(countries.id, states.countryId))
      .where(where),
  ]);

  const totalCount = Number(countRows[0]?.total ?? 0);
  return buildPaginatedResponse({
    items: items.map(formatCity),
    totalCount,
    page,
    limit,
  });
}

export async function updateCity(id: number, body: UpdateCityDto) {
  try {
    const [existing] = await db
      .select({ id: cities.id, stateId: cities.stateId, status: cities.status })
      .from(cities)
      .where(eq(cities.id, id))
      .limit(1);
    if (!existing) throw httpError(404, 'NotFound', 'City not found');

    const targetStateId = body.stateId ?? Number(existing.stateId);
    const targetStatus = body.status ?? existing.status;

    const [parentState] = await db
      .select({
        id: states.id,
        name: states.name,
        status: states.status,
        statusEffective: states.statusEffective,
        countryId: countries.id,
        countryName: countries.name,
        countryStatus: countries.status,
      })
      .from(states)
      .innerJoin(countries, eq(countries.id, states.countryId))
      .where(eq(states.id, targetStateId))
      .limit(1);
    if (!parentState) throw httpError(404, 'ParentNotFound', 'State not found');
    if (
      targetStatus === 'active' &&
      (parentState.status !== 'active' || parentState.countryStatus !== 'active')
    ) {
      throw httpError(
        400,
        'ParentInactive',
        'Cannot activate city because the parent state or country is inactive.'
      );
    }

    const parentStateEffective =
      parentState.statusEffective ??
      (parentState.status === 'active' && parentState.countryStatus === 'active'
        ? 'active'
        : 'inactive');
    const cityEffective =
      targetStatus === 'active' && parentStateEffective === 'active' ? 'active' : 'inactive';

    const updates: Partial<typeof cities.$inferInsert> = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.stateId !== undefined) updates.stateId = body.stateId;
    if (body.status !== undefined) updates.status = body.status;
    updates.statusEffective = cityEffective;

    const result = await db.update(cities).set(updates).where(eq(cities.id, id));
    getAffectedRows(result);

    return fetchCityById(id);
  } catch (err) {
    if (isDuplicateEntryError(err)) {
      throw httpError(409, 'DuplicateCity', 'City name already exists for this state.');
    }
    throw err;
  }
}

export async function deleteCity(id: number) {
  const [shippingRow] = await db
    .select({ id: shippingarearates.id })
    .from(shippingarearates)
    .where(eq(shippingarearates.cityId, id))
    .limit(1);

  if (shippingRow) {
    throw httpError(
      400,
      'DeleteFailed',
      'Cannot delete city. It is being used in shipping area rates.'
    );
  }

  const result = await db.delete(cities).where(eq(cities.id, id));
  const affected = getAffectedRows(result);
  if (!affected) {
    const [exists] = await db
      .select({ id: cities.id })
      .from(cities)
      .where(eq(cities.id, id))
      .limit(1);
    if (!exists) return buildDeleteResponse();
    throw httpError(404, 'NotFound', 'City not found');
  }
  return buildDeleteResponse();
}

export async function exportCities() {
  return db
    .select({
      name: cities.name,
      stateName: states.name,
      countryCode: countries.code,
      status: cities.status,
    })
    .from(cities)
    .innerJoin(states, eq(states.id, cities.stateId))
    .innerJoin(countries, eq(countries.id, states.countryId))
    .orderBy(asc(cities.name));
}

type CityImportRow = {
  name: string;
  stateName: string;
  countryCode: string;
  status: 'active' | 'inactive';
};

export async function importCities(rows: CityImportRow[]) {
  if (!rows.length) {
    throw httpError(400, 'EmptyFile', 'Import file is empty');
  }
  try {
    return await db.transaction(async (tx) => {
      const stateRows = await tx
        .select({
          id: states.id,
          name: states.name,
          status: states.status,
          statusEffective: states.statusEffective,
          countryCode: countries.code,
          countryStatus: countries.status,
        })
        .from(states)
        .innerJoin(countries, eq(countries.id, states.countryId));

      const stateMap = new Map(
        stateRows.map((r) => [
          `${r.name}|${r.countryCode}`,
          {
            id: Number(r.id),
            status: r.status,
            statusEffective: r.statusEffective,
            countryStatus: r.countryStatus,
          },
        ])
      );

      const values = rows.map((row) => {
        const state = stateMap.get(`${row.stateName}|${row.countryCode}`);
        if (!state) {
          throw httpError(
            400,
            'InvalidReference',
            `Invalid combo: state=${row.stateName}, country=${row.countryCode}`
          );
        }
        const parentEffective =
          state.statusEffective ??
          (state.status === 'active' && state.countryStatus === 'active' ? 'active' : 'inactive');
        const statusEffective =
          row.status === 'active' && parentEffective === 'active' ? 'active' : 'inactive';

        return {
          name: row.name,
          stateId: state.id,
          status: row.status,
          statusEffective,
        } satisfies typeof cities.$inferInsert;
      });

      const result = await tx.insert(cities).values(values);
      const affected = getAffectedRows(result);
      return affected || rows.length;
    });
  } catch (err) {
    if (isDuplicateEntryError(err)) {
      throw httpError(409, 'DuplicateCity', 'City name already exists for this state.');
    }
    throw err;
  }
}
