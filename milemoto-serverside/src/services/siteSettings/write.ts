import type {
  UpdateBrandingSettingsDto,
  UpdateDocumentSettingsDto,
  UpdateFeatureTogglesSettingsDto,
  UpdateLocalizationSettingsDto,
  UpdateStoreCurrencySettingsDto,
  BrandingSettingsDto,
  DocumentSettingsDto,
  FeatureTogglesSettingsDto,
  LocalizationSettingsDto,
  StoreCurrencySettingsDto,
} from '@milemoto/types';
import {
  getBrandingSettings,
  getDocumentSettings,
  getFeatureTogglesSettings,
  getLocalizationSettings,
  getStoreCurrencySettings,
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
