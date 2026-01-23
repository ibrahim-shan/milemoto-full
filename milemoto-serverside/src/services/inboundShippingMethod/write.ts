import { and, eq, or, sql } from 'drizzle-orm';
import { inboundshippingmethods } from '@milemoto/types';
import type {
  CreateInboundShippingMethodDto,
  UpdateInboundShippingMethodDto,
} from '@milemoto/types';
import { db } from '../../db/drizzle.js';
import { httpError } from '../../utils/error.js';
import { buildDeleteResponse } from '../../utils/response.js';
import { isDuplicateEntryError } from '../../utils/dbErrors.js';
import { getInboundShippingMethod } from './read.js';
import { formatInboundShippingMethod } from './shared.js';

export async function createInboundShippingMethod(data: CreateInboundShippingMethodDto) {
  const [existing] = await db
    .select({ id: inboundshippingmethods.id })
    .from(inboundshippingmethods)
    .where(
      or(eq(inboundshippingmethods.code, data.code), eq(inboundshippingmethods.name, data.name))
    )
    .limit(1);

  if (existing) {
    throw httpError(409, 'Conflict', 'An inbound shipping method with this code or name exists');
  }

  try {
    const result = await db.insert(inboundshippingmethods).values({
      code: data.code,
      name: data.name,
      description: data.description ?? null,
      status: data.status || 'inactive',
    });

    const insertId =
      'insertId' in result
        ? Number((result as unknown as { insertId: number }).insertId)
        : undefined;

    if (insertId) {
      return await getInboundShippingMethod(insertId);
    }

    const [created] = await db
      .select()
      .from(inboundshippingmethods)
      .where(eq(inboundshippingmethods.code, data.code))
      .limit(1);
    if (created) return formatInboundShippingMethod(created);

    throw httpError(500, 'InsertFailed', 'Failed to create inbound shipping method');
  } catch (err) {
    if (isDuplicateEntryError(err)) {
      throw httpError(
        409,
        'DuplicateInboundShippingMethod',
        'An inbound shipping method with this code or name exists'
      );
    }
    throw err;
  }
}

export async function updateInboundShippingMethod(
  id: number,
  data: UpdateInboundShippingMethodDto
) {
  const method = await getInboundShippingMethod(id);

  if (data.code && data.code !== method.code) {
    const [existing] = await db
      .select({ id: inboundshippingmethods.id })
      .from(inboundshippingmethods)
      .where(
        and(eq(inboundshippingmethods.code, data.code), sql`${inboundshippingmethods.id} != ${id}`)
      )
      .limit(1);

    if (existing) {
      throw httpError(409, 'Conflict', 'An inbound shipping method with this code already exists');
    }
  }

  if (data.name && data.name !== method.name) {
    const [existing] = await db
      .select({ id: inboundshippingmethods.id })
      .from(inboundshippingmethods)
      .where(
        and(eq(inboundshippingmethods.name, data.name), sql`${inboundshippingmethods.id} != ${id}`)
      )
      .limit(1);

    if (existing) {
      throw httpError(409, 'Conflict', 'An inbound shipping method with this name already exists');
    }
  }

  const updates: Partial<CreateInboundShippingMethodDto> = {};

  if (data.code !== undefined) updates.code = data.code;
  if (data.name !== undefined) updates.name = data.name;
  if (data.description !== undefined) updates.description = data.description ?? null;
  if (data.status !== undefined) updates.status = data.status;

  if (Object.keys(updates).length === 0) return method;

  try {
    await db.update(inboundshippingmethods).set(updates).where(eq(inboundshippingmethods.id, id));
    return await getInboundShippingMethod(id);
  } catch (err) {
    if (isDuplicateEntryError(err)) {
      throw httpError(
        409,
        'DuplicateInboundShippingMethod',
        'An inbound shipping method with this code or name exists'
      );
    }
    throw err;
  }
}

export async function deleteInboundShippingMethod(id: number) {
  const result = await db.delete(inboundshippingmethods).where(eq(inboundshippingmethods.id, id));
  const affected =
    'affectedRows' in result ? (result as unknown as { affectedRows: number }).affectedRows : 0;
  if (!affected) {
    const [exists] = await db
      .select({ id: inboundshippingmethods.id })
      .from(inboundshippingmethods)
      .where(eq(inboundshippingmethods.id, id))
      .limit(1);
    if (!exists) {
      return buildDeleteResponse();
    }
    throw httpError(404, 'NotFound', 'Inbound shipping method not found');
  }

  return buildDeleteResponse();
}
