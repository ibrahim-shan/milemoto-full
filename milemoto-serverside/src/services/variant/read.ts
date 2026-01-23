import { and, asc, eq, inArray, like, or, sql } from 'drizzle-orm';
import { variants, variantvalues } from '@milemoto/types';
import type { VariantValueResponse } from '@milemoto/types';
import type { ListQueryDto } from '../../routes/admin/helpers/variant.helpers.js';
import { db } from '../../db/drizzle.js';
import { httpError } from '../../utils/error.js';
import { buildPaginatedResponse } from '../../utils/response.js';
import { mapVariant, mapVariantValue } from './shared.js';

export async function listVariants(params: ListQueryDto) {
  const { page, limit, search, status } = params;
  const offset = (page - 1) * limit;

  const filters = [
    search ? or(like(variants.name, `%${search}%`), like(variants.slug, `%${search}%`)) : undefined,
    status ? eq(variants.status, status) : undefined,
  ].filter(Boolean) as NonNullable<ReturnType<typeof and>>[];

  const where = filters.length ? and(...filters) : undefined;

  const [rows, countRows] = await Promise.all([
    db.select().from(variants).where(where).orderBy(asc(variants.name)).limit(limit).offset(offset),
    db
      .select({ total: sql<number>`count(*)` })
      .from(variants)
      .where(where),
  ]);

  const total = Number(countRows[0]?.total ?? 0);

  let valuesByVariant: Record<number, VariantValueResponse[]> = {};
  if (rows.length > 0) {
    const ids = rows.map((r) => Number(r.id));
    const values = await db
      .select()
      .from(variantvalues)
      .where(inArray(variantvalues.variantId, ids))
      .orderBy(asc(variantvalues.value));

    valuesByVariant = values.reduce<Record<number, VariantValueResponse[]>>((acc, v) => {
      const entry = mapVariantValue(v);
      const key = Number(v.variantId);
      acc[key] = acc[key] ? [...acc[key], entry] : [entry];
      return acc;
    }, {});
  }

  return buildPaginatedResponse({
    items: rows.map((r) => mapVariant(r, valuesByVariant[Number(r.id)] ?? [])),
    totalCount: total,
    page,
    limit,
  });
}

export async function getVariant(id: number) {
  const [row] = await db.select().from(variants).where(eq(variants.id, id)).limit(1);

  if (!row) {
    throw httpError(404, 'NotFound', 'Variant not found');
  }

  const values = await db
    .select()
    .from(variantvalues)
    .where(eq(variantvalues.variantId, id))
    .orderBy(asc(variantvalues.value));

  return mapVariant(row, values);
}
