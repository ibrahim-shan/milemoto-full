import { z } from "zod";
import { ApiModel, PaginationSchema, type PaginatedResponse } from "./common.types.js";
import { type Tax } from "./db.types.js";
import { TrimmedStringSchema } from "./zod.helpers.js";

// ==== Base Schemas ====

const StatusEnum = z.enum(["active", "inactive"]);
const TaxTypeEnum = z.enum(["percentage", "fixed"]);

export const CreateTax = z.object({
  name: TrimmedStringSchema.min(1, "Name is required"),
  rate: z.number().min(0, "Rate must be positive"),
  type: TaxTypeEnum.default("percentage"),
  status: StatusEnum.default("active"),
  countryId: z.number().int().positive().optional().nullable(),
});

export type CreateTaxDto = z.infer<typeof CreateTax>;
export type CreateTaxOutputDto = z.output<typeof CreateTax>;

export const UpdateTax = CreateTax.partial();

export type UpdateTaxDto = z.infer<typeof UpdateTax>;
export type UpdateTaxOutputDto = z.output<typeof UpdateTax>;

// ==== API Response Types ====

export interface TaxResponse extends ApiModel<Tax> {
  countryName?: string | null;
}

// For paginated responses
export type PaginatedTaxResponse = PaginatedResponse<TaxResponse>;

export const TaxListQuery = PaginationSchema.extend({
  status: z.enum(["active", "inactive"]).optional(),
});
export type TaxListQueryDto = z.infer<typeof TaxListQuery>;
