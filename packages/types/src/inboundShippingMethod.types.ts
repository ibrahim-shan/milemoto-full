import { z } from "zod";
import {
  PaginationSchema,
  type PaginatedResponse,
  type ApiModel,
} from "./common.types.js";
import { type InboundShippingMethod } from "./db.types.js";
import { TrimmedStringSchema } from "./zod.helpers.js";

export const InboundShippingMethodStatus = z.enum(["active", "inactive"]);

export const CreateInboundShippingMethod = z.object({
  code: TrimmedStringSchema.min(1, "Code is required").max(50),
  name: TrimmedStringSchema.min(1, "Name is required").max(255),
  description: TrimmedStringSchema.max(255).optional(),
  status: InboundShippingMethodStatus.default("inactive"),
});

export const UpdateInboundShippingMethod = CreateInboundShippingMethod.partial();

export const InboundShippingMethodListQuery = PaginationSchema.extend({
  status: InboundShippingMethodStatus.optional(),
});

export type CreateInboundShippingMethodDto = z.infer<
  typeof CreateInboundShippingMethod
>;
export type UpdateInboundShippingMethodDto = z.infer<
  typeof UpdateInboundShippingMethod
>;
export type InboundShippingMethodListQueryDto = z.infer<
  typeof InboundShippingMethodListQuery
>;

export interface InboundShippingMethodResponse
  extends ApiModel<InboundShippingMethod> {}

export type PaginatedInboundShippingMethodResponse =
  PaginatedResponse<InboundShippingMethodResponse>;
