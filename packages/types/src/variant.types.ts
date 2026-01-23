import { z } from "zod";
import {
  ApiModel,
  PaginationSchema,
  type PaginatedResponse,
} from "./common.types.js";
import { type Variant, type VariantValue } from "./db.types.js";
import { LowerTrimmedStringSchema, TrimmedStringSchema } from "./zod.helpers.js";

// --- Zod Schemas ---
export const CreateVariantValueSchema = z.object({
  value: TrimmedStringSchema.min(1, "Value is required"),
  slug: LowerTrimmedStringSchema.min(1, "Slug is required"),
  status: z.enum(["active", "inactive"]).optional().default("active"),
});
// For updates, we might need the ID to identify existing values
export const UpdateVariantValueSchema =
  CreateVariantValueSchema.partial().extend({
    id: z.number().optional(),
  });
export const CreateVariantSchema = z.object({
  name: TrimmedStringSchema.min(1, "Name is required"),
  slug: LowerTrimmedStringSchema.min(1, "Slug is required"),
  status: z.enum(["active", "inactive"]).optional().default("active"),
  values: z
    .array(CreateVariantValueSchema)
    .min(1, "At least one value is required"),
});
export const UpdateVariantSchema = CreateVariantSchema.partial().extend({
  values: z.array(UpdateVariantValueSchema).optional(),
});
// --- Types ---
export type CreateVariantValue = z.infer<typeof CreateVariantValueSchema>;
export type UpdateVariantValue = z.infer<typeof UpdateVariantValueSchema>;
export type CreateVariant = z.infer<typeof CreateVariantSchema>;
export type UpdateVariant = z.infer<typeof UpdateVariantSchema>;

export const VariantListQuery = PaginationSchema.extend({
  status: z.enum(["active", "inactive"]).optional(),
});

export type VariantListQueryDto = z.infer<typeof VariantListQuery>;

export interface VariantValueResponse extends VariantValue {}

export interface VariantResponse extends ApiModel<Variant> {
  values?: VariantValueResponse[];
}

export type PaginatedVariantResponse = PaginatedResponse<VariantResponse>;
