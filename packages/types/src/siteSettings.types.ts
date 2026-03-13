import { z } from "zod";
import { NullableUrlSchema, TrimmedStringSchema } from "./zod.helpers.js";

// ==== Localization Settings Types ====

export const LocalizationSettings = z.object({
  dateFormat: z.enum(["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"]),
  timeFormat: z.enum(["12h", "24h"]),
  defaultTimezone: TrimmedStringSchema,
  defaultLanguageId: z.number().int().positive(),
});

export type LocalizationSettingsDto = z.infer<typeof LocalizationSettings>;

export const UpdateLocalizationSettings = LocalizationSettings.partial();

export type UpdateLocalizationSettingsDto = z.infer<
  typeof UpdateLocalizationSettings
>;

// ==== API Response Types ====

export type LocalizationSettingsResponse = LocalizationSettingsDto;

// ==== Store & Currency Settings Types ====

export const StoreCurrencySettings = z.object({
  defaultCurrencyId: z.number().int().positive(),
  currencyPosition: z.enum(["before", "after"]),
  decimalDigits: z.number().int().min(0).max(10),
  copyrightText: TrimmedStringSchema.max(500),
});

export type StoreCurrencySettingsDto = z.infer<typeof StoreCurrencySettings>;

export const UpdateStoreCurrencySettings = StoreCurrencySettings.partial();

export type UpdateStoreCurrencySettingsDto = z.infer<
  typeof UpdateStoreCurrencySettings
>;

export type StoreCurrencySettingsResponse = StoreCurrencySettingsDto;

// ==== Branding Settings Types ====

export const BrandingSettings = z.object({
  logoUrl: NullableUrlSchema.optional(),
  faviconUrl: NullableUrlSchema.optional(),
});

export type BrandingSettingsDto = z.infer<typeof BrandingSettings>;

export const UpdateBrandingSettings = BrandingSettings.partial();

export type UpdateBrandingSettingsDto = z.infer<typeof UpdateBrandingSettings>;

export type BrandingSettingsResponse = BrandingSettingsDto;

// ==== Document Settings Types ====

export const DocumentSettings = z.object({
  purchaseOrderTerms: TrimmedStringSchema.max(5000).optional().nullable(),
});

export type DocumentSettingsDto = z.infer<typeof DocumentSettings>;

export const UpdateDocumentSettings = DocumentSettings.partial();

export type UpdateDocumentSettingsDto = z.infer<typeof UpdateDocumentSettings>;

export type DocumentSettingsResponse = DocumentSettingsDto;

// ==== Feature Toggles Settings Types ====

export const FeatureTogglesSettings = z.object({
  cashOnDeliveryEnabled: z.boolean(),
  onlinePaymentEnabled: z.boolean(),
  languageSwitcherEnabled: z.boolean(),
  phoneVerificationEnabled: z.boolean(),
  emailVerificationEnabled: z.boolean(),
});

export type FeatureTogglesSettingsDto = z.infer<typeof FeatureTogglesSettings>;

export const UpdateFeatureTogglesSettings = FeatureTogglesSettings.partial();

export type UpdateFeatureTogglesSettingsDto = z.infer<
  typeof UpdateFeatureTogglesSettings
>;

export type FeatureTogglesSettingsResponse = FeatureTogglesSettingsDto;

// ==== Stock Display Settings Types ====

export const StockDisplaySettings = z.object({
  productStockDisplayMode: z.enum(['exact', 'low_stock_only', 'binary', 'hide']),
  lowStockThreshold: z.number().int().min(1).max(100),
});

export type StockDisplaySettingsDto = z.infer<typeof StockDisplaySettings>;

export const UpdateStockDisplaySettings = StockDisplaySettings.partial();

export type UpdateStockDisplaySettingsDto = z.infer<typeof UpdateStockDisplaySettings>;

export type StockDisplaySettingsResponse = StockDisplaySettingsDto;

// ==== Tax Policy Settings Types ====

export const TaxPolicySettings = z.object({
  jurisdictionSource: z.enum(['shipping_country', 'billing_country']),
  taxableBaseMode: z.enum(['subtotal', 'subtotal_minus_discount']),
  shippingTaxable: z.boolean(),
  roundingPrecision: z.number().int().min(0).max(4),
  combinationMode: z.enum(['stack', 'exclusive']),
  fallbackMode: z.enum(['no_tax', 'block_checkout']),
});

export type TaxPolicySettingsDto = z.infer<typeof TaxPolicySettings>;

export const UpdateTaxPolicySettings = TaxPolicySettings.partial();

export type UpdateTaxPolicySettingsDto = z.infer<typeof UpdateTaxPolicySettings>;

export type TaxPolicySettingsResponse = TaxPolicySettingsDto;

// ==== Order Request Policy Settings Types ====

export const OrderRequestPolicySettings = z.object({
  returnWindowDays: z.number().int().min(0).max(365),
  refundWindowDays: z.number().int().min(0).max(365),
  returnRestockLocationId: z.number().int().min(0),
});

export type OrderRequestPolicySettingsDto = z.infer<typeof OrderRequestPolicySettings>;

export const UpdateOrderRequestPolicySettings = OrderRequestPolicySettings.partial();

export type UpdateOrderRequestPolicySettingsDto = z.infer<typeof UpdateOrderRequestPolicySettings>;

export type OrderRequestPolicySettingsResponse = OrderRequestPolicySettingsDto;

// ==== Invoice Policy Settings Types ====

export const InvoicePolicySettings = z.object({
  autoGenerateEnabled: z.boolean(),
  autoGenerateTrigger: z.enum(['delivered', 'payment_confirmed']),
});

export type InvoicePolicySettingsDto = z.infer<typeof InvoicePolicySettings>;

export const UpdateInvoicePolicySettings = InvoicePolicySettings.partial();

export type UpdateInvoicePolicySettingsDto = z.infer<typeof UpdateInvoicePolicySettings>;

export type InvoicePolicySettingsResponse = InvoicePolicySettingsDto;
