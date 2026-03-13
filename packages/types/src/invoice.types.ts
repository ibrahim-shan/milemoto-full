import { z } from "zod";
import { PaginationSchema, type PaginatedResponse } from "./common.types.js";

export const InvoiceStatusSchema = z.enum([
  "draft",
  "issued",
  "paid",
  "partially_paid",
  "void",
]);
export type InvoiceStatus = z.infer<typeof InvoiceStatusSchema>;

export const AdminInvoicesListQuery = PaginationSchema.extend({
  filterMode: z.enum(["all", "any"]).optional(),
  status: InvoiceStatusSchema.optional(),
  search: z.string().trim().min(1).max(100).optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  sortBy: z
    .enum([
      "invoiceNumber",
      "orderNumber",
      "customerName",
      "status",
      "issuedAt",
      "grandTotal",
      "createdAt",
    ])
    .optional(),
  sortDir: z.enum(["asc", "desc"]).optional(),
});
export type AdminInvoicesListQueryDto = z.infer<typeof AdminInvoicesListQuery>;

export interface AdminInvoiceListItem {
  id: number;
  invoiceNumber: string;
  orderId: number;
  orderNumber: string;
  userId: number;
  customerName: string;
  customerPhone: string;
  status: InvoiceStatus;
  currency: string;
  grandTotal: number;
  issuedAt: string;
  dueAt: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type AdminInvoicesListResponse = PaginatedResponse<AdminInvoiceListItem>;

export interface AdminInvoiceLineItem {
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

export interface AdminInvoiceTaxLine {
  id: number;
  taxId: number | null;
  taxName: string;
  taxType: string;
  taxRate: number;
  countryId: number | null;
  amount: number;
}

export interface AdminInvoiceDetailResponse extends AdminInvoiceListItem {
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  taxTotal: number;
  note: string | null;
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
  items: AdminInvoiceLineItem[];
  taxLines: AdminInvoiceTaxLine[];
}

export const CreateInvoiceFromOrderInput = z.object({
  status: z.enum(["draft", "issued"]).optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  note: z.string().trim().max(1000).optional(),
});
export type CreateInvoiceFromOrderDto = z.infer<typeof CreateInvoiceFromOrderInput>;

