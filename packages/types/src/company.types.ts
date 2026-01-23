import { z } from "zod";
import { ApiModel, PaginationSchema } from "./common.types.js";
import { type CompanyProfile } from "./db.types.js";
import {
  OptionalEmailSchema,
  OptionalUrlSchema,
  TrimmedStringSchema,
} from "./zod.helpers.js";

export const CompanyProfileInput = z.object({
  name: TrimmedStringSchema.min(1, "Company name is required"),
  publicEmail: OptionalEmailSchema.nullish(),
  phone: TrimmedStringSchema.min(1).max(64).nullish(),
  website: OptionalUrlSchema.nullish(),
  address: TrimmedStringSchema.min(1).max(255).nullish(),
  city: TrimmedStringSchema.min(1).max(191).nullish(),
  state: TrimmedStringSchema.min(1).max(191).nullish(),
  zip: TrimmedStringSchema.min(1).max(32).nullish(),
  countryId: z.coerce.number().int().positive().nullish(),
  latitude: z.number().finite().nullish(),
  longitude: z.number().finite().nullish(),
});

export type CompanyProfileInputDto = z.infer<typeof CompanyProfileInput>;

export type CompanyProfileResponse = ApiModel<CompanyProfile> & {
  countryName: string | null;
  countryStatus: "active" | "inactive" | null;
};

export const CompanyListQuery = PaginationSchema;
export type CompanyListQueryDto = z.infer<typeof CompanyListQuery>;
