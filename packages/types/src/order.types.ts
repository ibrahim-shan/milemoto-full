import { z } from "zod";
import { PaginationSchema, type PaginatedResponse } from "./common.types.js";

export const CustomerOrdersListQuery = PaginationSchema.extend({
  status: z.string().trim().min(1).max(50).optional(),
});
export type CustomerOrdersListQueryDto = z.infer<typeof CustomerOrdersListQuery>;

export const AdminOrdersListQuery = PaginationSchema.extend({
  filterMode: z.enum(["all", "any"]).optional(),
  status: z.string().trim().min(1).max(50).optional(),
  paymentStatus: z.string().trim().min(1).max(50).optional(),
  paymentMethod: z.string().trim().min(1).max(100).optional(),
  search: z.string().trim().min(1).max(100).optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  sortBy: z
    .enum([
      "orderNumber",
      "customerName",
      "status",
      "paymentStatus",
      "paymentMethod",
      "itemCount",
      "placedAt",
      "grandTotal",
      "createdAt",
    ])
    .optional(),
  sortDir: z.enum(["asc", "desc"]).optional(),
});
export type AdminOrdersListQueryDto = z.infer<typeof AdminOrdersListQuery>;

export interface CustomerOrderListItem {
  id: number;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  imageSrc?: string | null;
  itemCount: number;
  grandTotal: number;
  currency: string;
  placedAt: string;
  createdAt: string;
}

export type CustomerOrdersListResponse = PaginatedResponse<CustomerOrderListItem>;

export interface AdminOrderListItem extends CustomerOrderListItem {
  userId: number;
  customerName: string;
  customerPhone: string;
}

export type AdminOrdersListResponse = PaginatedResponse<AdminOrderListItem>;

export interface AdminOrderFilterOptionsResponse {
  paymentMethods: string[];
}

export interface CustomerOrderDetailItem {
  id: number;
  productId: number;
  productVariantId: number;
  sku: string | null;
  productName: string;
  variantName: string | null;
  imageSrc: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface CustomerOrderStatusHistoryItem {
  id: number;
  fromStatus: string | null;
  toStatus: string;
  reason: string | null;
  createdAt: string;
}

export interface CustomerOrderTaxLine {
  id: number;
  taxId: number | null;
  taxName: string;
  taxType: string;
  taxRate: number;
  countryId: number | null;
  amount: number;
}

export interface CustomerOrderDetailResponse {
  id: number;
  orderNumber: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  currency: string;
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  taxTotal: number;
  grandTotal: number;
  notes: string | null;
  shippingAddress: {
    fullName: string;
    phone: string;
    email: string | null;
    country: string;
    state: string;
    city: string;
    addressLine1: string;
    addressLine2: string | null;
    postalCode: string | null;
  };
  billingAddress: {
    fullName: string;
    phone: string;
    email: string | null;
    country: string;
    state: string;
    city: string;
    addressLine1: string;
    addressLine2: string | null;
    postalCode: string | null;
  };
  items: CustomerOrderDetailItem[];
  taxLines: CustomerOrderTaxLine[];
  statusHistory: CustomerOrderStatusHistoryItem[];
  placedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminOrderDetailResponse extends CustomerOrderDetailResponse {
  userId: number;
}

export const OrderRequestTypeSchema = z.enum(["cancel", "return", "refund"]);
export type OrderRequestType = z.infer<typeof OrderRequestTypeSchema>;

export const OrderRequestStatusSchema = z.enum([
  "pending",
  "approved",
  "rejected",
  "completed",
  "cancelled_by_user",
]);
export type OrderRequestStatus = z.infer<typeof OrderRequestStatusSchema>;

const QueryBoolean = z.preprocess(
  (value) => (typeof value === "boolean" ? String(value) : value),
  z
    .enum(["true", "false"])
    .transform((value) => value === "true")
);

export const CreateOrderRequestInput = z.object({
  type: OrderRequestTypeSchema,
  reason: z.string().trim().min(1).max(1000),
  metadataJson: z.string().trim().max(10000).optional(),
});
export type CreateOrderRequestDto = z.infer<typeof CreateOrderRequestInput>;

export const CancelOrderRequestInput = z.object({
  reason: z.string().trim().min(1).max(1000).optional(),
});
export type CancelOrderRequestDto = z.infer<typeof CancelOrderRequestInput>;

export const CancelCustomerOrderRequestInput = z.object({
  reason: z.string().trim().min(1).max(1000).optional(),
});
export type CancelCustomerOrderRequestDto = z.infer<typeof CancelCustomerOrderRequestInput>;

export const CustomerOrderRequestsListQuery = PaginationSchema.extend({
  orderId: z.coerce.number().int().positive().optional(),
  type: OrderRequestTypeSchema.optional(),
  status: OrderRequestStatusSchema.optional(),
});
export type CustomerOrderRequestsListQueryDto = z.infer<typeof CustomerOrderRequestsListQuery>;

export const AdminOrderRequestsListQuery = PaginationSchema.extend({
  filterMode: z.enum(["all", "any"]).optional(),
  orderId: z.coerce.number().int().positive().optional(),
  type: OrderRequestTypeSchema.optional(),
  status: OrderRequestStatusSchema.optional(),
  search: z.string().trim().min(1).max(100).optional(),
  onlyRequiresStockAction: QueryBoolean.optional(),
  onlyRefundPendingCompletion: QueryBoolean.optional(),
  sortBy: z.enum(["id", "orderNumber", "customerName", "status", "requestedAt"]).optional(),
  sortDir: z.enum(["asc", "desc"]).optional(),
});
export type AdminOrderRequestsListQueryDto = z.infer<typeof AdminOrderRequestsListQuery>;

export interface OrderRequestItem {
  id: number;
  orderId: number;
  userId: number;
  type: OrderRequestType;
  status: OrderRequestStatus;
  reason: string | null;
  adminNote: string | null;
  metadataJson: string | null;
  requestedAt: string;
  decidedAt: string | null;
  completedAt: string | null;
  decidedByUserId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminOrderRequestItem extends OrderRequestItem {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
}

export type CustomerOrderRequestsListResponse = PaginatedResponse<OrderRequestItem>;
export type AdminOrderRequestsListResponse = PaginatedResponse<AdminOrderRequestItem>;

export const DecideOrderRequestInput = z
  .object({
    status: z.enum(["approved", "rejected"]),
    adminNote: z.string().trim().min(1).max(1000).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.status === "rejected" && !value.adminNote) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["adminNote"],
        message: "Admin note is required when rejecting a request",
      });
    }
  });
export type DecideOrderRequestDto = z.infer<typeof DecideOrderRequestInput>;

export const CompleteOrderRequestInput = z.object({
  adminNote: z.string().trim().min(1).max(1000).optional(),
  refundPaymentStatus: z.enum(["refunded", "partially_refunded"]).optional(),
  returnStockLocationId: z.coerce.number().int().positive().optional(),
});
export type CompleteOrderRequestDto = z.infer<typeof CompleteOrderRequestInput>;
