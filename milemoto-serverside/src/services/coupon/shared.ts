import type { coupons } from '@milemoto/types';
import type { CouponResponse } from '@milemoto/types';

type CouponRow = typeof coupons.$inferSelect;

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  return new Date(value).toISOString();
}

export function toCouponResponse(row: CouponRow): CouponResponse {
  return {
    id: Number(row.id),
    code: row.code,
    type: row.type,
    value: Number(row.value),
    minSubtotal: row.minSubtotal == null ? null : Number(row.minSubtotal),
    maxDiscount: row.maxDiscount == null ? null : Number(row.maxDiscount),
    startsAt: toIso(row.startsAt),
    endsAt: toIso(row.endsAt),
    status: row.status,
    usageLimit: row.usageLimit == null ? null : Number(row.usageLimit),
    perUserLimit: row.perUserLimit == null ? null : Number(row.perUserLimit),
    usedCount: Number(row.usedCount),
    createdAt: toIso(row.createdAt) || new Date().toISOString(),
    updatedAt: toIso(row.updatedAt) || new Date().toISOString(),
  };
}

export function normalizeCouponCode(code: string): string {
  return code.trim().toUpperCase();
}
