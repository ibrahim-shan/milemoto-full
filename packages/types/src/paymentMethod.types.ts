import { z } from "zod";
import {
  PaginationSchema,
  type PaginatedResponse,
  type ApiModel,
} from "./common.types.js";
import { type PaymentMethod } from "./db.types.js";
import { TrimmedStringSchema } from "./zod.helpers.js";

export const PaymentMethodStatus = z.enum(["active", "inactive"]);

export const CreatePaymentMethod = z.object({
  name: TrimmedStringSchema.min(1, "Name is required").max(255),
  status: PaymentMethodStatus.default("active"),
});

export const PaymentMethodListQuery = PaginationSchema.extend({
  status: PaymentMethodStatus.optional(),
});

export type PaymentMethodListQueryDto = z.infer<typeof PaymentMethodListQuery>;

export const UpdatePaymentMethod = CreatePaymentMethod.partial();

export type CreatePaymentMethodDto = z.infer<typeof CreatePaymentMethod>;
export type UpdatePaymentMethodDto = z.infer<typeof UpdatePaymentMethod>;

export interface PaymentMethodResponse extends ApiModel<PaymentMethod> {}

export type PaginatedPaymentMethodResponse =
  PaginatedResponse<PaymentMethodResponse>;
