import { and, eq, sql } from 'drizzle-orm';
import { paymentmethods } from '@milemoto/types';
import type { CreatePaymentMethodDto, UpdatePaymentMethodDto } from '@milemoto/types';
import { buildDeleteResponse } from '../../utils/response.js';
import { isDuplicateEntryError } from '../../utils/dbErrors.js';
import { httpError } from '../../utils/error.js';
import { db } from '../../db/drizzle.js';
import { getPaymentMethod } from './read.js';
import { formatPaymentMethodRow } from './shared.js';

export async function createPaymentMethod(data: CreatePaymentMethodDto) {
  const [existing] = await db
    .select({ id: paymentmethods.id })
    .from(paymentmethods)
    .where(eq(paymentmethods.name, data.name))
    .limit(1);

  if (existing) {
    throw httpError(409, 'Conflict', 'A payment method with this name already exists');
  }

  try {
    const result = await db.insert(paymentmethods).values({
      name: data.name,
      status: data.status || 'active',
    });

    const insertId =
      'insertId' in result
        ? Number((result as unknown as { insertId: number }).insertId)
        : undefined;

    if (insertId) {
      return await getPaymentMethod(insertId);
    }

    const [created] = await db
      .select()
      .from(paymentmethods)
      .where(eq(paymentmethods.name, data.name))
      .limit(1);
    if (created) return formatPaymentMethodRow(created);

    throw httpError(500, 'InsertFailed', 'Failed to create payment method');
  } catch (err) {
    if (isDuplicateEntryError(err)) {
      throw httpError(
        409,
        'DuplicatePaymentMethod',
        'A payment method with this name already exists'
      );
    }
    throw err;
  }
}

export async function updatePaymentMethod(id: number, data: UpdatePaymentMethodDto) {
  const paymentMethod = await getPaymentMethod(id);

  if (data.name && data.name !== paymentMethod.name) {
    const [existing] = await db
      .select({ id: paymentmethods.id })
      .from(paymentmethods)
      .where(and(eq(paymentmethods.name, data.name), sql`${paymentmethods.id} != ${id}`))
      .limit(1);

    if (existing) {
      throw httpError(409, 'Conflict', 'A payment method with this name already exists');
    }
  }

  const updates: Partial<CreatePaymentMethodDto> = {};

  if (data.name !== undefined) {
    updates.name = data.name;
  }

  if (data.status !== undefined) {
    updates.status = data.status;
  }

  if (Object.keys(updates).length === 0) return paymentMethod;

  try {
    await db.update(paymentmethods).set(updates).where(eq(paymentmethods.id, id));
    return await getPaymentMethod(id);
  } catch (err) {
    if (isDuplicateEntryError(err)) {
      throw httpError(
        409,
        'DuplicatePaymentMethod',
        'A payment method with this name already exists'
      );
    }
    throw err;
  }
}

export async function deletePaymentMethod(id: number) {
  // Currently no FK usage checks; add when payments reference this table
  const result = await db.delete(paymentmethods).where(eq(paymentmethods.id, id));
  const affected =
    'affectedRows' in result ? (result as unknown as { affectedRows: number }).affectedRows : 0;
  if (!affected) {
    const [exists] = await db
      .select({ id: paymentmethods.id })
      .from(paymentmethods)
      .where(eq(paymentmethods.id, id))
      .limit(1);
    if (!exists) {
      return buildDeleteResponse();
    }
    throw httpError(404, 'NotFound', 'Payment method not found');
  }

  return buildDeleteResponse();
}
