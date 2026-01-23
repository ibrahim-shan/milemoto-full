import { asc, eq, inArray, like, or, sql } from 'drizzle-orm';
import type {
  CreateCountryDto,
  ImportCountryRows,
  ListQueryDto,
  UpdateCountryDto,
} from '../../routes/admin/helpers/location.helpers.js';
import type { CountryResponse } from '@milemoto/types';
import { cities, countries, shippingarearates, states } from '@milemoto/types';
import { db } from '../../db/drizzle.js';
import { isDuplicateEntryError, isRowIsReferencedError } from '../../utils/dbErrors.js';
import { httpError } from '../../utils/error.js';
import { buildDeleteResponse, buildPaginatedResponse } from '../../utils/response.js';
import { getAffectedRows, toIso } from './shared.js';

type CountryRow = {
  id: number;
  name: string;
  code: string;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
};

function formatCountry(row: CountryRow): CountryResponse {
  return {
    id: Number(row.id),
    name: row.name,
    code: row.code,
    status: row.status,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

async function fetchCountryById(id: number) {
  const row = await db
    .select({
      id: countries.id,
      name: countries.name,
      code: countries.code,
      status: countries.status,
      createdAt: countries.createdAt,
      updatedAt: countries.updatedAt,
    })
    .from(countries)
    .where(eq(countries.id, id))
    .limit(1)
    .then((rows) => rows[0] as CountryRow | undefined);

  if (!row) {
    throw httpError(404, 'NotFound', 'Country not found');
  }
  return formatCountry(row);
}

export async function createCountry(data: CreateCountryDto) {
  try {
    const inserted = await db
      .insert(countries)
      .values({
        name: data.name,
        code: data.code,
        status: data.status,
      })
      .$returningId();

    const insertId = Number(inserted[0]?.id);
    if (!insertId) {
      throw httpError(500, 'InsertFailed', 'Failed to create country');
    }

    return fetchCountryById(insertId);
  } catch (err) {
    if (isDuplicateEntryError(err)) {
      throw httpError(409, 'DuplicateCountry', 'Country code already exists.');
    }
    throw err;
  }
}

export async function listCountries(params: ListQueryDto) {
  const { page, limit, search } = params;
  const offset = (page - 1) * limit;

  const where = search
    ? or(like(countries.name, `%${search}%`), like(countries.code, `%${search}%`))
    : undefined;

  const [items, countRows] = await Promise.all([
    db
      .select({
        id: countries.id,
        name: countries.name,
        code: countries.code,
        status: countries.status,
        createdAt: countries.createdAt,
        updatedAt: countries.updatedAt,
      })
      .from(countries)
      .where(where)
      .orderBy(asc(countries.name))
      .limit(limit)
      .offset(offset)
      .then((rows) => rows as CountryRow[]),
    db
      .select({ total: sql<number>`count(*)` })
      .from(countries)
      .where(where),
  ]);

  const totalCount = Number(countRows[0]?.total ?? 0);
  return buildPaginatedResponse({
    items: items.map(formatCountry),
    totalCount,
    page,
    limit,
  });
}

export async function updateCountry(id: number, body: UpdateCountryDto) {
  try {
    const [existing] = await db
      .select({ id: countries.id })
      .from(countries)
      .where(eq(countries.id, id))
      .limit(1);
    if (!existing) {
      throw httpError(404, 'NotFound', 'Country not found');
    }

    const updates: Partial<typeof countries.$inferInsert> = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.code !== undefined) updates.code = body.code;
    if (body.status !== undefined) updates.status = body.status;

    if (Object.keys(updates).length === 0) {
      return fetchCountryById(id);
    }

    await db.transaction(async (tx) => {
      const result = await tx.update(countries).set(updates).where(eq(countries.id, id));
      getAffectedRows(result);

      if (body.status === 'inactive') {
        await tx
          .update(states)
          .set({ statusEffective: 'inactive' })
          .where(eq(states.countryId, id));

        const stateIdRows = await tx
          .select({ id: states.id })
          .from(states)
          .where(eq(states.countryId, id));
        const stateIds = stateIdRows.map((r) => Number(r.id));
        if (stateIds.length > 0) {
          await tx
            .update(cities)
            .set({ statusEffective: 'inactive' })
            .where(inArray(cities.stateId, stateIds));
        }
      } else if (body.status === 'active') {
        await tx
          .update(states)
          .set({
            statusEffective: sql<
              'active' | 'inactive'
            >`CASE WHEN ${states.status} = 'active' THEN 'active' ELSE 'inactive' END`,
          })
          .where(eq(states.countryId, id));

        const stateRows = await tx
          .select({ id: states.id, statusEffective: states.statusEffective })
          .from(states)
          .where(eq(states.countryId, id));

        for (const st of stateRows) {
          const stateId = Number(st.id);
          if (st.statusEffective !== 'active') {
            await tx
              .update(cities)
              .set({ statusEffective: 'inactive' })
              .where(eq(cities.stateId, stateId));
            continue;
          }
          await tx
            .update(cities)
            .set({
              statusEffective: sql<
                'active' | 'inactive'
              >`CASE WHEN ${cities.status} = 'active' THEN 'active' ELSE 'inactive' END`,
            })
            .where(eq(cities.stateId, stateId));
        }
      }
    });

    return fetchCountryById(id);
  } catch (err) {
    if (isDuplicateEntryError(err)) {
      throw httpError(409, 'DuplicateCountry', 'Country code already exists.');
    }
    throw err;
  }
}

export async function deleteCountry(id: number) {
  try {
    const [shippingRow] = await db
      .select({ id: shippingarearates.id })
      .from(shippingarearates)
      .where(eq(shippingarearates.countryId, id))
      .limit(1);

    if (shippingRow) {
      throw httpError(
        400,
        'DeleteFailed',
        'Cannot delete country. It is being used in shipping area rates.'
      );
    }

    const result = await db.delete(countries).where(eq(countries.id, id));
    const affected = getAffectedRows(result);
    if (!affected) {
      const [exists] = await db
        .select({ id: countries.id })
        .from(countries)
        .where(eq(countries.id, id))
        .limit(1);
      if (!exists) return buildDeleteResponse();
      throw httpError(404, 'NotFound', 'Country not found');
    }
    return buildDeleteResponse();
  } catch (err) {
    if (isRowIsReferencedError(err)) {
      throw httpError(
        400,
        'DeleteFailed',
        'Cannot delete country. It is already linked to existing states.'
      );
    }
    throw err;
  }
}

export async function listAllCountries(includeInactive: boolean) {
  const where = includeInactive ? undefined : eq(countries.status, 'active');
  return db
    .select({ id: countries.id, name: countries.name, status: countries.status })
    .from(countries)
    .where(where)
    .orderBy(asc(countries.name));
}

export async function exportCountries() {
  return db
    .select({ name: countries.name, code: countries.code, status: countries.status })
    .from(countries)
    .orderBy(asc(countries.name));
}

export async function importCountries(rows: ImportCountryRows) {
  if (!rows.length) {
    throw httpError(400, 'EmptyFile', 'Import file is empty');
  }
  try {
    const values = rows.map((row) => ({
      name: row.name,
      code: row.code,
      status: row.status,
    })) satisfies (typeof countries.$inferInsert)[];

    const result = await db
      .insert(countries)
      .values(values)
      .onDuplicateKeyUpdate({
        set: {
          name: sql<string>`VALUES(name)`,
          status: sql<'active' | 'inactive'>`VALUES(status)`,
        },
      });

    const affected = getAffectedRows(result);
    return affected || rows.length;
  } catch (err) {
    if (isDuplicateEntryError(err)) {
      throw httpError(409, 'DuplicateCountry', 'Country code already exists.');
    }
    throw err;
  }
}
