import { z } from "zod";
import {
  PaginationSchema,
  type PaginatedResponse,
  type ApiModel,
} from "./common.types.js";
import { type Vendor } from "./db.types.js";
import {
  OptionalEmailSchema,
  OptionalUrlSchema,
  TrimmedStringSchema,
} from "./zod.helpers.js";

export const VendorStatus = z.enum(["active", "inactive"]);

export const CreateVendor = z.object({
  name: TrimmedStringSchema.min(1, "Name is required").max(255),
  description: TrimmedStringSchema.optional(),
  country: TrimmedStringSchema.min(1, "Country is required").max(100),
  address: TrimmedStringSchema.optional(),
  phoneNumber: TrimmedStringSchema.optional(),
  phoneCode: TrimmedStringSchema.optional(),
  email: OptionalEmailSchema,
  website: OptionalUrlSchema,
  status: VendorStatus.default("active"),
});

export const UpdateVendor = CreateVendor.partial();

export type CreateVendorDto = z.infer<typeof CreateVendor>;
export type UpdateVendorDto = z.infer<typeof UpdateVendor>;

export const VendorListQuery = PaginationSchema.extend({
  status: VendorStatus.optional(),
  country: z.union([TrimmedStringSchema, z.array(TrimmedStringSchema)]).optional(),
});

export type VendorListQueryDto = z.infer<typeof VendorListQuery>;

export interface VendorResponse extends ApiModel<Vendor> {}

export type PaginatedVendorResponse = PaginatedResponse<VendorResponse>;
