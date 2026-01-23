import { eq } from 'drizzle-orm';
import { currencies, purchaseorders } from '@milemoto/types';
import type { CreateCurrencyDto, UpdateCurrencyDto } from '@milemoto/types';
import { db } from '../../db/drizzle.js';
import { httpError } from '../../utils/error.js';
import { buildDeleteResponse } from '../../utils/response.js';
import { isDuplicateEntryError, isRowIsReferencedError } from '../../utils/dbErrors.js';
import { fetchCurrency } from './read.js';
import { toCurrencyResponse } from './shared.js';

export async function createCurrency(data: CreateCurrencyDto) {
  try {
    const result = await db.insert(currencies).values({
      name: data.name,
      code: data.code,
      symbol: data.symbol,
      exchangeRate: data.exchangeRate,
      status: data.status,
    });
    const insertId =
      'insertId' in result
        ? Number((result as unknown as { insertId: number }).insertId)
        : undefined;
    if (insertId) return await fetchCurrency(insertId);

    const [created] = await db
      .select()
      .from(currencies)
      .where(eq(currencies.code, data.code))
      .limit(1);
    if (created) return toCurrencyResponse(created);

    throw httpError(500, 'InsertFailed', 'Failed to create currency');
  } catch (err) {
    if (isDuplicateEntryError(err)) {
      throw httpError(409, 'DuplicateCurrency', 'Currency code already exists.');
    }
    throw err;
  }
}

export async function updateCurrency(id: number, body: UpdateCurrencyDto) {
  const updates: Partial<CreateCurrencyDto> = {};
  if (body.name !== undefined) updates.name = body.name;
  if (body.code !== undefined) updates.code = body.code;
  if (body.symbol !== undefined) updates.symbol = body.symbol;
  if (body.exchangeRate !== undefined) updates.exchangeRate = body.exchangeRate;
  if (body.status !== undefined) updates.status = body.status;

  if (Object.keys(updates).length === 0) {
    return fetchCurrency(id);
  }

  try {
    const result = await db.update(currencies).set(updates).where(eq(currencies.id, id));
    const affected =
      'affectedRows' in result ? (result as unknown as { affectedRows: number }).affectedRows : 0;
    if (!affected) {
      const [exists] = await db
        .select({ id: currencies.id })
        .from(currencies)
        .where(eq(currencies.id, id))
        .limit(1);
      if (!exists) throw httpError(404, 'NotFound', 'Currency not found');
    }

    return fetchCurrency(id);
  } catch (err) {
    if (isDuplicateEntryError(err)) {
      throw httpError(409, 'DuplicateCurrency', 'Currency code already exists.');
    }
    throw err;
  }
}

export async function deleteCurrency(id: number) {
  const [inUse] = await db
    .select({ id: purchaseorders.id })
    .from(purchaseorders)
    .where(eq(purchaseorders.currencyId, id))
    .limit(1);
  if (inUse) {
    await db.update(currencies).set({ status: 'inactive' }).where(eq(currencies.id, id));
    return buildDeleteResponse(
      true,
      'deactivated',
      'Currency is linked to purchase orders and was marked inactive instead of deleted.'
    );
  }

  try {
    const result = await db.delete(currencies).where(eq(currencies.id, id));
    const affected =
      'affectedRows' in result ? (result as unknown as { affectedRows: number }).affectedRows : 0;
    if (!affected) {
      const [exists] = await db
        .select({ id: currencies.id })
        .from(currencies)
        .where(eq(currencies.id, id))
        .limit(1);
      if (!exists) return buildDeleteResponse();
      throw httpError(404, 'NotFound', 'Currency not found');
    }
    return buildDeleteResponse(true, 'deleted');
  } catch (err) {
    if (isRowIsReferencedError(err)) {
      await db.update(currencies).set({ status: 'inactive' }).where(eq(currencies.id, id));
      return buildDeleteResponse(
        true,
        'deactivated',
        'Currency is linked to purchase orders and was marked inactive instead of deleted.'
      );
    }
    await db.update(currencies).set({ status: 'inactive' }).where(eq(currencies.id, id));
    return buildDeleteResponse(
      true,
      'deactivated',
      'Currency is linked to purchase orders and was marked inactive instead of deleted.'
    );
  }
}
