import { z } from "zod";
import { PaginationSchema, type PaginatedResponse } from "./common.types.js";

export const CustomerOrdersListQuery = PaginationSchema.extend({
  status: z.string().trim().min(1).max(50).optional(),
});
export type CustomerOrdersListQueryDto = z.infer<typeof CustomerOrdersListQuery>;

export const AdminOrdersListQuery = PaginationSchema.extend({
  status: z.string().trim().min(1).max(50).optional(),
  search: z.string().trim().min(1).max(100).optional(),
});
export type AdminOrdersListQueryDto = z.infer<typeof AdminOrdersListQuery>;

export interface CustomerOrderListItem {
  id: number;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
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
