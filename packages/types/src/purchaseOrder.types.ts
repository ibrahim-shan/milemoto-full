import { z } from "zod";
import {
  PaginationSchema,
  type PaginatedResponse,
  type ApiModel,
} from "./common.types.js";
import { type PurchaseOrder, type PurchaseOrderLine } from "./db.types.js";
import { OptionalDateOnlyStringSchema, TrimmedStringSchema } from "./zod.helpers.js";

export const PurchaseOrderStatus = z.enum([
  "draft",
  "pending_approval",
  "approved",
  "partially_received",
  "fully_received",
  "closed",
  "cancelled",
]);

export const PurchaseOrderDiscountType = z.enum(["fixed", "percentage"]);

export const PurchaseOrderLineInput = z.object({
  id: z.number().int().positive().optional(),
  productVariantId: z.number().int().positive(),
  description: TrimmedStringSchema.max(255).optional(),
  orderedQty: z.number().int().min(1, "Ordered quantity must be at least 1"),
  unitCost: z.coerce.number().min(0, "Unit cost must be 0 or greater"),
  taxId: z.number().int().positive().optional(),
  expectedLineDeliveryDate: OptionalDateOnlyStringSchema,
  comments: TrimmedStringSchema.optional(),
});

export const CreatePurchaseOrder = z.object({
  subject: TrimmedStringSchema.min(1).max(255),
  vendorId: z.number().int().positive(),
  stockLocationId: z.number().int().positive(),
  currencyId: z.number().int().positive(),
  paymentTerms: TrimmedStringSchema.min(1).max(255),
  expectedDeliveryDate: OptionalDateOnlyStringSchema,
  paymentMethodId: z.number().int().positive(),
  inboundShippingMethodId: z.number().int().positive().optional(),
  shippingCost: z.coerce.number().min(0).optional(),
  supplierRef: TrimmedStringSchema.max(255).optional(),
  internalNote: TrimmedStringSchema.optional(),
  discountType: PurchaseOrderDiscountType.optional(),
  discountValue: z.coerce.number().min(0).optional(),
  lines: z
    .array(PurchaseOrderLineInput)
    .min(1, "At least one purchase order line is required"),
});

export const UpdatePurchaseOrder = CreatePurchaseOrder.extend({
  status: PurchaseOrderStatus.optional(),
}).partial();

export const PurchaseOrderListQuery = PaginationSchema.extend({
  status: PurchaseOrderStatus.optional(),
  vendorId: z.coerce.number().int().positive().optional(),
  paymentMethodId: z.coerce.number().int().positive().optional(),
  dateFrom: OptionalDateOnlyStringSchema,
  dateTo: OptionalDateOnlyStringSchema,
});

export type CreatePurchaseOrderDto = z.infer<typeof CreatePurchaseOrder>;
export type UpdatePurchaseOrderDto = z.infer<typeof UpdatePurchaseOrder>;
export type PurchaseOrderListQueryDto = z.infer<typeof PurchaseOrderListQuery>;

export interface PurchaseOrderResponse
  extends ApiModel<
    Omit<
      PurchaseOrder,
      | "approvedAt"
      | "cancelledAt"
      | "expectedDeliveryDate"
      | "shippingCost"
      | "discountValue"
    >
  > {
  approvedAt: string | null;
  cancelledAt: string | null;
  expectedDeliveryDate: string | null;
  // Money/decimal fields are standardized as numbers in API responses.
  shippingCost: number | null;
  discountValue: number | null;
  subtotal: number;
  discountAmount: number;
  taxTotal: number;
  total: number;

  // Relations is implied by manual definition previously, added here
  lines?: PurchaseOrderLine[];
}

export type PaginatedPurchaseOrderResponse =
  PaginatedResponse<PurchaseOrderResponse>;
