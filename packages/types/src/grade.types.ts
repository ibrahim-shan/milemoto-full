import { z } from "zod";
import {
  PaginationSchema,
  type PaginatedResponse,
  type ApiModel,
} from "./common.types.js";
import { type Grade } from "./db.types.js";
import {
  IsoDateTimeStringSchema,
  LowerTrimmedStringSchema,
  TrimmedStringSchema,
} from "./zod.helpers.js";

export const CreateGradeSchema = z.object({
  name: TrimmedStringSchema.min(1, "Name is required").max(100, "Name too long"),
  slug: LowerTrimmedStringSchema.min(1, "Slug is required").max(100, "Slug too long"),
  description: TrimmedStringSchema.optional(),
  status: z.enum(["active", "inactive"]).default("active"),
});

export const UpdateGradeSchema = z.object({
  name: TrimmedStringSchema.min(1).max(100).optional(),
  slug: LowerTrimmedStringSchema.min(1).max(100).optional(),
  description: TrimmedStringSchema.optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

export const GradeSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable().optional(),
  status: z.enum(["active", "inactive"]),
  createdAt: IsoDateTimeStringSchema.optional(),
  updatedAt: IsoDateTimeStringSchema.optional(),
});

export type CreateGrade = z.infer<typeof CreateGradeSchema>;
export type UpdateGrade = z.infer<typeof UpdateGradeSchema>;

export const GradeListQuery = PaginationSchema.extend({
  status: z.enum(["active", "inactive"]).optional(),
});

export type GradeListQueryDto = z.infer<typeof GradeListQuery>;

export interface GradeResponse extends ApiModel<Grade> {}

export type PaginatedGradeResponse = PaginatedResponse<GradeResponse>;
