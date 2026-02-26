import { eq } from 'drizzle-orm';
import { countries, taxes } from '@milemoto/types';
import { httpError } from '../../utils/error.js';
import { db } from '../../db/drizzle.js';

type TaxRow = typeof taxes.$inferSelect & { countryName?: string | null };

export function formatTax(row: TaxRow) {
  return {
    id: Number(row.id),
    name: row.name,
    rate: Number(row.rate),
    type: row.type,
    status: row.status,
    countryId: row.countryId ?? null,
    countryName: row.countryName ?? null,
    validFrom:
      row.validFrom instanceof Date
        ? row.validFrom
        : row.validFrom
          ? new Date(row.validFrom)
          : null,
    validTo: row.validTo instanceof Date ? row.validTo : row.validTo ? new Date(row.validTo) : null,
    createdAt:
      row.createdAt instanceof Date
        ? row.createdAt
        : row.createdAt
          ? new Date(row.createdAt)
          : null,
    updatedAt:
      row.updatedAt instanceof Date
        ? row.updatedAt
        : row.updatedAt
          ? new Date(row.updatedAt)
          : null,
  };
}

export async function fetchTaxById(id: number) {
  const rows = await db
    .select({
      id: taxes.id,
      name: taxes.name,
      rate: taxes.rate,
      type: taxes.type,
      status: taxes.status,
      countryId: taxes.countryId,
      validFrom: taxes.validFrom,
      validTo: taxes.validTo,
      countryName: countries.name,
      createdAt: taxes.createdAt,
      updatedAt: taxes.updatedAt,
    })
    .from(taxes)
    .leftJoin(countries, eq(taxes.countryId, countries.id))
    .where(eq(taxes.id, id))
    .limit(1);
  if (!rows[0]) throw httpError(404, 'NotFound', 'Tax not found');
  return formatTax(rows[0]);
}
