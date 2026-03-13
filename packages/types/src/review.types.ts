import { z } from "zod";
import { PaginationSchema, type PaginatedResponse } from "./common.types.js";

export const ReviewStatusSchema = z.enum([
  "pending",
  "approved",
  "rejected",
  "deleted_by_user",
]);
export type ReviewStatus = z.infer<typeof ReviewStatusSchema>;

export const SubmitProductReviewInput = z.object({
  productId: z.coerce.number().int().positive(),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().min(5).max(2000),
});
export type SubmitProductReviewDto = z.infer<typeof SubmitProductReviewInput>;

export const UpdateProductReviewInput = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().min(5).max(2000),
});
export type UpdateProductReviewDto = z.infer<typeof UpdateProductReviewInput>;

export interface ProductReviewItemResponse {
  id: number;
  productId: number;
  userId: number;
  userName: string;
  verifiedPurchase: boolean;
  rating: number;
  comment: string;
  status: ReviewStatus;
  editedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductReviewSummaryResponse {
  averageRating: number;
  totalReviews: number;
  count1: number;
  count2: number;
  count3: number;
  count4: number;
  count5: number;
}

export interface ProductReviewsResponse {
  summary: ProductReviewSummaryResponse;
  items: ProductReviewItemResponse[];
}

export interface ProductReviewEligibilityResponse {
  canSubmit: boolean;
  reason: "already_reviewed" | "not_delivered_purchase" | "ok";
  myReview: ProductReviewItemResponse | null;
}

export const AdminReviewsListQuery = PaginationSchema.extend({
  filterMode: z.enum(["all", "any"]).optional(),
  status: ReviewStatusSchema.optional(),
  ratingMin: z.coerce.number().int().min(1).max(5).optional(),
  productId: z.coerce.number().int().positive().optional(),
  search: z.string().trim().min(1).max(100).optional(),
  suspiciousOnly: z.coerce.boolean().optional(),
  changes: z.enum(["all", "edited", "never_edited"]).optional(),
  sortBy: z
    .enum(["createdAt", "productName", "userName", "rating", "status", "updatedAt"])
    .optional(),
  sortDir: z.enum(["asc", "desc"]).optional(),
});
export type AdminReviewsListQueryDto = z.infer<typeof AdminReviewsListQuery>;

export interface AdminReviewListItem extends ProductReviewItemResponse {
  productName: string;
  productSlug: string;
  moderationNote: string | null;
  previousRating: number | null;
  previousComment: string | null;
  isSuspicious: boolean;
  suspiciousScore: number;
  suspiciousReasons: string[];
  suspiciousFlaggedAt: string | null;
}

export type AdminReviewsListResponse = PaginatedResponse<AdminReviewListItem>;

export const AdminModerateReviewInput = z
  .object({
    status: z.enum(["approved", "rejected"]),
    note: z.string().trim().min(1).max(500).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.status === "rejected" && !value.note) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["note"],
        message: "Moderation note is required when rejecting a review",
      });
    }
  });
export type AdminModerateReviewDto = z.infer<typeof AdminModerateReviewInput>;

export const AdminBulkModerateReviewsInput = z
  .object({
    reviewIds: z.array(z.coerce.number().int().positive()).min(1).max(100),
    status: z.enum(["approved", "rejected"]),
    note: z.string().trim().min(1).max(500).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.status === "rejected" && !value.note) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["note"],
        message: "Moderation note is required when rejecting reviews",
      });
    }
  });
export type AdminBulkModerateReviewsDto = z.infer<typeof AdminBulkModerateReviewsInput>;

export interface AdminBulkModerateReviewsResponse {
  updated: number;
  skipped: number;
  reasons: Array<{
    reviewId: number;
    reason: "not_found" | "deleted_by_user";
  }>;
}
