import type {
  BrandingSettingsDto,
  DocumentSettingsDto,
  FeatureTogglesSettingsDto,
  InvoicePolicySettingsDto,
  LocalizationSettingsDto,
  OrderRequestPolicySettingsDto,
  StockDisplaySettingsDto,
  StoreCurrencySettingsDto,
  TaxPolicySettingsDto,
} from '@milemoto/types';
import { getSetting, parseSettingBool } from './shared.js';

export async function getLocalizationSettings(): Promise<LocalizationSettingsDto> {
  const dateFormat = await getSetting('dateFormat');
  const timeFormat = await getSetting('timeFormat');
  const defaultTimezone = await getSetting('defaultTimezone');
  const defaultLanguageId = await getSetting('defaultLanguageId');

  return {
    dateFormat: (dateFormat as LocalizationSettingsDto['dateFormat']) || 'MM/DD/YYYY',
    timeFormat: (timeFormat as LocalizationSettingsDto['timeFormat']) || '12h',
    defaultTimezone: defaultTimezone || 'Asia/Beirut',
    defaultLanguageId: defaultLanguageId ? parseInt(defaultLanguageId) : 1,
  };
}

export async function getStoreCurrencySettings(): Promise<StoreCurrencySettingsDto> {
  const defaultCurrencyId = await getSetting('defaultCurrencyId');
  const currencyPosition = await getSetting('currencyPosition');
  const decimalDigits = await getSetting('decimalDigits');
  const copyrightText = await getSetting('copyrightText');

  return {
    defaultCurrencyId: defaultCurrencyId ? parseInt(defaultCurrencyId) : 1,
    currencyPosition:
      (currencyPosition as StoreCurrencySettingsDto['currencyPosition']) || 'before',
    decimalDigits: decimalDigits ? parseInt(decimalDigits) : 2,
    copyrightText: copyrightText || '2026 MileMoto. All rights reserved.',
  };
}

export async function getBrandingSettings(): Promise<BrandingSettingsDto> {
  const logoUrl = await getSetting('logoUrl');
  const faviconUrl = await getSetting('faviconUrl');

  return {
    logoUrl: logoUrl || null,
    faviconUrl: faviconUrl || null,
  };
}

export async function getDocumentSettings(): Promise<DocumentSettingsDto> {
  const purchaseOrderTerms = await getSetting('purchaseOrderTerms');

  return {
    purchaseOrderTerms: purchaseOrderTerms || null,
  };
}

export async function getFeatureTogglesSettings(): Promise<FeatureTogglesSettingsDto> {
  const cashOnDeliveryEnabled = await getSetting('cashOnDeliveryEnabled');
  const onlinePaymentEnabled = await getSetting('onlinePaymentEnabled');
  const languageSwitcherEnabled = await getSetting('languageSwitcherEnabled');
  const phoneVerificationEnabled = await getSetting('phoneVerificationEnabled');
  const emailVerificationEnabled = await getSetting('emailVerificationEnabled');

  return {
    cashOnDeliveryEnabled: parseSettingBool(cashOnDeliveryEnabled, true),
    onlinePaymentEnabled: parseSettingBool(onlinePaymentEnabled, true),
    languageSwitcherEnabled: parseSettingBool(languageSwitcherEnabled, false),
    phoneVerificationEnabled: parseSettingBool(phoneVerificationEnabled, true),
    emailVerificationEnabled: parseSettingBool(emailVerificationEnabled, true),
  };
}

export async function getStockDisplaySettings(): Promise<StockDisplaySettingsDto> {
  const productStockDisplayMode = await getSetting('productStockDisplayMode');
  const lowStockThreshold = await getSetting('productLowStockThreshold');

  return {
    productStockDisplayMode:
      (productStockDisplayMode as StockDisplaySettingsDto['productStockDisplayMode']) ||
      'low_stock_only',
    lowStockThreshold: lowStockThreshold
      ? Math.min(100, Math.max(1, parseInt(lowStockThreshold)))
      : 5,
  };
}

export async function getTaxPolicySettings(): Promise<TaxPolicySettingsDto> {
  const jurisdictionSource = await getSetting('taxJurisdictionSource');
  const taxableBaseMode = await getSetting('taxTaxableBaseMode');
  const shippingTaxable = await getSetting('taxShippingTaxable');
  const roundingPrecision = await getSetting('taxRoundingPrecision');
  const combinationMode = await getSetting('taxCombinationMode');
  const fallbackMode = await getSetting('taxFallbackMode');

  return {
    jurisdictionSource:
      (jurisdictionSource as TaxPolicySettingsDto['jurisdictionSource']) || 'shipping_country',
    taxableBaseMode:
      (taxableBaseMode as TaxPolicySettingsDto['taxableBaseMode']) || 'subtotal_minus_discount',
    shippingTaxable: parseSettingBool(shippingTaxable, false),
    roundingPrecision: roundingPrecision
      ? Math.min(4, Math.max(0, parseInt(roundingPrecision)))
      : 2,
    combinationMode: (combinationMode as TaxPolicySettingsDto['combinationMode']) || 'stack',
    fallbackMode: (fallbackMode as TaxPolicySettingsDto['fallbackMode']) || 'no_tax',
  };
}

export async function getOrderRequestPolicySettings(): Promise<OrderRequestPolicySettingsDto> {
  const returnWindowDays = await getSetting('orderReturnWindowDays');
  const refundWindowDays = await getSetting('orderRefundWindowDays');
  const returnRestockLocationId = await getSetting('orderReturnRestockLocationId');

  return {
    returnWindowDays: returnWindowDays
      ? Math.min(365, Math.max(0, parseInt(returnWindowDays)))
      : 30,
    refundWindowDays: refundWindowDays
      ? Math.min(365, Math.max(0, parseInt(refundWindowDays)))
      : 30,
    returnRestockLocationId: returnRestockLocationId
      ? Math.max(0, parseInt(returnRestockLocationId))
      : 0,
  };
}

export async function getInvoicePolicySettings(): Promise<InvoicePolicySettingsDto> {
  const autoGenerateEnabled = await getSetting('invoiceAutoGenerateEnabled');
  const autoGenerateTrigger = await getSetting('invoiceAutoGenerateTrigger');

  return {
    autoGenerateEnabled: parseSettingBool(autoGenerateEnabled, true),
    autoGenerateTrigger:
      (autoGenerateTrigger as InvoicePolicySettingsDto['autoGenerateTrigger']) || 'delivered',
  };
}
