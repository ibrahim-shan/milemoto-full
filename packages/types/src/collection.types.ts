import { z } from "zod";
import {
  PaginationSchema,
  type PaginatedResponse,
  type ApiModel,
} from "./common.types.js";
import { type Collection, type CollectionProduct } from "./db.types.js";
import { LowerTrimmedStringSchema, TrimmedStringSchema } from "./zod.helpers.js";

export const CollectionRuleSchema = z.object({
  field: TrimmedStringSchema.min(1, "Field is required"),
  operator: z.enum(["equals", "not_equals", "contains", "lt", "gt"]),
  value: z.union([z.string(), z.number(), z.boolean()]),
});

export const CollectionMatchTypeSchema = z.enum(["all", "any"]);

export const CollectionTypeSchema = z.enum(["manual", "automatic"]);

export const CreateCollectionSchema = z.object({
  name: TrimmedStringSchema.min(1, "Name is required"),
  slug: LowerTrimmedStringSchema.min(1, "Slug is required"),
  status: z.enum(["active", "inactive"]).default("active"),
  type: CollectionTypeSchema,
  matchType: CollectionMatchTypeSchema.default("all"),
  rules: z.array(CollectionRuleSchema).optional().default([]),
});

export const UpdateCollectionSchema = CreateCollectionSchema.partial().extend({
  rules: z.array(CollectionRuleSchema).optional(),
});

export const CollectionListQuery = PaginationSchema.extend({
  status: z.enum(["active", "inactive"]).optional(),
  type: CollectionTypeSchema.optional(),
  search: TrimmedStringSchema.optional(),
});

export type CollectionRule = z.infer<typeof CollectionRuleSchema>;
export type CreateCollection = z.infer<typeof CreateCollectionSchema>;
export type UpdateCollection = z.infer<typeof UpdateCollectionSchema>;
export type CollectionListQueryDto = z.infer<typeof CollectionListQuery>;
export type CollectionMatchType = z.infer<typeof CollectionMatchTypeSchema>;

export interface CollectionProductResponse extends CollectionProduct {}

export interface CollectionResponse extends ApiModel<Collection> {
  rules?: CollectionRule[];
}

export type PaginatedCollectionResponse = PaginatedResponse<CollectionResponse>;
