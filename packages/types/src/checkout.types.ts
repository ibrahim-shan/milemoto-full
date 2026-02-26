import { z } from "zod";

const CheckoutAddressInput = z.object({
  fullName: z.string().trim().min(1).max(255),
  phone: z.string().trim().min(3).max(50),
  email: z.string().trim().email().max(255).optional(),
  country: z.string().trim().min(2).max(100),
  countryId: z.coerce.number().int().positive().optional(),
  state: z.string().trim().min(1).max(100),
  stateId: z.coerce.number().int().positive().optional(),
  city: z.string().trim().min(1).max(100),
  cityId: z.coerce.number().int().positive().optional(),
  addressLine1: z.string().trim().min(1).max(255),
  addressLine2: z.string().trim().max(255).optional(),
  postalCode: z.string().trim().max(50).optional(),
});

export const CheckoutQuoteInput = z.object({
  shippingAddress: CheckoutAddressInput.partial().optional(),
  billingAddress: CheckoutAddressInput.partial().optional(),
  shippingMethodCode: z.string().trim().min(1).max(100).optional(),
  paymentMethodCode: z.string().trim().min(1).max(100).default("cod"),
  couponCode: z.string().trim().min(1).max(100).optional(),
  notes: z.string().trim().max(1000).optional(),
});
export type CheckoutQuoteDto = z.infer<typeof CheckoutQuoteInput>;

export const CheckoutSubmitInput = z.object({
  shippingAddress: CheckoutAddressInput,
  billingAddress: CheckoutAddressInput.optional(),
  shippingMethodCode: z.string().trim().min(1).max(100),
  paymentMethodCode: z.literal("cod").default("cod"),
  saveAddressToAccount: z.coerce.boolean().optional().default(true),
  couponCode: z.string().trim().min(1).max(100).optional(),
  notes: z.string().trim().max(1000).optional(),
});
export type CheckoutSubmitDto = z.infer<typeof CheckoutSubmitInput>;

export interface CheckoutQuoteLineItem {
  cartItemId: number;
  productId: number;
  productVariantId: number;
  productName: string;
  productSlug: string;
  variantName: string;
  sku: string;
  imageSrc: string | null;
  quantity: number;
  available: number;
  unitPrice: number;
  lineTotal: number;
  warning?: string;
}

export interface CheckoutTotals {
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  taxTotal: number;
  grandTotal: number;
}

export interface CheckoutTaxLine {
  taxId: number;
  name: string;
  type: "percentage" | "fixed";
  rate: number;
  countryId: number | null;
  amount: number;
}

export interface CheckoutQuoteResponse {
  cartId: number;
  paymentMethodCode: string;
  shippingMethodCode: string | null;
  items: CheckoutQuoteLineItem[];
  warnings: string[];
  errors: string[];
  taxLines: CheckoutTaxLine[];
  totals: CheckoutTotals;
  canPlaceOrder: boolean;
}

export interface CheckoutSubmitResponse {
  orderId: number;
  orderNumber: string;
  status: string;
  paymentMethodCode: string;
  paymentStatus: string;
}
