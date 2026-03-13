import { and, eq, sql } from 'drizzle-orm';
import { couponredemptions, coupons } from '@milemoto/types';
import { db } from '../../db/drizzle.js';
import { httpError } from '../../utils/error.js';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface ResolvedCoupon {
  id: number;
  code: string;
  discountTotal: number;
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function toPositiveAmount(value: number | null | undefined): number {
  if (value == null) return 0;
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, num);
}

function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

async function loadCouponByCode(code: string, tx?: Tx, lockForUpdate = false) {
  const normalized = normalizeCode(code);
  if (!normalized) return null;

  if (tx && lockForUpdate) {
    const lockResult = await tx.execute(
      sql`SELECT id, code, type, value, minSubtotal, maxDiscount, startsAt, endsAt, status, usageLimit, perUserLimit, usedCount
          FROM coupons WHERE code = ${normalized} LIMIT 1 FOR UPDATE`
    );
    const rows = Array.isArray(lockResult)
      ? Array.isArray(lockResult[0])
        ? lockResult[0]
        : lockResult
      : 'rows' in (lockResult as object)
        ? ((lockResult as { rows?: unknown[] }).rows ?? [])
        : [];
    return (
      (rows[0] as
        | {
            id: number;
            code: string;
            type: 'fixed' | 'percentage';
            value: number;
            minSubtotal: number | null;
            maxDiscount: number | null;
            startsAt: Date | string | null;
            endsAt: Date | string | null;
            status: 'active' | 'inactive';
            usageLimit: number | null;
            perUserLimit: number | null;
            usedCount: number;
          }
        | undefined) ?? null
    );
  }

  const query = (tx ?? db).select().from(coupons).where(eq(coupons.code, normalized)).limit(1);
  const [row] = await query;
  return row ?? null;
}

function validateCouponWindowAndStatus(row: {
  status: string;
  startsAt: Date | string | null;
  endsAt: Date | string | null;
}) {
  if (row.status !== 'active') {
    throw httpError(400, 'CouponInvalid', 'Coupon is inactive');
  }
  const now = new Date();
  if (row.startsAt && now < new Date(row.startsAt)) {
    throw httpError(400, 'CouponNotStarted', 'Coupon is not active yet');
  }
  if (row.endsAt && now > new Date(row.endsAt)) {
    throw httpError(400, 'CouponExpired', 'Coupon has expired');
  }
}

function computeDiscount(
  subtotal: number,
  row: { type: string; value: number; maxDiscount: number | null }
) {
  const safeSubtotal = toPositiveAmount(subtotal);
  if (safeSubtotal <= 0) return 0;
  if (row.type === 'fixed') {
    return round2(Math.min(safeSubtotal, toPositiveAmount(row.value)));
  }
  const raw = (safeSubtotal * toPositiveAmount(row.value)) / 100;
  const capped = row.maxDiscount != null ? Math.min(raw, toPositiveAmount(row.maxDiscount)) : raw;
  return round2(Math.min(safeSubtotal, capped));
}

async function assertCouponUsageLimits(input: {
  userId: number;
  couponId: number;
  usageLimit: number | null;
  perUserLimit: number | null;
  usedCount: number;
  tx?: Tx;
}) {
  const { userId, couponId, usageLimit, perUserLimit, usedCount, tx } = input;
  if (usageLimit != null && usageLimit > 0 && Number(usedCount) >= usageLimit) {
    throw httpError(400, 'CouponUsageLimitReached', 'Coupon usage limit reached');
  }
  if (perUserLimit != null && perUserLimit > 0) {
    const query = (tx ?? db)
      .select({ count: sql<number>`COUNT(*)` })
      .from(couponredemptions)
      .where(and(eq(couponredemptions.couponId, couponId), eq(couponredemptions.userId, userId)));
    const [row] = await query;
    const userUsedCount = Number(row?.count ?? 0);
    if (userUsedCount >= perUserLimit) {
      throw httpError(400, 'CouponUsageLimitReached', 'You have reached the coupon usage limit');
    }
  }
}

export async function resolveCouponForQuote(input: {
  userId: number;
  couponCode?: string | null;
  subtotal: number;
}): Promise<ResolvedCoupon | null> {
  const code = input.couponCode?.trim();
  if (!code) return null;

  const row = await loadCouponByCode(code);
  if (!row) throw httpError(400, 'CouponInvalid', 'Coupon not found');
  validateCouponWindowAndStatus(row);

  const minSubtotal = toPositiveAmount(row.minSubtotal);
  if (minSubtotal > 0 && input.subtotal < minSubtotal) {
    throw httpError(
      400,
      'CouponMinSubtotalNotMet',
      `Coupon requires minimum subtotal ${minSubtotal.toFixed(2)}`
    );
  }

  await assertCouponUsageLimits({
    userId: input.userId,
    couponId: Number(row.id),
    usageLimit: row.usageLimit,
    perUserLimit: row.perUserLimit,
    usedCount: Number(row.usedCount ?? 0),
  });

  const discountTotal = computeDiscount(input.subtotal, {
    type: row.type,
    value: Number(row.value),
    maxDiscount: row.maxDiscount,
  });

  return {
    id: Number(row.id),
    code: normalizeCode(row.code),
    discountTotal,
  };
}

export async function resolveCouponForSubmit(input: {
  tx: Tx;
  userId: number;
  couponCode?: string | null;
  subtotal: number;
}): Promise<ResolvedCoupon | null> {
  const code = input.couponCode?.trim();
  if (!code) return null;

  const row = await loadCouponByCode(code, input.tx, true);
  if (!row) throw httpError(400, 'CouponInvalid', 'Coupon not found');
  validateCouponWindowAndStatus(row);

  const minSubtotal = toPositiveAmount(row.minSubtotal);
  if (minSubtotal > 0 && input.subtotal < minSubtotal) {
    throw httpError(
      400,
      'CouponMinSubtotalNotMet',
      `Coupon requires minimum subtotal ${minSubtotal.toFixed(2)}`
    );
  }

  await assertCouponUsageLimits({
    userId: input.userId,
    couponId: Number(row.id),
    usageLimit: row.usageLimit,
    perUserLimit: row.perUserLimit,
    usedCount: Number(row.usedCount ?? 0),
    tx: input.tx,
  });

  const discountTotal = computeDiscount(input.subtotal, {
    type: row.type,
    value: Number(row.value),
    maxDiscount: row.maxDiscount,
  });

  return {
    id: Number(row.id),
    code: normalizeCode(row.code),
    discountTotal,
  };
}
