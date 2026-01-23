// packages/types/src/location.types.ts
import { z } from "zod";
import { ApiModel, PaginationSchema, type PaginatedResponse } from "./common.types.js";
import { type City, type Country, type State } from "./db.types.js";
import { TrimmedStringSchema, UpperTrimmedStringSchema } from "./zod.helpers.js";

// ==== Base Schemas (used by backend and frontend forms) ====

const StatusEnum = z.enum(["active", "inactive"]);

const requiredForeignKey = (label: string) =>
  z.coerce
    .number()
    .int()
    .positive({ message: `${label} is required` });

export const CreateCountry = z.object({
  name: TrimmedStringSchema.min(2, "Name is required"),
  code: UpperTrimmedStringSchema.min(2, "Code is required").max(10),
  status: StatusEnum,
});
export type CreateCountryDto = z.infer<typeof CreateCountry>;
export type CreateCountryOutputDto = z.output<typeof CreateCountry>;

export const UpdateCountry = CreateCountry.partial();
export type UpdateCountryDto = z.infer<typeof UpdateCountry>;
export type UpdateCountryOutputDto = z.output<typeof UpdateCountry>;

export const CreateState = z.object({
  name: TrimmedStringSchema.min(2),
  countryId: requiredForeignKey("Country"),
  status: StatusEnum,
});

export type CreateStateDto = z.infer<typeof CreateState>;
export type CreateStateOutputDto = z.output<typeof CreateState>;
export type CreateStateInputDto = z.input<typeof CreateState>;

export const UpdateState = CreateState.partial();
export type UpdateStateDto = z.infer<typeof UpdateState>;
export type UpdateStateOutputDto = z.output<typeof UpdateState>;

export const CreateCity = z.object({
  name: TrimmedStringSchema.min(2),
  stateId: requiredForeignKey("State"),
  status: StatusEnum,
});
export type CreateCityDto = z.infer<typeof CreateCity>;
export type CreateCityOutputDto = z.output<typeof CreateCity>;
export type CreateCityInputDto = z.input<typeof CreateCity>;

export const UpdateCity = CreateCity.partial();
export type UpdateCityDto = z.infer<typeof UpdateCity>;
export type UpdateCityOutputDto = z.output<typeof UpdateCity>;

// ==== API Response Types (what the frontend queries receive) ====

export interface CountryResponse
  extends ApiModel<Country> {}

export interface StateResponse extends ApiModel<State> {
  statusEffective: "active" | "inactive";
  countryName: string;
  countryStatus: "active" | "inactive";
  countryStatusEffective: "active" | "inactive";
}

export type CityDropdownItem = {
  id: number;
  name: string;
  stateId: number; // Important for filtering by state
  status?: "active" | "inactive";
};

export interface CityResponse extends ApiModel<City> {
  statusEffective: "active" | "inactive";
  stateName: string;
  stateStatus: "active" | "inactive";
  stateStatusEffective: "active" | "inactive";
  countryId: number;
  countryName: string;
  countryStatus: "active" | "inactive";
  countryStatusEffective: "active" | "inactive";
}

// For the /all dropdown endpoints
export type CountryDropdownItem = {
  id: number;
  name: string;
  status?: "active" | "inactive";
};

export type StateDropdownItem = {
  id: number;
  name: string;
  countryId: number;
  status?: "active" | "inactive";
  statusEffective?: "active" | "inactive";
};

// ==== List Queries ====

export const CountryListQuery = PaginationSchema;
export type CountryListQueryDto = z.infer<typeof CountryListQuery>;

export const StateListQuery = PaginationSchema.extend({
  countryId: z.coerce.number().int().optional(),
});
export type StateListQueryDto = z.infer<typeof StateListQuery>;

export const CityListQuery = PaginationSchema.extend({
  stateId: z.coerce.number().int().optional(),
});
export type CityListQueryDto = z.infer<typeof CityListQuery>;

export type PaginatedCountryResponse = PaginatedResponse<CountryResponse>;
export type PaginatedStateResponse = PaginatedResponse<StateResponse>;
export type PaginatedCityResponse = PaginatedResponse<CityResponse>;
