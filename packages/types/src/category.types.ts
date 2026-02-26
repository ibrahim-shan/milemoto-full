import { z } from "zod";
import { type Category } from "./db.types.js";
import {
  PaginationSchema,
  type PaginatedResponse,
  type ApiModel,
} from "./common.types.js";
import { LowerTrimmedStringSchema, NullableUrlSchema, TrimmedStringSchema } from "./zod.helpers.js";

export const CategoryStatus = z.enum(["active", "inactive"]);

export const CreateCategory = z.object({
  name: TrimmedStringSchema.min(1, "Name is required").max(255),
  slug: LowerTrimmedStringSchema.min(1, "Slug is required").max(255),
  description: TrimmedStringSchema.optional(),
  imageUrl: NullableUrlSchema.optional(),
  parentId: z.number().int().positive().nullable().optional(),
  status: CategoryStatus.default("active"),
});

export const UpdateCategory = CreateCategory.partial();

export type CreateCategoryDto = z.infer<typeof CreateCategory>;
export type UpdateCategoryDto = z.infer<typeof UpdateCategory>;

export const CategoryListQuery = PaginationSchema.extend({
  status: CategoryStatus.optional(),
  parentId: z.coerce.number().int().positive().optional(),
});

export type CategoryListQueryDto = z.infer<typeof CategoryListQuery>;

export interface CategoryResponse extends ApiModel<Category> {}

export type CategoryTreeNodeResponse = CategoryResponse & {
  children?: CategoryTreeNodeResponse[];
};

export type CategoryDropdownItemResponse = {
  id: number;
  name: string;
  slug: string;
  parentId: number | null;
  status: z.infer<typeof CategoryStatus>;
};

export type PaginatedCategoryResponse = PaginatedResponse<CategoryResponse>;
