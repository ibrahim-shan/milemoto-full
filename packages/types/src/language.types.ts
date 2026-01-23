import { z } from "zod";
import {
  PaginationSchema,
  type PaginatedResponse,
  type ApiModel,
} from "./common.types.js";
import { type Language } from "./db.types.js";
import { TrimmedStringSchema, UpperTrimmedStringSchema, LowerTrimmedStringSchema } from "./zod.helpers.js";

// ==== Base Schemas ====

const StatusEnum = z.enum(["active", "inactive"]);
const DisplayModeEnum = z.enum(["LTR", "RTL"]);

export const CreateLanguage = z.object({
  name: TrimmedStringSchema.min(1, "Name is required"),
  code: LowerTrimmedStringSchema.min(2, "Code is required").max(10, "Code is too long"), // e.g., en, ar
  displayMode: DisplayModeEnum.default("LTR"),
  countryCode: UpperTrimmedStringSchema.nullable().optional(), // e.g., US, SA
  status: StatusEnum.default("active"),
});

export type CreateLanguageDto = z.infer<typeof CreateLanguage>;
export type CreateLanguageOutputDto = z.output<typeof CreateLanguage>;

export const UpdateLanguage = CreateLanguage.partial();

export type UpdateLanguageDto = z.infer<typeof UpdateLanguage>;
export type UpdateLanguageOutputDto = z.output<typeof UpdateLanguage>;

export const LanguageListQuery = PaginationSchema.extend({
  status: z.enum(["active", "inactive"]).optional(),
});

export type LanguageListQueryDto = z.infer<typeof LanguageListQuery>;

// ==== API Response Types ====

export interface LanguageResponse extends ApiModel<Language> {}

export type PaginatedLanguageResponse = PaginatedResponse<LanguageResponse>;
