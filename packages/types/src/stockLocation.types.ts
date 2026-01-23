import { z } from "zod";
import { ApiModel, PaginationSchema, type PaginatedResponse } from "./common.types.js";
import { type StockLocation } from "./db.types.js";
import { TrimmedStringSchema } from "./zod.helpers.js";

export const StockLocationType = z.enum([
  "Warehouse",
  "Store",
  "Office",
  "Factory",
  "Others",
]);

export const StockLocationStatus = z.enum(["active", "inactive"]);

export const CreateStockLocation = z.object({
  name: TrimmedStringSchema.min(1, "Name is required").max(255),
  type: StockLocationType,
  description: TrimmedStringSchema.optional(),
  address: TrimmedStringSchema.optional(),
  city: TrimmedStringSchema.optional(),
  state: TrimmedStringSchema.optional(),
  postalCode: TrimmedStringSchema.optional(),
  country: TrimmedStringSchema.optional(),
  status: StockLocationStatus.default("active"),
});

export const UpdateStockLocation = CreateStockLocation.partial();

export const StockLocationListQuery = PaginationSchema.extend({
  status: StockLocationStatus.optional(),
  type: StockLocationType.optional(),
});

export type CreateStockLocationDto = z.infer<typeof CreateStockLocation>;
export type UpdateStockLocationDto = z.infer<typeof UpdateStockLocation>;
export type StockLocationListQueryDto = z.infer<typeof StockLocationListQuery>;

export interface StockLocationResponse extends ApiModel<StockLocation> {}

export type PaginatedStockLocationResponse =
  PaginatedResponse<StockLocationResponse>;
