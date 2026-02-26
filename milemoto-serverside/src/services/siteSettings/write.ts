import type {
  UpdateBrandingSettingsDto,
  UpdateDocumentSettingsDto,
  UpdateFeatureTogglesSettingsDto,
  UpdateLocalizationSettingsDto,
  UpdateStockDisplaySettingsDto,
  UpdateStoreCurrencySettingsDto,
  UpdateTaxPolicySettingsDto,
  BrandingSettingsDto,
  DocumentSettingsDto,
  FeatureTogglesSettingsDto,
  LocalizationSettingsDto,
  StockDisplaySettingsDto,
  StoreCurrencySettingsDto,
  TaxPolicySettingsDto,
} from '@milemoto/types';
import {
  getBrandingSettings,
  getDocumentSettings,
  getFeatureTogglesSettings,
  getLocalizationSettings,
  getStockDisplaySettings,
  getStoreCurrencySettings,
  getTaxPolicySettings,
} from './read.js';
import { setSetting } from './shared.js';

export async function updateLocalizationSettings(
  data: UpdateLocalizationSettingsDto
): Promise<LocalizationSettingsDto> {
  if (data.dateFormat !== undefined) {
    await setSetting('dateFormat', data.dateFormat);
  }
  if (data.timeFormat !== undefined) {
    await setSetting('timeFormat', data.timeFormat);
  }
  if (data.defaultTimezone !== undefined) {
    await setSetting('defaultTimezone', data.defaultTimezone);
  }
  if (data.defaultLanguageId !== undefined) {
    await setSetting('defaultLanguageId', String(data.defaultLanguageId));
  }

  return await getLocalizationSettings();
}

export async function updateStoreCurrencySettings(
  data: UpdateStoreCurrencySettingsDto
): Promise<StoreCurrencySettingsDto> {
  if (data.defaultCurrencyId !== undefined) {
    await setSetting('defaultCurrencyId', String(data.defaultCurrencyId));
  }
  if (data.currencyPosition !== undefined) {
    await setSetting('currencyPosition', data.currencyPosition);
  }
  if (data.decimalDigits !== undefined) {
    await setSetting('decimalDigits', String(data.decimalDigits));
  }
  if (data.copyrightText !== undefined) {
    await setSetting('copyrightText', data.copyrightText);
  }

  return await getStoreCurrencySettings();
}

export async function updateBrandingSettings(
  data: UpdateBrandingSettingsDto
): Promise<BrandingSettingsDto> {
  if (data.logoUrl !== undefined) {
    await setSetting('logoUrl', data.logoUrl || '');
  }
  if (data.faviconUrl !== undefined) {
    await setSetting('faviconUrl', data.faviconUrl || '');
  }

  return await getBrandingSettings();
}

export async function updateDocumentSettings(
  data: UpdateDocumentSettingsDto
): Promise<DocumentSettingsDto> {
  if (data.purchaseOrderTerms !== undefined) {
    await setSetting('purchaseOrderTerms', data.purchaseOrderTerms || '');
  }

  return await getDocumentSettings();
}

export async function updateFeatureTogglesSettings(
  data: UpdateFeatureTogglesSettingsDto
): Promise<FeatureTogglesSettingsDto> {
  if (data.cashOnDeliveryEnabled !== undefined) {
    await setSetting('cashOnDeliveryEnabled', String(data.cashOnDeliveryEnabled));
  }
  if (data.onlinePaymentEnabled !== undefined) {
    await setSetting('onlinePaymentEnabled', String(data.onlinePaymentEnabled));
  }
  if (data.languageSwitcherEnabled !== undefined) {
    await setSetting('languageSwitcherEnabled', String(data.languageSwitcherEnabled));
  }
  if (data.phoneVerificationEnabled !== undefined) {
    await setSetting('phoneVerificationEnabled', String(data.phoneVerificationEnabled));
  }
  if (data.emailVerificationEnabled !== undefined) {
    await setSetting('emailVerificationEnabled', String(data.emailVerificationEnabled));
  }

  return await getFeatureTogglesSettings();
}

export async function updateStockDisplaySettings(
  data: UpdateStockDisplaySettingsDto
): Promise<StockDisplaySettingsDto> {
  if (data.productStockDisplayMode !== undefined) {
    await setSetting('productStockDisplayMode', data.productStockDisplayMode);
  }
  if (data.lowStockThreshold !== undefined) {
    await setSetting('productLowStockThreshold', String(data.lowStockThreshold));
  }

  return await getStockDisplaySettings();
}

export async function updateTaxPolicySettings(
  data: UpdateTaxPolicySettingsDto
): Promise<TaxPolicySettingsDto> {
  if (data.jurisdictionSource !== undefined) {
    await setSetting('taxJurisdictionSource', data.jurisdictionSource);
  }
  if (data.taxableBaseMode !== undefined) {
    await setSetting('taxTaxableBaseMode', data.taxableBaseMode);
  }
  if (data.shippingTaxable !== undefined) {
    await setSetting('taxShippingTaxable', String(data.shippingTaxable));
  }
  if (data.roundingPrecision !== undefined) {
    await setSetting('taxRoundingPrecision', String(data.roundingPrecision));
  }
  if (data.combinationMode !== undefined) {
    await setSetting('taxCombinationMode', data.combinationMode);
  }
  if (data.fallbackMode !== undefined) {
    await setSetting('taxFallbackMode', data.fallbackMode);
  }

  return await getTaxPolicySettings();
}
