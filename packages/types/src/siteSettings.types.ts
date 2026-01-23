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
