import { z } from "zod";
import { PaginationSchema, type PaginatedResponse } from "./common.types.js";
import { OptionalDateOnlyStringSchema } from "./zod.helpers.js";

export const CouponTypeSchema = z.enum(["fixed", "percentage"]);
export const CouponStatusSchema = z.enum(["active", "inactive"]);

const OptionalDateTimeString = z
  .union([z.string().datetime({ offset: true }), z.string().datetime()])
  .optional()
  .nullable();

export const CreateCoupon = z
  .object({
    code: z.string().trim().min(1).max(100),
    type: CouponTypeSchema,
    value: z.coerce.number().positive(),
    minSubtotal: z.coerce.number().min(0).optional().nullable(),
    maxDiscount: z.coerce.number().min(0).optional().nullable(),
    startsAt: OptionalDateTimeString,
    endsAt: OptionalDateTimeString,
    status: CouponStatusSchema.default("active"),
    usageLimit: z.coerce.number().int().positive().optional().nullable(),
    perUserLimit: z.coerce.number().int().positive().optional().nullable(),
  })
  .superRefine((value, ctx) => {
    if (value.type === "percentage" && value.value > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["value"],
        message: "Percentage coupon value cannot exceed 100",
      });
    }
    if (value.type === "fixed" && value.maxDiscount != null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["maxDiscount"],
        message: "maxDiscount is only applicable to percentage coupons",
      });
    }
    if (value.startsAt && value.endsAt) {
      const starts = new Date(value.startsAt);
      const ends = new Date(value.endsAt);
      if (starts > ends) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["endsAt"],
          message: "endsAt must be after startsAt",
        });
      }
    }
  });
export type CreateCouponDto = z.infer<typeof CreateCoupon>;

export const UpdateCoupon = CreateCoupon.partial();
export type UpdateCouponDto = z.infer<typeof UpdateCoupon>;

export const CouponListQuery = PaginationSchema.extend({
  status: CouponStatusSchema.optional(),
  type: CouponTypeSchema.optional(),
  dateFrom: OptionalDateOnlyStringSchema,
  dateTo: OptionalDateOnlyStringSchema,
  filterMode: z.enum(["all", "any"]).optional(),
  search: z.string().trim().max(100).optional(),
  sortBy: z
    .enum(["code", "type", "value", "startsAt", "endsAt", "usedCount", "status", "createdAt"])
    .optional(),
  sortDir: z.enum(["asc", "desc"]).optional(),
});
export type CouponListQueryDto = z.infer<typeof CouponListQuery>;

export interface CouponResponse {
  id: number;
  code: string;
  type: "fixed" | "percentage";
  value: number;
  minSubtotal: number | null;
  maxDiscount: number | null;
  startsAt: string | null;
  endsAt: string | null;
  status: "active" | "inactive";
  usageLimit: number | null;
  perUserLimit: number | null;
  usedCount: number;
  createdAt: string;
  updatedAt: string;
}

export type PaginatedCouponResponse = PaginatedResponse<CouponResponse>;
