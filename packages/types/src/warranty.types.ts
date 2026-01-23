import { z } from "zod";
import { ApiModel, PaginationSchema, type PaginatedResponse } from "./common.types.js";
import { type Warranty } from "./db.types.js";
import { TrimmedStringSchema } from "./zod.helpers.js";

export const WarrantyStatus = z.enum(["active", "inactive"]);

export const CreateWarranty = z.object({
  name: TrimmedStringSchema.min(1, "Name is required").max(255),
  description: TrimmedStringSchema.optional(),
  status: WarrantyStatus.default("active"),
});

export const UpdateWarranty = CreateWarranty.partial();

export type CreateWarrantyDto = z.infer<typeof CreateWarranty>;
export type UpdateWarrantyDto = z.infer<typeof UpdateWarranty>;

export const WarrantyListQuery = PaginationSchema.extend({
  status: WarrantyStatus.optional(),
});

export type WarrantyListQueryDto = z.infer<typeof WarrantyListQuery>;

export interface WarrantyResponse extends ApiModel<Warranty> {}

export type PaginatedWarrantyResponse = PaginatedResponse<WarrantyResponse>;
