import { z } from "zod";
import { PaginationSchema, type PaginatedResponse } from "./common.types.js";
import { OptionalDateOnlyStringSchema } from "./zod.helpers.js";

export const CustomerStatus = z.enum(["active", "inactive", "blocked"]);

export interface CustomerResponse {
  id: number;
  fullName: string;
  email: string;
  phone: string | null;
  role: "user" | "admin";
  status: z.infer<typeof CustomerStatus>;
  createdAt: string;
  emailVerifiedAt: string | null;
  totalOrders?: number;
  totalSpent?: number;
  lastPurchaseDate?: string | null;
}

export const CustomerListQuery = PaginationSchema.extend({
  filterMode: z.enum(["all", "any"]).optional(),
  status: CustomerStatus.optional(),
  ordersMin: z.coerce.number().int().optional(),
  ordersMax: z.coerce.number().int().optional(),
  spentMin: z.coerce.number().optional(),
  spentMax: z.coerce.number().optional(),
  dateStart: OptionalDateOnlyStringSchema,
  dateEnd: OptionalDateOnlyStringSchema,
  sortBy: z.enum(["fullName", "email", "createdAt", "totalOrders", "totalSpent", "status"]).optional(),
  sortDir: z.enum(["asc", "desc"]).optional(),
});

export type CustomerListQueryDto = z.infer<typeof CustomerListQuery>;

export const UpdateCustomer = z.object({
  status: CustomerStatus,
});

export type UpdateCustomerDto = z.infer<typeof UpdateCustomer>;

export type PaginatedCustomerResponse = PaginatedResponse<CustomerResponse>;
