import { and, asc, eq, like, or, sql } from 'drizzle-orm';
import { cities, countries, shippingarearates, states } from '@milemoto/types';
import type { CreateAreaRateDto, UpdateAreaRateDto } from '@milemoto/types';
import type { ListQueryDto } from '../../routes/admin/helpers/shipping.helpers.js';
import { db } from '../../db/drizzle.js';
import { httpError } from '../../utils/error.js';
import { isDuplicateEntryError } from '../../utils/dbErrors.js';
import { buildDeleteResponse, buildPaginatedResponse } from '../../utils/response.js';
import { formatAreaRate } from './shared.js';

async function fetchAreaRateById(id: number) {
  const [row] = await db
    .select({
      id: shippingarearates.id,
      countryId: shippingarearates.countryId,
      stateId: shippingarearates.stateId,
      cityId: shippingarearates.cityId,
      cost: shippingarearates.cost,
      createdAt: shippingarearates.createdAt,
      updatedAt: shippingarearates.updatedAt,
      countryName: countries.name,
      stateName: states.name,
      cityName: cities.name,
    })
    .from(shippingarearates)
    .innerJoin(countries, eq(countries.id, shippingarearates.countryId))
    .leftJoin(states, eq(states.id, shippingarearates.stateId))
    .leftJoin(cities, eq(cities.id, shippingarearates.cityId))
    .where(eq(shippingarearates.id, id))
    .limit(1);

  if (!row) {
    throw httpError(404, 'NotFound', 'Rate not found');
  }
  return formatAreaRate(row);
}

export async function createAreaRate(data: CreateAreaRateDto) {
  try {
    const [existing] = await db
      .select({ id: shippingarearates.id })
      .from(shippingarearates)
      .where(
        and(
          eq(shippingarearates.countryId, data.countryId),
          sql`${shippingarearates.stateId} <=> ${data.stateId ?? null}`,
          sql`${shippingarearates.cityId} <=> ${data.cityId ?? null}`
        )
      )
      .limit(1);

    if (existing) {
      throw httpError(
        409,
        'DuplicateRate',
        'A shipping rate for this specific location already exists.'
      );
    }

    const res = await db.insert(shippingarearates).values({
      countryId: data.countryId,
      stateId: data.stateId ?? null,
      cityId: data.cityId ?? null,
      cost: data.cost,
    });

    const insertId =
      'insertId' in res ? Number((res as unknown as { insertId: number }).insertId) : undefined;

    if (insertId) {
      return fetchAreaRateById(insertId);
    }

    const [created] = await db
      .select({
        id: shippingarearates.id,
        countryId: shippingarearates.countryId,
        stateId: shippingarearates.stateId,
        cityId: shippingarearates.cityId,
        cost: shippingarearates.cost,
        createdAt: shippingarearates.createdAt,
        updatedAt: shippingarearates.updatedAt,
        countryName: countries.name,
        stateName: states.name,
        cityName: cities.name,
      })
      .from(shippingarearates)
      .innerJoin(countries, eq(countries.id, shippingarearates.countryId))
      .leftJoin(states, eq(states.id, shippingarearates.stateId))
      .leftJoin(cities, eq(cities.id, shippingarearates.cityId))
      .where(
        and(
          eq(shippingarearates.countryId, data.countryId),
          sql`${shippingarearates.stateId} <=> ${data.stateId ?? null}`,
          sql`${shippingarearates.cityId} <=> ${data.cityId ?? null}`
        )
      )
      .limit(1);

    if (created) {
      return formatAreaRate(created);
    }

    throw httpError(500, 'InsertFailed', 'Failed to create shipping area rate');
  } catch (err) {
    if (isDuplicateEntryError(err)) {
      throw httpError(
        409,
        'DuplicateRate',
        'A shipping rate for this specific location already exists.'
      );
    }
    throw err;
  }
}

export async function listAreaRates(params: ListQueryDto) {
  const { search, page, limit } = params;
  const offset = (page - 1) * limit;

  const filters = [
    search
      ? or(
          like(countries.name, `%${search}%`),
          like(states.name, `%${search}%`),
          like(cities.name, `%${search}%`)
        )
      : undefined,
  ].filter(Boolean) as NonNullable<ReturnType<typeof and>>[];

  const where = filters.length ? and(...filters) : undefined;

  const [items, countRows] = await Promise.all([
    db
      .select({
        id: shippingarearates.id,
        countryId: shippingarearates.countryId,
        stateId: shippingarearates.stateId,
        cityId: shippingarearates.cityId,
        cost: shippingarearates.cost,
        createdAt: shippingarearates.createdAt,
        updatedAt: shippingarearates.updatedAt,
        countryName: countries.name,
        stateName: states.name,
        cityName: cities.name,
      })
      .from(shippingarearates)
      .innerJoin(countries, eq(countries.id, shippingarearates.countryId))
      .leftJoin(states, eq(states.id, shippingarearates.stateId))
      .leftJoin(cities, eq(cities.id, shippingarearates.cityId))
      .where(where)
      .orderBy(asc(countries.name), asc(states.name), asc(cities.name))
      .limit(limit)
      .offset(offset),
    db
      .select({ total: sql<number>`count(*)` })
      .from(shippingarearates)
      .innerJoin(countries, eq(countries.id, shippingarearates.countryId))
      .leftJoin(states, eq(states.id, shippingarearates.stateId))
      .leftJoin(cities, eq(cities.id, shippingarearates.cityId))
      .where(where),
  ]);

  const totalCount = Number(countRows[0]?.total ?? 0);

  return buildPaginatedResponse({
    items: items.map(formatAreaRate),
    totalCount,
    page,
    limit,
  });
}

export async function updateAreaRate(id: number, body: UpdateAreaRateDto) {
  const rate = await fetchAreaRateById(id);

  const updates: Partial<typeof shippingarearates.$inferInsert> = {};

  if (body.cost !== undefined) {
    updates.cost = body.cost;
  }

  if (Object.keys(updates).length === 0) {
    return rate;
  }

  const result = await db
    .update(shippingarearates)
    .set(updates)
    .where(eq(shippingarearates.id, id));
  void result;

  return fetchAreaRateById(id);
}

export async function deleteAreaRate(id: number) {
  const result = await db.delete(shippingarearates).where(eq(shippingarearates.id, id));
  const affected =
    'affectedRows' in result ? (result as unknown as { affectedRows: number }).affectedRows : 0;

  if (!affected) {
    const [exists] = await db
      .select({ id: shippingarearates.id })
      .from(shippingarearates)
      .where(eq(shippingarearates.id, id))
      .limit(1);

    if (!exists) {
      return buildDeleteResponse();
    }
  }

  return buildDeleteResponse();
}
