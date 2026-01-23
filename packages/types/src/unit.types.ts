import { z } from "zod";
import { ApiModel, PaginationSchema, type PaginatedResponse } from "./common.types.js";
import { type UnitGroup, type UnitField, type UnitValue } from "./db.types.js";
import { TrimmedStringSchema, UpperTrimmedStringSchema } from "./zod.helpers.js";

// --- Zod Schemas ---

export const UnitValueSchema = z.object({
  id: z.number().optional(), // Optional for new values
  name: TrimmedStringSchema.min(1, "Value name is required"),
  code: UpperTrimmedStringSchema.min(1, "Value code is required"),
});

export const UnitFieldSchema = z.object({
  id: z.number().optional(), // Optional for new fields
  name: TrimmedStringSchema.min(1, "Field name is required"),
  required: z.boolean().default(false),
});

export const CreateUnitGroup = z.object({
  name: TrimmedStringSchema.min(1, "Group name is required"),
  status: z.enum(["active", "inactive"]).default("active"),
  values: z
    .array(UnitValueSchema)
    .min(1, "At least one unit value is required")
    .refine(
      (items) => {
        const names = items
          .map((i) => i.name.trim().toLowerCase())
          .filter((n) => n.length > 0);
        const codes = items
          .map((i) => i.code.trim().toLowerCase())
          .filter((c) => c.length > 0);
        return (
          new Set(names).size === names.length &&
          new Set(codes).size === codes.length
        );
      },
      { message: "Duplicate unit value names or codes are not allowed" }
    ),
  fields: z
    .array(UnitFieldSchema)
    .min(1, "At least one additional field is required")
    .refine(
      (items) => {
        const names = items
          .map((i) => i.name.trim().toLowerCase())
          .filter((n) => n.length > 0);
        return new Set(names).size === names.length;
      },
      { message: "Duplicate field names are not allowed" }
    ),
});

export const UpdateUnitGroup = CreateUnitGroup.partial();

export type CreateUnitGroupDto = z.infer<typeof CreateUnitGroup>;
export type UpdateUnitGroupDto = z.infer<typeof UpdateUnitGroup>;

// --- Interfaces ---

export interface UnitValueResponse extends UnitValue {}

export interface UnitFieldResponse extends UnitField {}

export interface UnitGroupResponse
  extends ApiModel<UnitGroup> {
  values?: UnitValueResponse[];
  fields?: UnitFieldResponse[];
}

export type PaginatedUnitGroupResponse = PaginatedResponse<UnitGroupResponse>;

export const UnitGroupListQuery = PaginationSchema.extend({
  status: z.enum(["active", "inactive"]).optional(),
});

export type UnitGroupListQueryDto = z.infer<typeof UnitGroupListQuery>;
