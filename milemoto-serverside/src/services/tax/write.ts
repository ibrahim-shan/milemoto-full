import { and, eq, sql } from 'drizzle-orm';
import { taxes } from '@milemoto/types';
import type { CreateTaxDto, UpdateTaxDto } from '../../routes/admin/helpers/tax.helpers.js';
import { buildDeleteResponse } from '../../utils/response.js';
import { isDuplicateEntryError } from '../../utils/dbErrors.js';
import { httpError } from '../../utils/error.js';
import { db } from '../../db/drizzle.js';
import { fetchTaxById } from './shared.js';

export async function createTax(data: CreateTaxDto) {
  try {
    const normalizedName = data.name.trim();

    const [existingCombo] = await db
      .select({ id: taxes.id })
      .from(taxes)
      .where(
        and(
          eq(taxes.name, normalizedName),
          eq(taxes.type, data.type),
          eq(taxes.rate, data.rate),
          sql`${taxes.countryId} <=> ${data.countryId ?? null}`,
          sql`${taxes.validFrom} <=> ${data.validFrom ?? null}`,
          sql`${taxes.validTo} <=> ${data.validTo ?? null}`
        )
      )
      .limit(1);
    if (existingCombo) {
      throw httpError(
        409,
        'DuplicateTax',
        'A tax with the same name, rate, type, and region already exists.'
      );
    }

    const result = await db.insert(taxes).values({
      name: normalizedName,
      rate: data.rate,
      type: data.type,
      status: data.status,
      countryId: data.countryId ?? null,
      validFrom: data.validFrom ?? null,
      validTo: data.validTo ?? null,
    });
    const insertId =
      'insertId' in result
        ? Number((result as unknown as { insertId: number }).insertId)
        : undefined;
    if (insertId) return fetchTaxById(insertId);

    const [created] = await db
      .select({ id: taxes.id })
      .from(taxes)
      .where(and(eq(taxes.name, data.name), eq(taxes.type, data.type)))
      .limit(1);
    if (created) return fetchTaxById(created.id);

    throw httpError(500, 'InsertFailed', 'Failed to create tax');
  } catch (err) {
    if (isDuplicateEntryError(err)) {
      throw httpError(409, 'DuplicateTax', 'Tax entry already exists.');
    }
    throw err;
  }
}

export async function updateTax(id: number, body: UpdateTaxDto) {
  const updates: Partial<CreateTaxDto> = {};
  if (body.name !== undefined) updates.name = body.name.trim();
  if (body.rate !== undefined) updates.rate = body.rate;
  if (body.type !== undefined) updates.type = body.type;
  if (body.status !== undefined) updates.status = body.status;
  if (body.countryId !== undefined) updates.countryId = body.countryId ?? null;
  if (body.validFrom !== undefined) updates.validFrom = body.validFrom ?? null;
  if (body.validTo !== undefined) updates.validTo = body.validTo ?? null;

  if (Object.keys(updates).length === 0) {
    return fetchTaxById(id);
  }

  try {
    const current = await fetchTaxById(id);
    const nextName = updates.name ?? current.name;
    const nextRate = updates.rate ?? current.rate;
    const nextType = updates.type ?? current.type;
    const nextCountry = updates.countryId ?? current.countryId;
    const nextValidFrom = updates.validFrom ?? current.validFrom ?? null;
    const nextValidTo = updates.validTo ?? current.validTo ?? null;

    const [existingCombo] = await db
      .select({ id: taxes.id })
      .from(taxes)
      .where(
        and(
          eq(taxes.name, nextName),
          eq(taxes.type, nextType),
          eq(taxes.rate, nextRate),
          sql`${taxes.countryId} <=> ${nextCountry ?? null}`,
          sql`${taxes.validFrom} <=> ${nextValidFrom ?? null}`,
          sql`${taxes.validTo} <=> ${nextValidTo ?? null}`,
          sql`${taxes.id} != ${id}`
        )
      )
      .limit(1);
    if (existingCombo) {
      throw httpError(
        409,
        'DuplicateTax',
        'A tax with the same name, rate, type, and region already exists.'
      );
    }

    const result = await db.update(taxes).set(updates).where(eq(taxes.id, id));
    const affected =
      'affectedRows' in result ? (result as unknown as { affectedRows: number }).affectedRows : 0;
    if (!affected) {
      const [exists] = await db
        .select({ id: taxes.id })
        .from(taxes)
        .where(eq(taxes.id, id))
        .limit(1);
      if (!exists) {
        throw httpError(404, 'NotFound', 'Tax not found');
      }
    }

    return fetchTaxById(id);
  } catch (err) {
    if (isDuplicateEntryError(err)) {
      throw httpError(409, 'DuplicateTax', 'Tax entry already exists.');
    }
    throw err;
  }
}

export async function deleteTax(id: number) {
  const result = await db.delete(taxes).where(eq(taxes.id, id));
  const affected =
    'affectedRows' in result ? (result as unknown as { affectedRows: number }).affectedRows : 0;
  if (!affected) {
    const [exists] = await db.select({ id: taxes.id }).from(taxes).where(eq(taxes.id, id)).limit(1);
    if (!exists) {
      return buildDeleteResponse();
    }
    throw httpError(404, 'NotFound', 'Tax not found');
  }
  return buildDeleteResponse();
}
