import { z } from "zod";
import {
  ApiModel,
  PaginationSchema,
  type PaginatedResponse,
} from "./common.types.js";
import { type Currency } from "./db.types.js";
import { TrimmedStringSchema, UpperTrimmedStringSchema } from "./zod.helpers.js";

// ==== Base Schemas ====

const StatusEnum = z.enum(["active", "inactive"]);

export const CreateCurrency = z.object({
  name: TrimmedStringSchema.min(1, "Name is required"),
  code: UpperTrimmedStringSchema.min(2, "Code is required").max(
    5,
    "Code is too long"
  ), // e.g., USD, EUR
  symbol: TrimmedStringSchema.min(1, "Symbol is required"), // e.g., $, ƒ,ª
  exchangeRate: z.number().min(0, "Exchange rate must be positive"),
  status: StatusEnum.default("active"),
});

export type CreateCurrencyDto = z.infer<typeof CreateCurrency>;
export type CreateCurrencyOutputDto = z.output<typeof CreateCurrency>;

export const UpdateCurrency = CreateCurrency.partial();

export type UpdateCurrencyDto = z.infer<typeof UpdateCurrency>;
export type UpdateCurrencyOutputDto = z.output<typeof UpdateCurrency>;

export const CurrencyListQuery = PaginationSchema.extend({
  status: z.enum(["active", "inactive"]).optional(),
});

export type CurrencyListQueryDto = z.infer<typeof CurrencyListQuery>;

// ==== API Response Types ====

export interface CurrencyResponse extends ApiModel<Currency> {
  exchangeRate: number;
}

export type PaginatedCurrencyResponse = PaginatedResponse<CurrencyResponse>;
