import { z } from "zod";
import {
  ApiModel,
  PaginationSchema,
  type PaginatedResponse,
} from "./common.types.js";
import { type ShippingAreaRate, type ShippingMethod } from "./db.types.js";

// ==== Enums ====
export const ShippingMethodTypeEnum = z.enum([
  "productWise",
  "flatRate",
  "areaWise",
]);

export const StatusEnum = z.enum(["active", "inactive"]);

// ==== Shipping Method Schemas (Global Settings) ====

// For updating the main methods (enabling/disabling, setting global flat rate)
export const UpdateShippingMethod = z.object({
  status: StatusEnum.optional(),
  cost: z.coerce.number().min(0, "Cost must be positive").optional(), // Used for Flat Rate
});

export type UpdateShippingMethodDto = z.infer<typeof UpdateShippingMethod>;

// ==== Area Rate Schemas (For Area Wise) ====

export const CreateAreaRate = z.object({
  countryId: z.coerce.number().min(1, "Country is required"),
  stateId: z.coerce.number().optional().nullable(),
  cityId: z.coerce.number().optional().nullable(),
  cost: z.coerce.number().min(0, "Shipping cost is required"),
});

export type CreateAreaRateDto = z.infer<typeof CreateAreaRate>;

export const UpdateAreaRate = CreateAreaRate.partial();
export type UpdateAreaRateDto = z.infer<typeof UpdateAreaRate>;

// ==== API Response Types ====

export interface ShippingAreaRateResponse extends ApiModel<ShippingAreaRate> {
  countryName?: string;
  stateName?: string | null;
  cityName?: string | null;
}

export type PaginatedAreaRateResponse =
  PaginatedResponse<ShippingAreaRateResponse>;

export interface ShippingMethodResponse extends ApiModel<ShippingMethod> {}

export const ShippingListQuery = PaginationSchema;
export type ShippingListQueryDto = z.infer<typeof ShippingListQuery>;
