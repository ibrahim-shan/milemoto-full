import { and, eq, sql } from 'drizzle-orm';
import { coupons } from '@milemoto/types';
import type { CreateCouponDto, UpdateCouponDto, CouponResponse } from '@milemoto/types';
import { db } from '../../db/drizzle.js';
import { httpError } from '../../utils/error.js';
import { isDuplicateEntryError } from '../../utils/dbErrors.js';
import { buildDeleteResponse } from '../../utils/response.js';
import { getCoupon } from './read.js';
import { normalizeCouponCode, toCouponResponse } from './shared.js';

function parseDateOrNull(value: string | null | undefined): Date | null {
  if (!value) return null;
  return new Date(value);
}

export async function createCoupon(input: CreateCouponDto): Promise<CouponResponse> {
  const code = normalizeCouponCode(input.code);
  const [existing] = await db
    .select({ id: coupons.id })
    .from(coupons)
    .where(eq(coupons.code, code))
    .limit(1);
  if (existing) throw httpError(409, 'Conflict', 'Coupon code already exists');

  try {
    const result = await db.insert(coupons).values({
      code,
      type: input.type,
      value: input.value,
      minSubtotal: input.minSubtotal ?? null,
      maxDiscount: input.maxDiscount ?? null,
      startsAt: parseDateOrNull(input.startsAt ?? null),
      endsAt: parseDateOrNull(input.endsAt ?? null),
      status: input.status ?? 'active',
      usageLimit: input.usageLimit ?? null,
      perUserLimit: input.perUserLimit ?? null,
      usedCount: 0,
    });

    const insertId =
      'insertId' in result
        ? Number((result as unknown as { insertId: number }).insertId)
        : undefined;
    if (insertId) return getCoupon(insertId);

    const [created] = await db.select().from(coupons).where(eq(coupons.code, code)).limit(1);
    if (!created) throw httpError(500, 'InsertFailed', 'Failed to create coupon');
    return toCouponResponse(created);
  } catch (error) {
    if (isDuplicateEntryError(error)) {
      throw httpError(409, 'Conflict', 'Coupon code already exists');
    }
    throw error;
  }
}

export async function updateCoupon(id: number, input: UpdateCouponDto): Promise<CouponResponse> {
  const current = await getCoupon(id);

  const updates: Partial<typeof coupons.$inferInsert> = {};
  if (input.code !== undefined) updates.code = normalizeCouponCode(input.code);
  if (input.type !== undefined) updates.type = input.type;
  if (input.value !== undefined) updates.value = input.value;
  if (input.minSubtotal !== undefined) updates.minSubtotal = input.minSubtotal ?? null;
  if (input.maxDiscount !== undefined) updates.maxDiscount = input.maxDiscount ?? null;
  if (input.startsAt !== undefined) updates.startsAt = parseDateOrNull(input.startsAt ?? null);
  if (input.endsAt !== undefined) updates.endsAt = parseDateOrNull(input.endsAt ?? null);
  if (input.status !== undefined) updates.status = input.status;
  if (input.usageLimit !== undefined) updates.usageLimit = input.usageLimit ?? null;
  if (input.perUserLimit !== undefined) updates.perUserLimit = input.perUserLimit ?? null;

  if (Object.keys(updates).length === 0) return current;

  if (updates.code && updates.code !== current.code) {
    const [existing] = await db
      .select({ id: coupons.id })
      .from(coupons)
      .where(and(eq(coupons.code, updates.code), sql`${coupons.id} != ${id}`))
      .limit(1);
    if (existing) throw httpError(409, 'Conflict', 'Coupon code already exists');
  }

  try {
    await db.update(coupons).set(updates).where(eq(coupons.id, id));
    return getCoupon(id);
  } catch (error) {
    if (isDuplicateEntryError(error)) {
      throw httpError(409, 'Conflict', 'Coupon code already exists');
    }
    throw error;
  }
}

export async function deleteCoupon(id: number) {
  const result = await db.delete(coupons).where(eq(coupons.id, id));
  const affected =
    'affectedRows' in result ? (result as unknown as { affectedRows: number }).affectedRows : 0;
  if (!affected) return buildDeleteResponse();
  return buildDeleteResponse();
}
