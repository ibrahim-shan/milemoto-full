import { z } from "zod";
import { type Brand } from "./db.types.js";
import {
  PaginationSchema,
  type PaginatedResponse,
  type ApiModel,
} from "./common.types.js";
import { LowerTrimmedStringSchema, TrimmedStringSchema } from "./zod.helpers.js";

export const BrandStatus = z.enum(["active", "inactive"]);

export const CreateBrand = z.object({
  name: TrimmedStringSchema.min(1, "Name is required").max(255),
  slug: LowerTrimmedStringSchema.min(1, "Slug is required").max(255),
  description: TrimmedStringSchema.optional(),
  status: BrandStatus.default("active"),
});

export const BrandListQuery = PaginationSchema.extend({
  filterMode: z.enum(["all", "any"]).optional(),
  status: BrandStatus.optional(),
  sortBy: z
    .enum(["name", "slug", "description", "status", "createdAt", "updatedAt"])
    .optional(),
  sortDir: z.enum(["asc", "desc"]).optional(),
});

export type BrandListQueryDto = z.infer<typeof BrandListQuery>;

export const UpdateBrand = CreateBrand.partial();

export type CreateBrandDto = z.infer<typeof CreateBrand>;
export type UpdateBrandDto = z.infer<typeof UpdateBrand>;

export interface BrandResponse extends ApiModel<Brand> {}

export type PaginatedBrandResponse = PaginatedResponse<BrandResponse>;
